"""
Unit and integration tests for Azure Document Intelligence Provider.

CRITICAL CONSTRAINTS:
1. NEVER call the live/real Azure service during tests.
2. All tests use mocked Azure SDK clients at the DocumentIntelligenceClient boundary.
3. Verify strict anti-pricing invariants: Azure output must never generate quotation prices.
4. Verify safe error handling: No secrets in logs, exceptions, or assertions.
"""
import io
import os
import pytest
from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock, patch
from pydantic import ValidationError
from fastapi.testclient import TestClient

from azure.core.exceptions import (
    ClientAuthenticationError,
    HttpResponseError,
    ServiceRequestError,
)

from app.main import app
from app.core.config import settings
from app.schemas.extraction import ExtractedPurchaseOrder
from app.services.ai.extractor import (
    AzureDocIntelligenceExtractor,
    POExtractionService,
    po_extraction_service,
)
from app.services.storage.storage_service import UPLOAD_DIR

client = TestClient(app)


# ---------------------------------------------------------------------------
# Helpers to build mock Azure AnalyzeResult objects
# ---------------------------------------------------------------------------
class MockWord:
    def __init__(self, content: str, confidence: float = 0.98):
        self.content = content
        self.confidence = confidence


class MockLine:
    def __init__(self, content: str):
        self.content = content


class MockPage:
    def __init__(self, page_number: int = 1, words=None, lines=None):
        self.page_number = page_number
        self.words = words or [MockWord("PURCHASE"), MockWord("ORDER")]
        self.lines = lines or [MockLine("PURCHASE ORDER")]


class MockTableCell:
    def __init__(self, content: str, row_index: int, column_index: int, confidence: float = 0.97):
        self.content = content
        self.row_index = row_index
        self.column_index = column_index
        self.confidence = confidence


class MockTable:
    def __init__(self, cells):
        self.cells = cells
        self.row_count = max(c.row_index for c in cells) + 1 if cells else 0
        self.column_count = max(c.column_index for c in cells) + 1 if cells else 0


class MockKeyValuePair:
    def __init__(self, key: str, value: str):
        self.key = MagicMock(content=key)
        self.value = MagicMock(content=value)


class MockParagraph:
    def __init__(self, content: str):
        self.content = content


class MockAnalyzeResult:
    def __init__(self, content: str = "", pages=None, tables=None, key_value_pairs=None, paragraphs=None):
        self.content = content
        self.pages = pages or [MockPage()]
        self.tables = tables or []
        self.key_value_pairs = key_value_pairs or []
        self.paragraphs = paragraphs or [MockParagraph("PURCHASE ORDER")]


def build_sample_azure_result() -> MockAnalyzeResult:
    """Builds a realistic Azure Document Intelligence layout result with tables and headers."""
    full_text = (
        "PURCHASE ORDER\n"
        "PO Number: PO-AZURE-2026-999\n"
        "Date of PO: 2026-04-10\n"
        "Buyer: Mahindra Aerospace Pvt Ltd\n"
        "GSTIN: 27AABCM1234F1Z5\n"
        "Payment Terms: 45 Days Net\n"
        "Delivery Terms: Ex-Works Nashik\n"
    )

    kv_pairs = [
        MockKeyValuePair("PO Number", "PO-AZURE-2026-999"),
        MockKeyValuePair("Date of PO", "2026-04-10"),
        MockKeyValuePair("Buyer", "Mahindra Aerospace Pvt Ltd"),
        MockKeyValuePair("GSTIN", "27AABCM1234F1Z5"),
        MockKeyValuePair("Payment Terms", "45 Days Net"),
        MockKeyValuePair("Delivery Terms", "Ex-Works Nashik"),
    ]

    # Table with header and two line items.
    # Note: Includes "Rate" and "Total Amount" columns to test that Azure provider DISCARDS pricing columns!
    headers = [
        "Item No", "Part Name", "Drawing No", "Material",
        "Qty", "Unit", "Gross Weight (kg)", "Machining Hrs", "Rate", "Total Amount"
    ]
    cells = []
    for c_idx, h in enumerate(headers):
        cells.append(MockTableCell(content=h, row_index=0, column_index=c_idx))

    row_1 = [
        "1", "Wing Spar Fitting", "DWG-WS-101", "Aluminium 7075-T6",
        "25", "PCS", "4.800", "3.50", "12500.00", "312500.00"
    ]
    for c_idx, val in enumerate(row_1):
        cells.append(MockTableCell(content=val, row_index=1, column_index=c_idx))

    row_2 = [
        "2", "Rib Cleat Assembly", "DWG-RC-202", "Titanium Ti-6Al-4V",
        "50", "PCS", "1.200", "1.75", "8500.00", "425000.00"
    ]
    for c_idx, val in enumerate(row_2):
        cells.append(MockTableCell(content=val, row_index=2, column_index=c_idx))

    table = MockTable(cells=cells)

    return MockAnalyzeResult(
        content=full_text,
        pages=[MockPage(1, [MockWord(w) for w in full_text.split()], lines=[MockLine(l) for l in full_text.splitlines() if l])],
        tables=[table],
        key_value_pairs=kv_pairs,
        paragraphs=[MockParagraph(l) for l in full_text.splitlines() if l],
    )


# ---------------------------------------------------------------------------
# 1. Successful Document Extraction
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_azure_extractor_successful_table_and_header_extraction():
    """Verify that AzureDocIntelligenceExtractor correctly extracts headers, metadata, and items."""
    mock_sdk_client = MagicMock()
    mock_poller = MagicMock()
    mock_poller.result.return_value = build_sample_azure_result()
    mock_sdk_client.begin_analyze_document.return_value = mock_poller

    extractor = AzureDocIntelligenceExtractor(
        endpoint="https://fake-resource.cognitiveservices.azure.com/",
        key="fake-secret-key-123",
        client=mock_sdk_client,
    )

    result = await extractor.extract(
        document_content=b"%PDF-1.4 Mock Azure Document Bytes",
        file_name="Aero_PO_2026.pdf",
        content_type="application/pdf",
    )

    # 1. Verify SDK was invoked with prebuilt-layout
    mock_sdk_client.begin_analyze_document.assert_called_once()
    call_kwargs = mock_sdk_client.begin_analyze_document.call_args.kwargs
    assert call_kwargs.get("model_id") == "prebuilt-layout" or mock_sdk_client.begin_analyze_document.call_args[1].get("model_id") == "prebuilt-layout"

    # 2. Verify extracted header values
    assert isinstance(result, ExtractedPurchaseOrder)
    assert result.po_number == "PO-AZURE-2026-999"
    assert result.po_date == date(2026, 4, 10)
    assert result.customer_name == "Mahindra Aerospace Pvt Ltd"
    assert result.customer_gstin == "27AABCM1234F1Z5"
    assert result.payment_terms == "45 Days Net"
    assert result.delivery_terms == "Ex-Works Nashik"
    assert result.metadata.provider == "azure"
    assert result.metadata.source_document == "Aero_PO_2026.pdf"

    # 3. Verify extracted items
    assert len(result.items) == 2
    item1 = result.items[0]
    assert item1.item_number == 1
    assert item1.part_name == "Wing Spar Fitting"
    assert item1.drawing_number == "DWG-WS-101"
    assert item1.material == "Aluminium 7075-T6"
    assert item1.quantity == Decimal("25")
    assert item1.unit == "PCS"
    assert item1.gross_weight_kg == Decimal("4.800")
    assert item1.machining_hours == Decimal("3.50")

    item2 = result.items[1]
    assert item2.item_number == 2
    assert item2.part_name == "Rib Cleat Assembly"
    assert item2.material == "Titanium Ti-6Al-4V"
    assert item2.quantity == Decimal("50")

    # 4. CRITICAL ANTI-PRICING INVARIANT:
    # "Rate" and "Total Amount" were in the table, but must NOT exist in the output!
    assert not hasattr(item1, "rate")
    assert not hasattr(item1, "unit_price")
    assert not hasattr(item1, "total_amount")
    assert not hasattr(result, "total_amount")
    assert not hasattr(result, "selling_price")


# ---------------------------------------------------------------------------
# 2. Missing Configuration
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_azure_extractor_missing_endpoint_or_key_raises():
    """Verify that extractor fails clearly without exposing credentials if configuration is missing."""
    with patch.object(settings, "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT", None), \
         patch.object(settings, "AZURE_DOCUMENT_INTELLIGENCE_KEY", None), \
         patch.dict(os.environ, {"AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT": "", "AZURE_DOCUMENT_INTELLIGENCE_KEY": ""}, clear=True):
        extractor = AzureDocIntelligenceExtractor(endpoint="", key="")
        with pytest.raises(ValueError) as exc_info:
            await extractor.extract(b"dummy pdf", "test.pdf")
        
        msg = str(exc_info.value)
        assert "Azure Document Intelligence configuration missing" in msg
        # Never leak key names or real values
        assert "secret" not in msg.lower()

        # Also test default instantiation without parameters
        extractor_default = AzureDocIntelligenceExtractor(endpoint=None, key=None)
        with pytest.raises(ValueError) as exc_info2:
            await extractor_default.extract(b"dummy pdf", "test.pdf")
        assert "Azure Document Intelligence configuration missing" in str(exc_info2.value)


# ---------------------------------------------------------------------------
# 3. Authentication Failure
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_azure_extractor_authentication_failure():
    """Verify ClientAuthenticationError is caught and safely re-raised without credential exposure."""
    mock_sdk_client = MagicMock()
    mock_sdk_client.begin_analyze_document.side_effect = ClientAuthenticationError("Access denied due to invalid key")

    extractor = AzureDocIntelligenceExtractor(
        endpoint="https://fake-resource.cognitiveservices.azure.com/",
        key="fake-secret-key-123",
        client=mock_sdk_client,
    )

    with pytest.raises(RuntimeError) as exc_info:
        await extractor.extract(b"dummy pdf", "test.pdf")

    msg = str(exc_info.value)
    assert "Azure Document Intelligence authentication failed" in msg
    assert "fake-secret-key" not in msg


# ---------------------------------------------------------------------------
# 4. Request Failure
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_azure_extractor_request_failure():
    """Verify HttpResponseError is caught and converted to safe RuntimeError."""
    mock_sdk_client = MagicMock()
    err = HttpResponseError(message="Document corrupted or unreadable")
    err.status_code = 400
    mock_sdk_client.begin_analyze_document.side_effect = err

    extractor = AzureDocIntelligenceExtractor(
        endpoint="https://fake-resource.cognitiveservices.azure.com/",
        key="fake-secret-key-123",
        client=mock_sdk_client,
    )

    with pytest.raises(RuntimeError) as exc_info:
        await extractor.extract(b"dummy pdf", "test.pdf")

    assert "Azure Document Intelligence request failed" in str(exc_info.value)


# ---------------------------------------------------------------------------
# 5. Timeout Handling
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_azure_extractor_timeout_handling():
    """Verify connection timeout is handled gracefully."""
    mock_sdk_client = MagicMock()
    mock_sdk_client.begin_analyze_document.side_effect = ServiceRequestError("Connection timeout while contacting Azure endpoint")

    extractor = AzureDocIntelligenceExtractor(
        endpoint="https://fake-resource.cognitiveservices.azure.com/",
        key="fake-secret-key-123",
        client=mock_sdk_client,
    )

    with pytest.raises(RuntimeError) as exc_info:
        await extractor.extract(b"dummy pdf", "test.pdf")

    assert "service timed out or was unreachable" in str(exc_info.value)


# ---------------------------------------------------------------------------
# 6. Empty OCR Result
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_azure_extractor_empty_ocr_result():
    """Empty OCR result must not crash; it should return warnings and request human review."""
    mock_sdk_client = MagicMock()
    mock_poller = MagicMock()
    mock_poller.result.return_value = MockAnalyzeResult(content="", pages=[], tables=[])
    mock_sdk_client.begin_analyze_document.return_value = mock_poller

    extractor = AzureDocIntelligenceExtractor(
        endpoint="https://fake-resource.cognitiveservices.azure.com/",
        key="fake-secret-key-123",
        client=mock_sdk_client,
    )

    result = await extractor.extract(b"empty pdf", "blank.pdf")
    assert isinstance(result, ExtractedPurchaseOrder)
    assert result.needs_human_review is True
    assert any("Empty OCR" in w for w in result.extraction_warnings)


# ---------------------------------------------------------------------------
# 7. Unsupported Document & Empty Content
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_azure_extractor_unsupported_document_and_empty_content():
    """Verify MIME type and content validation."""
    extractor = AzureDocIntelligenceExtractor(
        endpoint="https://fake-resource.cognitiveservices.azure.com/",
        key="fake-secret-key-123",
        client=MagicMock(),
    )

    # 1. Unsupported MIME type
    with pytest.raises(ValueError) as exc_info:
        await extractor.extract(b"some content", "test.txt", content_type="text/plain")
    assert "Unsupported document MIME type" in str(exc_info.value)

    # 2. Empty bytes content
    with pytest.raises(ValueError) as exc_info2:
        await extractor.extract(b"", "empty.pdf", content_type="application/pdf")
    assert "Document content cannot be empty" in str(exc_info2.value)


# ---------------------------------------------------------------------------
# 8. Malformed Response
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_azure_extractor_malformed_response():
    """Verify that corrupt or malformed Azure responses raise a clean RuntimeError."""
    mock_sdk_client = MagicMock()
    mock_poller = MagicMock()
    # Object with broken property that raises exception on access
    broken_result = MagicMock()
    type(broken_result).content = property(lambda self: (_ for _ in ()).throw(TypeError("Corrupt property")))
    mock_poller.result.return_value = broken_result
    mock_sdk_client.begin_analyze_document.return_value = mock_poller

    extractor = AzureDocIntelligenceExtractor(
        endpoint="https://fake-resource.cognitiveservices.azure.com/",
        key="fake-secret-key-123",
        client=mock_sdk_client,
    )

    with pytest.raises(RuntimeError) as exc_info:
        await extractor.extract(b"dummy pdf", "test.pdf")
    assert "Malformed response" in str(exc_info.value)


# ---------------------------------------------------------------------------
# 9. Provider Selection via POExtractionService
# ---------------------------------------------------------------------------
def test_azure_provider_selection_via_service():
    """Verify that POExtractionService can dynamically instantiate AzureDocIntelligenceExtractor."""
    service = POExtractionService(default_provider="azure")
    extractor = service.get_extractor()
    assert isinstance(extractor, AzureDocIntelligenceExtractor)

    # Can also explicitly request azure
    extractor_explicit = service.get_extractor("azure")
    assert isinstance(extractor_explicit, AzureDocIntelligenceExtractor)


# ---------------------------------------------------------------------------
# 10. PO Upload Flow Integration with Azure Extractor
# ---------------------------------------------------------------------------
def test_upload_flow_with_mocked_azure_provider(auth_headers):
    """
    Verify POST /api/v1/purchase-orders/upload seamlessly invokes the Azure provider
    when PO_EXTRACTION_PROVIDER='azure', storing the file and returning extraction.
    """
    mock_sdk_client = MagicMock()
    mock_poller = MagicMock()
    mock_poller.result.return_value = build_sample_azure_result()
    mock_sdk_client.begin_analyze_document.return_value = mock_poller

    azure_extractor = AzureDocIntelligenceExtractor(
        endpoint="https://fake-resource.cognitiveservices.azure.com/",
        key="fake-secret-key-123",
        client=mock_sdk_client,
    )

    # Patch the service's get_extractor to return our mocked Azure extractor instance
    with patch.object(po_extraction_service, "get_extractor", return_value=azure_extractor):
        fake_pdf = b"%PDF-1.4 Mock Azure Upload Test Content"
        file_payload = {
            "file": ("aerospace_po_789.pdf", io.BytesIO(fake_pdf), "application/pdf")
        }

        res = client.post("/api/v1/purchase-orders/upload", files=file_payload, headers=auth_headers)
        assert res.status_code == 200, res.text
        data = res.json()

        # Check storage properties
        assert data["source_file_name"] == "aerospace_po_789.pdf"
        assert data["content_type"] == "application/pdf"
        assert "/uploads/" in data["source_file_url"]

        # Check extraction properties from Azure provider
        assert "extraction" in data
        extraction = data["extraction"]
        assert extraction["po_number"] == "PO-AZURE-2026-999"
        assert extraction["customer_name"] == "Mahindra Aerospace Pvt Ltd"
        assert extraction["metadata"]["provider"] == "azure"
        assert len(extraction["items"]) == 2
        assert extraction["items"][0]["part_name"] == "Wing Spar Fitting"

        # Cleanup stored test file
        rel_path = data["source_file_url"].replace("/uploads/", "")
        full_path = os.path.join(UPLOAD_DIR, rel_path)
        if os.path.exists(full_path):
            os.remove(full_path)


# ---------------------------------------------------------------------------
# 11. Strict Anti-Pricing Invariant Verification
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_azure_extractor_anti_pricing_invariants():
    """
    CRITICAL INVARIANT:
    Azure extraction must NEVER produce, populate, or forward pricing or commercial fields:
    - unit_price, selling_price, material_rate, process_rate, discount, tax_amount, final_price, quotation_total
    All pricing columns in detected tables must be cleanly discarded at the boundary.
    """
    # Create table with exclusively forbidden commercial / pricing columns
    pricing_headers = [
        "Item No", "Part Name", "Qty", "Unit Price", "Material Rate",
        "Process Rate", "Discount", "Tax Amount", "Final Price", "Quotation Total", "Margin"
    ]
    cells = [MockTableCell(content=h, row_index=0, column_index=idx) for idx, h in enumerate(pricing_headers)]
    row_values = [
        "1", "Turbine Blade", "10", "4500.00", "2000.00",
        "1500.00", "5%", "18%", "45000.00", "53100.00", "20%"
    ]
    cells.extend([MockTableCell(content=v, row_index=1, column_index=idx) for idx, v in enumerate(row_values)])
    table = MockTable(cells=cells)

    mock_result = MockAnalyzeResult(
        content="PURCHASE ORDER\nPO Number: PO-INVARIANT-99\n",
        tables=[table],
        key_value_pairs=[MockKeyValuePair("PO Number", "PO-INVARIANT-99")],
    )

    mock_sdk_client = MagicMock()
    mock_poller = MagicMock()
    mock_poller.result.return_value = mock_result
    mock_sdk_client.begin_analyze_document.return_value = mock_poller

    extractor = AzureDocIntelligenceExtractor(
        endpoint="https://fake-resource.cognitiveservices.azure.com/",
        key="fake-secret-key-123",
        client=mock_sdk_client,
    )

    extracted_po = await extractor.extract(
        document_content=b"%PDF-1.4 Mock PO",
        file_name="Pricing_Test_PO.pdf",
    )

    assert len(extracted_po.items) == 1
    item = extracted_po.items[0]
    assert item.part_name == "Turbine Blade"
    assert item.quantity == Decimal("10")

    # Verify no commercial/pricing attribute exists on ExtractedPOLineItem
    forbidden_attributes = [
        "unit_price", "selling_price", "material_rate", "process_rate",
        "discount", "tax_amount", "final_price", "quotation_total",
        "rate", "price", "margin", "total_amount"
    ]
    for attr in forbidden_attributes:
        assert not hasattr(item, attr), f"Item should not have pricing attribute {attr}"
        assert not hasattr(extracted_po, attr), f"PO should not have pricing attribute {attr}"

    # Verify that model_dump contains zero forbidden pricing keys
    item_dump = item.model_dump()
    for attr in forbidden_attributes:
        assert attr not in item_dump

    po_dump = extracted_po.model_dump()
    for attr in forbidden_attributes:
        assert attr not in po_dump


# ---------------------------------------------------------------------------
# 12. Safe Normalized Internal Result Preservation
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_azure_extractor_preserves_normalized_internal_result():
    """Verify that AzureDocIntelligenceExtractor stores and exposes a safe normalized summary of the last analysis."""
    mock_sdk_client = MagicMock()
    mock_poller = MagicMock()
    mock_poller.result.return_value = build_sample_azure_result()
    mock_sdk_client.begin_analyze_document.return_value = mock_poller

    secret_key = "very-secret-azure-api-key-998877"
    extractor = AzureDocIntelligenceExtractor(
        endpoint="https://fake-resource.cognitiveservices.azure.com/",
        key=secret_key,
        client=mock_sdk_client,
    )

    await extractor.extract(
        document_content=b"%PDF-1.4 Mock Content",
        file_name="Aero_PO_2026.pdf",
    )

    raw_internal = extractor.get_last_raw_result()
    assert raw_internal is not None
    assert isinstance(raw_internal, dict)
    assert raw_internal["file_name"] == "Aero_PO_2026.pdf"
    assert raw_internal["page_count"] >= 1
    assert raw_internal["table_count"] == 1
    assert raw_internal["paragraph_count"] >= 1
    assert raw_internal["key_value_pair_count"] >= 1
    assert raw_internal["has_content"] is True

    # Critical Security Check: Ensure secret key NEVER appears in raw normalized structure
    internal_str = str(raw_internal)
    assert secret_key not in internal_str


# ---------------------------------------------------------------------------
# 13. Supported Image MIME Types (PNG, JPEG, TIFF)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
@pytest.mark.parametrize("mime_type,extension", [
    ("image/png", "po.png"),
    ("image/jpeg", "po.jpg"),
    ("image/tiff", "po.tiff"),
])
async def test_azure_extractor_supports_image_mime_types(mime_type, extension):
    """Verify that AzureDocIntelligenceExtractor supports all documented image MIME types."""
    mock_sdk_client = MagicMock()
    mock_poller = MagicMock()
    mock_poller.result.return_value = build_sample_azure_result()
    mock_sdk_client.begin_analyze_document.return_value = mock_poller

    extractor = AzureDocIntelligenceExtractor(
        endpoint="https://fake-resource.cognitiveservices.azure.com/",
        key="fake-secret-key-123",
        client=mock_sdk_client,
    )

    res = await extractor.extract(
        document_content=b"\x89PNG\r\n\x1a\nFake Image Bytes",
        file_name=f"test_{extension}",
        content_type=mime_type,
    )
    assert isinstance(res, ExtractedPurchaseOrder)
    assert res.po_number == "PO-AZURE-2026-999"


# ---------------------------------------------------------------------------
# 14. Zero Secret Leakage in Error Messages
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_azure_extractor_never_leaks_secrets_in_errors():
    """Verify that authentication and HTTP errors never echo or leak the Azure API key."""
    secret_key = "super-confidential-azure-key-xyz"
    mock_sdk_client = MagicMock()
    mock_sdk_client.begin_analyze_document.side_effect = ClientAuthenticationError(
        f"Authorization failed with key {secret_key}"
    )

    extractor = AzureDocIntelligenceExtractor(
        endpoint="https://fake-resource.cognitiveservices.azure.com/",
        key=secret_key,
        client=mock_sdk_client,
    )

    with pytest.raises(RuntimeError) as exc_info:
        await extractor.extract(b"dummy pdf", "test.pdf")

    error_msg = str(exc_info.value)
    assert "Azure Document Intelligence authentication failed" in error_msg
    assert secret_key not in error_msg


# ---------------------------------------------------------------------------
# 15. Client Instantiation without Explicit Client
# ---------------------------------------------------------------------------
def test_azure_extractor_client_instantiation():
    """Verify that _get_client correctly instantiates DocumentIntelligenceClient with AzureKeyCredential."""
    with patch("app.services.ai.extractor.DocumentIntelligenceClient") as mock_client_cls:
        extractor = AzureDocIntelligenceExtractor(
            endpoint="https://fake-resource.cognitiveservices.azure.com/",
            key="fake-secret-key-123",
            client=None,
        )
        client = extractor._get_client()
        mock_client_cls.assert_called_once()
        assert client == mock_client_cls.return_value


# ---------------------------------------------------------------------------
# 16. Fallback Header Regex Extraction
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_azure_extractor_fallback_regex_headers():
    """Verify regex header discovery when layout model provides no key-value pairs."""
    full_text = (
        "PURCHASE ORDER\n"
        "Purchase Order: PO-REGEX-2026-777\n"
        "PO Date: 2026-05-20\n"
        "Buyer: Bharat Dynamics Limited\n"
        "GSTIN: 36AAACB1234F1Z1\n"
    )
    mock_result = MockAnalyzeResult(
        content=full_text,
        key_value_pairs=[],
        tables=[],
    )

    mock_sdk_client = MagicMock()
    mock_poller = MagicMock()
    mock_poller.result.return_value = mock_result
    mock_sdk_client.begin_analyze_document.return_value = mock_poller

    extractor = AzureDocIntelligenceExtractor(
        endpoint="https://fake-resource.cognitiveservices.azure.com/",
        key="fake-secret-key-123",
        client=mock_sdk_client,
    )

    res = await extractor.extract(b"%PDF-1.4 Content", "fallback.pdf")
    assert res.po_number == "PO-REGEX-2026-777"
    assert res.po_date == date(2026, 5, 20)
    assert res.customer_name == "Bharat Dynamics Limited"
    assert res.customer_gstin == "36AAACB1234F1Z1"


# ---------------------------------------------------------------------------
# 17. Full Table Column Mappings & Edge Cases
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_azure_extractor_full_column_mappings_and_edge_cases():
    """Verify mapping of specification, material grade, setup hours, process, and date columns."""
    headers = [
        "Pos", "Item Description", "Spec", "Grade", "Quantity", "UOM",
        "Gross", "Scrap", "Machining Hrs", "Setup Hrs", "Operation", "Due Date"
    ]
    cells = [MockTableCell(content=h, row_index=0, column_index=idx) for idx, h in enumerate(headers)]

    # Row 1: Valid comprehensive data
    row_1 = [
        "1", "Crankshaft", "Forged Steel", "AISI 4340", "15", "PCS",
        "28.5", "4.2", "4.5", "1.0", "CNC Turning & Induction Hardening", "2026-06-30"
    ]
    cells.extend([MockTableCell(content=v, row_index=1, column_index=idx) for idx, v in enumerate(row_1)])

    # Row 2: Edge case with non-numeric or invalid numbers that shouldn't crash
    row_2 = [
        "invalid_num", "Cam Bush", "Bronze", "PB2", "0", "PCS",
        "invalid_wt", "N/A", "TBD", "none", "Turning", "invalid-date"
    ]
    cells.extend([MockTableCell(content=v, row_index=2, column_index=idx) for idx, v in enumerate(row_2)])

    mock_result = MockAnalyzeResult(
        content="PO Content\n",
        tables=[MockTable(cells=cells)],
    )

    mock_sdk_client = MagicMock()
    mock_poller = MagicMock()
    mock_poller.result.return_value = mock_result
    mock_sdk_client.begin_analyze_document.return_value = mock_poller

    extractor = AzureDocIntelligenceExtractor(
        endpoint="https://fake-resource.cognitiveservices.azure.com/",
        key="fake-secret-key-123",
        client=mock_sdk_client,
    )

    res = await extractor.extract(b"%PDF-1.4 Content", "table_full.pdf")
    assert len(res.items) >= 1
    item = res.items[0]
    assert item.part_name == "Crankshaft"
    assert item.specification == "Forged Steel"
    assert item.material_grade == "AISI 4340"
    assert item.setup_hours == Decimal("1.0")
    assert item.process == "CNC Turning & Induction Hardening"
    assert item.requested_delivery_date == date(2026, 6, 30)


# ---------------------------------------------------------------------------
# 18. Unexpected Generic Exception Handling
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_azure_extractor_unexpected_exception():
    """Verify generic unexpected exceptions are wrapped in RuntimeError."""
    mock_sdk_client = MagicMock()
    mock_sdk_client.begin_analyze_document.side_effect = ZeroDivisionError("Math error")

    extractor = AzureDocIntelligenceExtractor(
        endpoint="https://fake-resource.cognitiveservices.azure.com/",
        key="fake-secret-key-123",
        client=mock_sdk_client,
    )

    with pytest.raises(RuntimeError) as exc_info:
        await extractor.extract(b"dummy pdf", "test.pdf")
    assert "Azure Document Intelligence extraction error: ZeroDivisionError" in str(exc_info.value)


# ---------------------------------------------------------------------------
# 19. Gemini Extractor Phase 3 Stub Verification
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_gemini_extractor_phase3_stub():
    """Verify GeminiPOExtractor raises NotImplementedError for Phase 3."""
    from app.services.ai.extractor import GeminiPOExtractor
    gemini_extractor = GeminiPOExtractor()
    with pytest.raises(NotImplementedError):
        await gemini_extractor.extract(b"content", "file.pdf")


