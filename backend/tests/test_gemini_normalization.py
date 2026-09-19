"""
Comprehensive Unit and Regression Test Suite for Gemini Semantic Normalization.

Tests all 15 scenarios + 2 regression cases at the SDK boundary.
Zero live external Gemini API calls are made during automated tests.
"""
import json
import pytest
from unittest.mock import AsyncMock, MagicMock
from decimal import Decimal
from datetime import date

from app.core.config import settings
from app.schemas.extraction import (
    ExtractedPurchaseOrder,
    ExtractedPOLineItem,
    ExtractionMetadata,
    FORBIDDEN_PRICING_FIELDS,
)
from app.schemas.normalization import (
    GeminiNormalizedPurchaseOrder,
    GeminiNormalizedLineItem,
)
from app.services.ai.normalizer import (
    BasePONormalizer,
    MockPONormalizer,
    GeminiPONormalizer,
)
from app.services.ai.extractor import (
    POExtractionService,
    evaluate_extraction_quality,
)


def create_initial_extracted_po(
    customer_name="inspection before dispatch",
    po_number="PO-2026-0098",
    po_date=date(2026, 9, 19),
    include_items=True,
    process=None,
) -> ExtractedPurchaseOrder:
    """Helper to create realistic initial PO candidates extracted by OCR."""
    items = []
    if include_items:
        items = [
            ExtractedPOLineItem(
                item_number=1,
                part_name="Flange Adapter 50mm",
                description="Flange Adapter as per DWG-FA-050-REV3",
                specification="SS304 / ASTM A276",
                drawing_number="DWG-FA-050-REV3",
                material="SS304",
                quantity=Decimal("25.00"),
                unit="PCS",
                process=process,
                confidence=Decimal("0.95"),
            ),
            ExtractedPOLineItem(
                item_number=2,
                part_name="Coupling Bush 30mm",
                description="Coupling Bush phosphor bronze",
                specification="PB2 / Phosphor Bronze",
                drawing_number="DWG-CB-030-REV1",
                material="Phosphor Bronze",
                quantity=Decimal("100.00"),
                unit="PCS",
                process=process,
                confidence=Decimal("0.94"),
            ),
        ]

    metadata = ExtractionMetadata(
        source_document="sample_manufacturing_purchase_order.pdf",
        page_number=1,
        confidence=Decimal("0.95"),
        provider="azure",
        raw_text="PURCHASE ORDER\nABC Engineering Components Pvt. Ltd.\nPO-2026-0098",
    )

    return ExtractedPurchaseOrder(
        po_number=po_number,
        po_date=po_date,
        customer_name=customer_name,
        items=items,
        metadata=metadata,
    )


def create_mock_gemini_client(response_json_str: str) -> MagicMock:
    """Helper creating a mocked google-genai Client returning specified JSON text."""
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = response_json_str

    mock_client.aio = MagicMock()
    mock_client.aio.models = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response)
    return mock_client


# 1. SUCCESSFUL NORMALIZATION
@pytest.mark.asyncio
async def test_successful_normalization():
    initial_po = create_initial_extracted_po()
    mock_doc_rep = {"file_name": "sample.pdf", "full_text": "Sample text"}

    gemini_json = json.dumps({
        "po_number": "PO-2026-0098",
        "po_date": "2026-09-19",
        "customer_name": "ABC Engineering Components Pvt. Ltd.",
        "customer_gstin": "27AABCU9603R1ZM",
        "items": [
            {
                "item_number": 1,
                "part_name": "Flange Adapter 50mm",
                "material": "SS304",
                "quantity": 25.0,
                "unit": "PCS",
                "process": None,
            },
            {
                "item_number": 2,
                "part_name": "Coupling Bush 30mm",
                "material": "Phosphor Bronze",
                "quantity": 100.0,
                "unit": "PCS",
                "process": None,
            },
        ],
    })

    client = create_mock_gemini_client(gemini_json)
    normalizer = GeminiPONormalizer(api_key="test-api-key", client=client)

    normalized_po = await normalizer.normalize(mock_doc_rep, initial_po)

    assert normalized_po.customer_name == "ABC Engineering Components Pvt. Ltd."
    assert normalized_po.po_number == "PO-2026-0098"
    assert normalized_po.po_date == date(2026, 9, 19)
    assert len(normalized_po.items) == 2
    assert normalized_po.items[0].quantity == Decimal("25.0")
    assert normalized_po.metadata.provider == "azure+gemini"


# 2. CORRECT CUSTOMER IDENTIFICATION
@pytest.mark.asyncio
async def test_correct_customer_identification():
    initial_po = create_initial_extracted_po(customer_name="inspection before dispatch")
    doc_rep = {
        "file_name": "sample.pdf",
        "paragraphs": [
            "ABC Engineering Components Pvt. Ltd.",
            "Plot No. 12, Bhosari MIDC, Pune",
            "Special Instructions: inspection before dispatch",
        ],
    }

    gemini_json = json.dumps({
        "customer_name": "ABC Engineering Components Pvt. Ltd.",
        "inspection_instructions": "inspection before dispatch",
        "items": [],
    })

    client = create_mock_gemini_client(gemini_json)
    normalizer = GeminiPONormalizer(api_key="test-api-key", client=client)

    normalized_po = await normalizer.normalize(doc_rep, initial_po)
    assert normalized_po.customer_name == "ABC Engineering Components Pvt. Ltd."
    assert normalized_po.customer_name != "inspection before dispatch"


# 3. CORRECT LINE-ITEM NORMALIZATION
@pytest.mark.asyncio
async def test_correct_line_item_normalization():
    initial_po = create_initial_extracted_po()
    doc_rep = {"file_name": "sample.pdf"}

    gemini_json = json.dumps({
        "items": [
            {
                "item_number": 1,
                "part_name": "Flange Adapter 50mm",
                "specification": "ASTM A276 / SS304",
                "drawing_number": "DWG-FA-050-REV3",
                "material": "SS304",
                "quantity": 25.0,
                "unit": "PCS",
                "gross_weight_kg": 1.25,
                "scrap_weight_kg": 0.15,
                "process": None,
            }
        ]
    })

    client = create_mock_gemini_client(gemini_json)
    normalizer = GeminiPONormalizer(api_key="test-api-key", client=client)

    normalized_po = await normalizer.normalize(doc_rep, initial_po)
    item = normalized_po.items[0]
    assert item.item_number == 1
    assert item.part_name == "Flange Adapter 50mm"
    assert item.specification == "ASTM A276 / SS304"
    assert item.drawing_number == "DWG-FA-050-REV3"
    assert item.material == "SS304"
    assert item.quantity == Decimal("25.0")
    assert item.unit == "PCS"
    assert item.gross_weight_kg == Decimal("1.25")
    assert item.scrap_weight_kg == Decimal("0.15")


# 4. MISSING CUSTOMER
@pytest.mark.asyncio
async def test_missing_customer():
    initial_po = create_initial_extracted_po(customer_name=None)
    doc_rep = {"file_name": "unlabelled.pdf"}

    gemini_json = json.dumps({
        "customer_name": None,
        "items": [],
    })

    client = create_mock_gemini_client(gemini_json)
    normalizer = GeminiPONormalizer(api_key="test-api-key", client=client)

    normalized_po = await normalizer.normalize(doc_rep, initial_po)
    evaluated = evaluate_extraction_quality(normalized_po)

    assert evaluated.customer_name is None
    assert "MISSING_CUSTOMER" in evaluated.review_flags
    assert evaluated.needs_human_review is True


# 5. AMBIGUOUS CUSTOMER
@pytest.mark.asyncio
async def test_ambiguous_customer():
    initial_po = create_initial_extracted_po(customer_name=None)
    doc_rep = {"file_name": "sample.pdf"}

    # If model incorrectly returns an inspection clause as customer, normalizer rejects it
    gemini_json = json.dumps({
        "customer_name": "inspection before dispatch",
        "items": [],
    })

    client = create_mock_gemini_client(gemini_json)
    normalizer = GeminiPONormalizer(api_key="test-api-key", client=client)

    normalized_po = await normalizer.normalize(doc_rep, initial_po)
    evaluated = evaluate_extraction_quality(normalized_po)

    assert evaluated.customer_name is None
    assert "MISSING_CUSTOMER" in evaluated.review_flags
    assert evaluated.needs_human_review is True


# 6. MISSING PROCESS
@pytest.mark.asyncio
async def test_missing_process_preserved_null():
    initial_po = create_initial_extracted_po(process=None)
    doc_rep = {"file_name": "sample.pdf"}

    gemini_json = json.dumps({
        "customer_name": "ABC Engineering Components Pvt. Ltd.",
        "items": [
            {
                "item_number": 1,
                "part_name": "Flange Adapter 50mm",
                "material": "SS304",
                "quantity": 25.0,
                "process": None,  # MUST NOT invent operations
            }
        ],
    })

    client = create_mock_gemini_client(gemini_json)
    normalizer = GeminiPONormalizer(api_key="test-api-key", client=client)

    normalized_po = await normalizer.normalize(doc_rep, initial_po)
    evaluated = evaluate_extraction_quality(normalized_po)

    assert evaluated.items[0].process is None
    assert "AMBIGUOUS_PROCESS" in evaluated.review_flags
    assert evaluated.needs_human_review is True


# 7. INVALID GEMINI OUTPUT (MALFORMED JSON)
@pytest.mark.asyncio
async def test_invalid_gemini_output():
    initial_po = create_initial_extracted_po()
    doc_rep = {"file_name": "sample.pdf"}

    client = create_mock_gemini_client("NOT VALID JSON {{{ broken")
    normalizer = GeminiPONormalizer(api_key="test-api-key", client=client)

    with pytest.raises(RuntimeError, match="invalid or malformed JSON"):
        await normalizer.normalize(doc_rep, initial_po)


# 8. PROHIBITED PRICING FIELD REJECTION
@pytest.mark.asyncio
async def test_prohibited_pricing_field_rejection():
    initial_po = create_initial_extracted_po()
    doc_rep = {"file_name": "sample.pdf"}

    # Attempting to return unit_price or material_rate must be immediately rejected
    for forbidden_field in ["unit_price", "material_rate", "selling_price", "tax_amount"]:
        gemini_json = json.dumps({
            "customer_name": "ABC Corp",
            forbidden_field: 500.00,
            "items": [],
        })

        client = create_mock_gemini_client(gemini_json)
        normalizer = GeminiPONormalizer(api_key="test-api-key", client=client)

        with pytest.raises((ValueError, RuntimeError)) as exc_info:
            await normalizer.normalize(doc_rep, initial_po)

        assert "anti-pricing" in str(exc_info.value).lower() or "forbidden" in str(exc_info.value).lower()


# 9. GEMINI API FAILURE
@pytest.mark.asyncio
async def test_gemini_api_failure():
    initial_po = create_initial_extracted_po()
    doc_rep = {"file_name": "sample.pdf"}

    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(side_effect=Exception("API service unavailable"))

    normalizer = GeminiPONormalizer(api_key="test-api-key", client=mock_client)

    with pytest.raises(RuntimeError, match="Gemini normalization request failed"):
        await normalizer.normalize(doc_rep, initial_po)


# 10. TIMEOUT HANDLING
@pytest.mark.asyncio
async def test_timeout_handling():
    initial_po = create_initial_extracted_po()
    doc_rep = {"file_name": "sample.pdf"}

    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(side_effect=TimeoutError("Request timed out"))

    normalizer = GeminiPONormalizer(api_key="test-api-key", client=mock_client)

    with pytest.raises(RuntimeError, match="timed out"):
        await normalizer.normalize(doc_rep, initial_po)


# 11. MALFORMED RESPONSE (EMPTY TEXT)
@pytest.mark.asyncio
async def test_malformed_response_empty_text():
    initial_po = create_initial_extracted_po()
    doc_rep = {"file_name": "sample.pdf"}

    client = create_mock_gemini_client("")
    normalizer = GeminiPONormalizer(api_key="test-api-key", client=client)

    with pytest.raises(RuntimeError, match="empty response"):
        await normalizer.normalize(doc_rep, initial_po)


# 12. PROVIDER SELECTION
@pytest.mark.asyncio
async def test_provider_selection():
    service = POExtractionService(default_provider="mock", default_normalizer="mock")

    mock_normalizer = service.get_normalizer("mock")
    assert isinstance(mock_normalizer, MockPONormalizer)

    gemini_normalizer = service.get_normalizer("gemini")
    assert isinstance(gemini_normalizer, GeminiPONormalizer)

    with pytest.raises(ValueError, match="Unknown normalization provider"):
        service.get_normalizer("unregistered_provider")


# 13. HUMAN-REVIEW PROPAGATION
@pytest.mark.asyncio
async def test_human_review_propagation():
    # Initial PO has multiple missing items
    initial_po = ExtractedPurchaseOrder(
        po_number=None,
        customer_name=None,
        po_date=None,
        items=[],
    )
    doc_rep = {"file_name": "empty.pdf"}

    gemini_json = json.dumps({
        "po_number": None,
        "customer_name": None,
        "items": [],
    })

    client = create_mock_gemini_client(gemini_json)
    normalizer = GeminiPONormalizer(api_key="test-api-key", client=client)

    normalized_po = await normalizer.normalize(doc_rep, initial_po)
    evaluated = evaluate_extraction_quality(normalized_po)

    assert evaluated.needs_human_review is True
    assert "MISSING_PO_NUMBER" in evaluated.review_flags
    assert "MISSING_CUSTOMER" in evaluated.review_flags
    assert "MISSING_PO_DATE" in evaluated.review_flags
    assert "NO_LINE_ITEMS" in evaluated.review_flags


# 14. MISSING GEMINI CONFIGURATION
@pytest.mark.asyncio
async def test_missing_gemini_configuration():
    initial_po = create_initial_extracted_po()
    doc_rep = {"file_name": "sample.pdf"}

    # Missing API key
    normalizer_no_key = GeminiPONormalizer(api_key="", model_name="gemini-2.5-flash")
    with pytest.raises(ValueError, match="GEMINI_API_KEY must be configured"):
        await normalizer_no_key.normalize(doc_rep, initial_po)

    # Missing model
    normalizer_no_model = GeminiPONormalizer(api_key="test-key", model_name="")
    with pytest.raises(ValueError, match="GEMINI_MODEL must be configured"):
        await normalizer_no_model.normalize(doc_rep, initial_po)


# 15. SECRET-SANITIZATION BEHAVIOR
@pytest.mark.asyncio
async def test_secret_sanitization_behavior():
    secret_key = "AIzaSySecretKeyThatMustNeverAppearInLogs"
    initial_po = create_initial_extracted_po()
    doc_rep = {"file_name": "sample.pdf"}

    # Mock client raising error containing the secret key
    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(
        side_effect=Exception(f"Failed to authenticate with key {secret_key}")
    )

    normalizer = GeminiPONormalizer(api_key=secret_key, client=mock_client)

    with pytest.raises(RuntimeError) as exc_info:
        await normalizer.normalize(doc_rep, initial_po)

    error_str = str(exc_info.value)
    # The actual secret key must NEVER appear in the raised exception string
    assert secret_key not in error_str
    assert "[REDACTED_GEMINI_KEY]" in error_str or "failed" in error_str.lower()


# 16. SAMPLE PO REGRESSION TEST: CUSTOMER NORMALIZATION
@pytest.mark.asyncio
async def test_sample_po_regression_customer_fixed():
    """
    Regression Test:
    Simulates Azure's real flaw where the unlabelled header caused
    Azure fallback to match 'inspection before dispatch' as the customer.
    Gemini semantic normalization correctly resolves the customer to
    'ABC Engineering Components Pvt. Ltd.'.
    """
    initial_po = create_initial_extracted_po(customer_name="inspection before dispatch")
    doc_rep = {
        "file_name": "sample_manufacturing_purchase_order.pdf",
        "paragraphs": [
            "ABC Engineering Components Pvt. Ltd.",
            "Works: Plot 45, MIDC Chakan, Pune 410501",
            "Terms: 100% inspection before dispatch",
        ],
    }

    # Gemini output resolves customer correctly
    gemini_json = json.dumps({
        "customer_name": "ABC Engineering Components Pvt. Ltd.",
        "inspection_instructions": "inspection before dispatch",
        "items": [
            {
                "item_number": 1,
                "part_name": "Flange Adapter 50mm",
                "material": "SS304",
                "quantity": 25.0,
                "process": None,
            }
        ],
    })

    client = create_mock_gemini_client(gemini_json)
    normalizer = GeminiPONormalizer(api_key="test-api-key", client=client)

    normalized_po = await normalizer.normalize(doc_rep, initial_po)

    assert normalized_po.customer_name == "ABC Engineering Components Pvt. Ltd."
    assert normalized_po.customer_name != "inspection before dispatch"


# 17. PROCESS REGRESSION TEST: UNSTATED PROCESS REMAINS NULL
@pytest.mark.asyncio
async def test_sample_po_regression_process_remains_null():
    """
    Regression Test:
    The sample PO does not explicitly specify manufacturing processes.
    Therefore, process must remain None and AMBIGUOUS_PROCESS flag must be present.
    Gemini must NOT invent processes like CNC Turning or VMC Milling.
    """
    initial_po = create_initial_extracted_po(process=None)
    doc_rep = {"file_name": "sample_manufacturing_purchase_order.pdf"}

    gemini_json = json.dumps({
        "customer_name": "ABC Engineering Components Pvt. Ltd.",
        "items": [
            {
                "item_number": 1,
                "part_name": "Flange Adapter 50mm",
                "material": "SS304",
                "quantity": 25.0,
                "process": None,
            },
            {
                "item_number": 2,
                "part_name": "Coupling Bush 30mm",
                "material": "Phosphor Bronze",
                "quantity": 100.0,
                "process": None,
            },
        ],
    })

    client = create_mock_gemini_client(gemini_json)
    normalizer = GeminiPONormalizer(api_key="test-api-key", client=client)

    normalized_po = await normalizer.normalize(doc_rep, initial_po)
    evaluated = evaluate_extraction_quality(normalized_po)

    for item in evaluated.items:
        assert item.process is None
        assert "AMBIGUOUS_PROCESS" in item.review_flags

    assert "AMBIGUOUS_PROCESS" in evaluated.review_flags
    assert evaluated.needs_human_review is True
