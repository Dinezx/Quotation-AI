"""
Unit and integration tests for Purchase Order AI/OCR extraction foundation.

CRITICAL ARCHITECTURAL TESTS:
1. Canonical schema validation (strictly no pricing fields)
2. Quality evaluation & review flags for human-in-the-loop inspection
3. Provider abstraction & mock extractor
4. Upload endpoint integration
5. Deterministic calculation independence
"""
import os
import io
import pytest
from datetime import date
from decimal import Decimal
from pydantic import ValidationError
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.extraction import (
    ExtractedPurchaseOrder,
    ExtractedPOLineItem,
    ExtractionMetadata,
    FORBIDDEN_PRICING_FIELDS,
)
from app.services.ai.extractor import (
    BasePOExtractor,
    MockPOExtractor,
    AzureDocIntelligenceExtractor,
    GeminiPOExtractor,
    POExtractionService,
    po_extraction_service,
    evaluate_extraction_quality,
    convert_extraction_to_po_create,
)
from app.services.storage.storage_service import UPLOAD_DIR

client = TestClient(app)


# ---------------------------------------------------------------------------
# 1. Mock Extractor Returns Valid Structured PO
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_mock_extractor_returns_valid_structured_po():
    """Verify that MockPOExtractor produces a valid, realistic manufacturing PO."""
    extractor = MockPOExtractor()
    dummy_pdf_bytes = b"%PDF-1.4 Mock PO Test Content"
    
    result = await extractor.extract(
        document_content=dummy_pdf_bytes,
        file_name="PO_Industrial_Gearbox.pdf",
        content_type="application/pdf",
    )

    assert isinstance(result, ExtractedPurchaseOrder)
    assert result.po_number == "PO-2026-00125"
    assert result.customer_name == "ABC Manufacturing Pvt Ltd"
    assert result.customer_gstin == "27AABCU9603R1ZM"
    assert result.currency == "INR"
    assert len(result.items) == 2

    # Check first item details
    item1 = result.items[0]
    assert item1.item_number == 1
    assert item1.part_name == "Bearing Housing"
    assert item1.material == "EN8"
    assert item1.quantity == Decimal("100.00")
    assert item1.unit == "PCS"
    assert item1.gross_weight_kg == Decimal("12.500")
    assert item1.machining_hours == Decimal("1.75")
    assert item1.confidence >= Decimal("0.95")

    # Check second item details
    item2 = result.items[1]
    assert item2.item_number == 2
    assert item2.part_name == "Pinion Shaft 40mm"
    assert item2.material == "AISI 4140"
    assert item2.quantity == Decimal("50.00")

    # Verify metadata
    assert result.metadata.source_document == "PO_Industrial_Gearbox.pdf"
    assert result.metadata.provider == "mock"
    assert result.metadata.confidence >= Decimal("0.95")


# ---------------------------------------------------------------------------
# 2. Missing Optional Fields are Allowed
# ---------------------------------------------------------------------------
def test_missing_optional_fields_are_allowed():
    """Verify that incomplete or minimal PO extractions do not raise validation errors."""
    minimal_po = ExtractedPurchaseOrder(po_number="PO-MIN-001")
    assert minimal_po.po_number == "PO-MIN-001"
    assert minimal_po.customer_name is None
    assert minimal_po.po_date is None
    assert minimal_po.billing_address is None
    assert minimal_po.items == []
    assert minimal_po.currency == "INR"

    minimal_item = ExtractedPOLineItem(part_name="Hex Nut M12")
    assert minimal_item.part_name == "Hex Nut M12"
    assert minimal_item.quantity is None
    assert minimal_item.gross_weight_kg is None
    assert minimal_item.machining_hours is None
    assert minimal_item.specification is None


# ---------------------------------------------------------------------------
# 3. Invalid Quantity Rejected
# ---------------------------------------------------------------------------
def test_invalid_quantity_rejected():
    """Negative or zero quantity must be rejected by Pydantic validation."""
    with pytest.raises(ValidationError) as exc_info:
        ExtractedPOLineItem(part_name="Flange", quantity=Decimal("-5.00"))
    assert "Line item quantity must be strictly greater than 0" in str(exc_info.value)

    with pytest.raises(ValidationError) as exc_info2:
        ExtractedPOLineItem(part_name="Flange", quantity=Decimal("0.00"))
    assert "Line item quantity must be strictly greater than 0" in str(exc_info2.value)


# ---------------------------------------------------------------------------
# 4. Negative Weights and Hours Rejected
# ---------------------------------------------------------------------------
def test_negative_weights_and_hours_rejected():
    """Weights and machining hours cannot be negative."""
    with pytest.raises(ValidationError) as exc_info:
        ExtractedPOLineItem(part_name="Shaft", gross_weight_kg=Decimal("-1.250"))
    assert "Weight cannot be negative" in str(exc_info.value)

    with pytest.raises(ValidationError) as exc_info:
        ExtractedPOLineItem(part_name="Shaft", scrap_weight_kg=Decimal("-0.100"))
    assert "Weight cannot be negative" in str(exc_info.value)

    with pytest.raises(ValidationError) as exc_info:
        ExtractedPOLineItem(part_name="Shaft", machining_hours=Decimal("-2.50"))
    assert "Hours cannot be negative" in str(exc_info.value)

    with pytest.raises(ValidationError) as exc_info:
        ExtractedPOLineItem(part_name="Shaft", setup_hours=Decimal("-0.50"))
    assert "Hours cannot be negative" in str(exc_info.value)


# ---------------------------------------------------------------------------
# 5. Invalid Date Rejected
# ---------------------------------------------------------------------------
def test_invalid_date_rejected():
    """Malformed date formats must produce a validation error."""
    with pytest.raises(ValidationError):
        ExtractedPurchaseOrder(po_number="PO-001", po_date="not-a-valid-date")

    with pytest.raises(ValidationError):
        ExtractedPOLineItem(part_name="Spindle", requested_delivery_date="2026-99-99")


# ---------------------------------------------------------------------------
# 6. Multiple PO Items Supported
# ---------------------------------------------------------------------------
def test_multiple_po_items_supported():
    """Verify that multiple line items are cleanly parsed and preserved."""
    items = [
        ExtractedPOLineItem(item_number=1, part_name="Plate A", quantity=Decimal("10")),
        ExtractedPOLineItem(item_number=2, part_name="Bracket B", quantity=Decimal("20")),
        ExtractedPOLineItem(item_number=3, part_name="Collar C", quantity=Decimal("30")),
    ]
    po = ExtractedPurchaseOrder(po_number="PO-MULTI-001", items=items)
    assert len(po.items) == 3
    assert [it.part_name for it in po.items] == ["Plate A", "Bracket B", "Collar C"]
    assert [it.quantity for it in po.items] == [Decimal("10"), Decimal("20"), Decimal("30")]


# ---------------------------------------------------------------------------
# 7. Extraction Warnings and Review Flags Supported
# ---------------------------------------------------------------------------
def test_extraction_warnings_and_review_flags():
    """Quality evaluation must flag missing fields, low confidence, and ambiguity."""
    incomplete_po = ExtractedPurchaseOrder(
        po_number="",  # Missing PO number
        customer_name=None,  # Missing customer
        po_date=None,  # Missing date
        items=[
            ExtractedPOLineItem(
                item_number=1,
                part_name="",  # Missing part name
                quantity=None,  # Missing quantity
                confidence=Decimal("0.60"),  # Low confidence
                material=None,  # Ambiguous material
                material_grade=None,
                process=None,  # Ambiguous process
            )
        ]
    )

    evaluated = evaluate_extraction_quality(incomplete_po)

    assert evaluated.needs_human_review is True
    assert "MISSING_PO_NUMBER" in evaluated.review_flags
    assert "MISSING_CUSTOMER" in evaluated.review_flags
    assert "MISSING_PO_DATE" in evaluated.review_flags
    assert "MISSING_QUANTITY" in evaluated.review_flags
    assert "MISSING_PART_NAME" in evaluated.review_flags
    assert "LOW_CONFIDENCE" in evaluated.review_flags
    assert "AMBIGUOUS_MATERIAL" in evaluated.review_flags
    assert "AMBIGUOUS_PROCESS" in evaluated.review_flags

    # Also test empty items flag
    empty_po = ExtractedPurchaseOrder(po_number="PO-VALID", customer_name="Valid Corp", po_date=date(2026, 1, 1), items=[])
    evaluated_empty = evaluate_extraction_quality(empty_po)
    assert evaluated_empty.needs_human_review is True
    assert "NO_LINE_ITEMS" in evaluated_empty.review_flags


# ---------------------------------------------------------------------------
# 8. Provider Abstraction Works
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_provider_abstraction_works():
    """Verify provider registration, dynamic instantiation, and Phase 3 stubs."""
    service = POExtractionService(default_provider="mock")
    
    # 1. Default mock provider works
    extractor = service.get_extractor()
    assert isinstance(extractor, MockPOExtractor)

    # 2. Azure real provider works and is instantiated
    azure_extractor = service.get_extractor("azure")
    assert isinstance(azure_extractor, AzureDocIntelligenceExtractor)
    assert azure_extractor.model_id == "prebuilt-layout"

    # 3. Gemini stub raises NotImplementedError
    gemini_extractor = service.get_extractor("gemini")
    assert isinstance(gemini_extractor, GeminiPOExtractor)
    with pytest.raises(NotImplementedError) as exc_gemini:
        await gemini_extractor.extract(b"dummy", "test.pdf")
    assert "Gemini" in str(exc_gemini.value)

    # 4. Unknown provider raises ValueError
    with pytest.raises(ValueError) as exc_unknown:
        service.get_extractor("unsupported_provider")
    assert "Unknown extraction provider" in str(exc_unknown.value)

    # 5. Custom provider can be registered
    class CustomExtractor(BasePOExtractor):
        async def extract(self, document_content: bytes, file_name: str, content_type: str = "application/pdf"):
            return ExtractedPurchaseOrder(po_number="CUSTOM-001")

    service.register_provider("custom", CustomExtractor)
    custom_inst = service.get_extractor("custom")
    assert isinstance(custom_inst, CustomExtractor)
    custom_res = await custom_inst.extract(b"", "doc.pdf")
    assert custom_res.po_number == "CUSTOM-001"


# ---------------------------------------------------------------------------
# 9. PO Upload Flow Integration
# ---------------------------------------------------------------------------
def test_upload_flow_remains_functional_and_returns_extraction(auth_headers):
    """Verify POST /purchase-orders/upload stores the file and returns mock extraction."""
    fake_pdf = b"%PDF-1.4 Mock Upload Test Content"
    file_payload = {
        "file": ("vendor_order_123.pdf", io.BytesIO(fake_pdf), "application/pdf")
    }

    res = client.post("/api/v1/purchase-orders/upload", files=file_payload, headers=auth_headers)
    assert res.status_code == 200, res.text
    data = res.json()

    # Verify storage properties
    assert data["source_file_name"] == "vendor_order_123.pdf"
    assert data["content_type"] == "application/pdf"
    assert "/uploads/" in data["source_file_url"]

    # Verify extraction payload attached
    assert "extraction" in data
    extraction = data["extraction"]
    assert extraction["po_number"] == "PO-2026-00125"
    assert extraction["customer_name"] == "ABC Manufacturing Pvt Ltd"
    assert len(extraction["items"]) == 2
    assert extraction["items"][0]["part_name"] == "Bearing Housing"
    assert extraction["items"][1]["part_name"] == "Pinion Shaft 40mm"

    # Cleanup stored file
    rel_path = data["source_file_url"].replace("/uploads/", "")
    full_path = os.path.join(UPLOAD_DIR, rel_path)
    if os.path.exists(full_path):
        try:
            os.remove(full_path)
        except OSError:
            pass


# ---------------------------------------------------------------------------
# 10. AI Extraction Never Modifies Quotation Pricing
# ---------------------------------------------------------------------------
def test_ai_extraction_never_generates_or_modifies_quotation_pricing(auth_headers):
    """
    CRITICAL ARCHITECTURAL INVARIANT:
    Extraction schemas must reject any commercial/pricing fields, and converting
    an extracted PO must leave pricing strictly to the calculation engine.
    """
    # 1. Verify schema level rejection: passing pricing fields to ExtractedPurchaseOrder must fail
    for forbidden in FORBIDDEN_PRICING_FIELDS:
        with pytest.raises(ValidationError):
            ExtractedPurchaseOrder(**{"po_number": "PO-TEST", forbidden: Decimal("100.00")})

    # 2. Verify schema level rejection on ExtractedPOLineItem (via extra='forbid')
    with pytest.raises(ValidationError):
        ExtractedPOLineItem(part_name="Widget", unit_price=Decimal("50.00"))

    with pytest.raises(ValidationError):
        ExtractedPOLineItem(part_name="Widget", selling_price=Decimal("1500.00"))

    # 3. Test bridging to PurchaseOrderCreate preserves separation
    sample_extracted = ExtractedPurchaseOrder(
        po_number="PO-INVARIANT-001",
        po_date=date(2026, 3, 20),
        customer_name="Precision Engineering Ltd",
        items=[
            ExtractedPOLineItem(
                item_number=1,
                part_name="Drive Shaft",
                quantity=Decimal("10.00"),
                unit="PCS",
                material="EN8",
                material_grade="EN8",
                gross_weight_kg=Decimal("5.000"),
                scrap_weight_kg=Decimal("1.000"),
                process="CNC Turning",
                machining_hours=Decimal("2.00"),
            )
        ]
    )

    po_create = convert_extraction_to_po_create(
        extraction=sample_extracted,
        source_file_url="/uploads/test.pdf",
        source_file_name="test.pdf"
    )

    # Verify no pricing data in PurchaseOrderCreate
    assert not hasattr(po_create, "total_price")
    assert not hasattr(po_create, "unit_price")
    assert not hasattr(po_create.items[0], "unit_price")
    assert not hasattr(po_create.items[0], "selling_price")

    # 4. Save PO to database and verify standard creation
    res_po = client.post("/api/v1/purchase-orders", json=po_create.model_dump(mode="json"), headers=auth_headers)
    assert res_po.status_code == 201, res_po.text
    created_po = res_po.json()
    assert created_po["po_number"] == "PO-INVARIANT-001"
    assert len(created_po["items"]) == 1
