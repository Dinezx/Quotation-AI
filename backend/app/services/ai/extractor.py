"""
AI / OCR Extraction Architecture for Purchase Orders.

CRITICAL ARCHITECTURAL RULES:
1. AI/OCR is ONLY responsible for extracting and normalizing purchase-order data.
2. AI MUST NOT:
   - calculate quotation prices
   - choose material rates or process rates
   - determine overhead, profit, or GST
   - generate the final selling price
3. Separation of untrusted extraction from application data:
   Document -> ExtractionResult -> Human Review -> Approved PO -> SQLAlchemy PurchaseOrder
"""
from abc import ABC, abstractmethod
from datetime import date, datetime
from decimal import Decimal
from typing import Dict, Any, List, Optional, Type
import logging

from app.core.config import settings
from app.schemas.extraction import (
    ExtractedPurchaseOrder,
    ExtractedPOLineItem,
    ExtractionMetadata,
)
from app.schemas.purchase_order import (
    PurchaseOrderCreate,
    PurchaseOrderItemCreate,
)

logger = logging.getLogger(__name__)


class BasePOExtractor(ABC):
    """Abstract base class for all purchase order document extractors."""

    @abstractmethod
    async def extract(
        self,
        document_content: bytes,
        file_name: str,
        content_type: str = "application/pdf",
    ) -> ExtractedPurchaseOrder:
        """Extract structured PO data from document bytes."""
        pass


# Backwards compatibility alias
BaseExtractor = BasePOExtractor


class MockPOExtractor(BasePOExtractor):
    """
    Deterministic mock extractor for development, testing, and offline verification.
    Returns realistic industrial manufacturing PO data with strictly NO pricing fields.
    """

    async def extract(
        self,
        document_content: bytes,
        file_name: str,
        content_type: str = "application/pdf",
    ) -> ExtractedPurchaseOrder:
        logger.info(f"MockPOExtractor: extracting structured data from {file_name} ({len(document_content)} bytes)")

        # Realistic demo line items representing industrial machining parts
        item_1 = ExtractedPOLineItem(
            item_number=1,
            part_name="Bearing Housing",
            description="Machined Bearing Housing for Industrial Gearbox",
            specification="Cast Iron Grade FG 260 / EN8",
            drawing_number="DWG-BH-001-REV2",
            material="EN8",
            material_grade="EN8 / Carbon Steel",
            quantity=Decimal("100.00"),
            unit="PCS",
            gross_weight_kg=Decimal("12.500"),
            scrap_weight_kg=Decimal("2.100"),
            machining_hours=Decimal("1.75"),
            setup_hours=Decimal("0.50"),
            process="CNC Turning & VMC Milling",
            requested_delivery_date=date(2026, 4, 30),
            confidence=Decimal("0.98"),
            raw_text="Item 1: Bearing Housing, Qty: 100, Mat: EN8, Proc: CNC Turning & Milling",
        )

        item_2 = ExtractedPOLineItem(
            item_number=2,
            part_name="Pinion Shaft 40mm",
            description="Precision Ground Pinion Shaft with Keyway",
            specification="AISI 4140 Quenched & Tempered",
            drawing_number="DWG-PS-040-REV1",
            material="AISI 4140",
            material_grade="Alloy Steel 4140",
            quantity=Decimal("50.00"),
            unit="PCS",
            gross_weight_kg=Decimal("6.200"),
            scrap_weight_kg=Decimal("0.900"),
            machining_hours=Decimal("2.25"),
            setup_hours=Decimal("0.25"),
            process="CNC Turning, Spline Hobbing & Induction Hardening",
            requested_delivery_date=date(2026, 5, 15),
            confidence=Decimal("0.96"),
            raw_text="Item 2: Pinion Shaft 40mm, Qty: 50, Mat: AISI 4140, Proc: Turning/Hobbing",
        )

        metadata = ExtractionMetadata(
            source_document=file_name,
            page_number=1,
            confidence=Decimal("0.97"),
            provider="mock",
            raw_text=(
                f"PURCHASE ORDER\n"
                f"PO Number: PO-2026-00125\n"
                f"Date: 15-Mar-2026\n"
                f"Buyer: ABC Manufacturing Pvt Ltd\n"
                f"GSTIN: 27AABCU9603R1ZM\n"
                f"Delivery: Door Delivery Bhosari Plant\n"
                f"Payment Terms: 30 Days Net from Delivery\n"
                f"Item 1: Bearing Housing, Qty: 100 PCS\n"
                f"Item 2: Pinion Shaft 40mm, Qty: 50 PCS\n"
            ),
        )

        return ExtractedPurchaseOrder(
            po_number="PO-2026-00125",
            po_date=date(2026, 3, 15),
            customer_name="ABC Manufacturing Pvt Ltd",
            customer_gstin="27AABCU9603R1ZM",
            customer_email="purchase@abcmanufacturing.com",
            customer_phone="+91-20-27123456",
            billing_address="Plot No. 45, MIDC Bhosari, Pune, Maharashtra 411026",
            shipping_address="Plot No. 45, MIDC Bhosari, Pune, Maharashtra 411026",
            currency="INR",
            payment_terms="30 Days Net from Delivery",
            delivery_terms="Door Delivery to Bhosari Plant",
            validity_reference="RFQ-2026-BPE-042",
            items=[item_1, item_2],
            metadata=metadata,
            extraction_warnings=[],
            review_flags=[],
            needs_human_review=False,
        )


class AzureDocIntelligenceExtractor(BasePOExtractor):
    """
    Azure Document Intelligence OCR & Table Extraction Provider.
    Reserved for Phase 3 integration. Network calls not implemented in this phase.
    """

    async def extract(
        self,
        document_content: bytes,
        file_name: str,
        content_type: str = "application/pdf",
    ) -> ExtractedPurchaseOrder:
        raise NotImplementedError(
            "Azure Document Intelligence integration is scheduled for Phase 3. "
            "Please use PO_EXTRACTION_PROVIDER='mock' for local development and testing."
        )


class GeminiPOExtractor(BasePOExtractor):
    """
    Gemini Multimodal PO & Line Item Extraction Provider.
    Reserved for Phase 3 integration. Network calls not implemented in this phase.
    """

    async def extract(
        self,
        document_content: bytes,
        file_name: str,
        content_type: str = "application/pdf",
    ) -> ExtractedPurchaseOrder:
        raise NotImplementedError(
            "Gemini PO Extraction integration is scheduled for Phase 3. "
            "Please use PO_EXTRACTION_PROVIDER='mock' for local development and testing."
        )


def evaluate_extraction_quality(extraction: ExtractedPurchaseOrder) -> ExtractedPurchaseOrder:
    """
    Inspects extracted PO data against quality and completeness criteria.
    Flags items or header attributes that require human review.
    Does NOT auto-approve low-confidence or ambiguous information.
    """
    warnings: List[str] = []
    flags: List[str] = []

    # Header review checks
    if not extraction.po_number or not extraction.po_number.strip():
        warnings.append("Missing purchase order number")
        flags.append("MISSING_PO_NUMBER")

    if not extraction.customer_name or not extraction.customer_name.strip():
        warnings.append("Missing customer name")
        flags.append("MISSING_CUSTOMER")

    if not extraction.po_date:
        warnings.append("Missing purchase order date")
        flags.append("MISSING_PO_DATE")

    # Line item review checks
    if not extraction.items:
        warnings.append("No line items detected in purchase order document")
        flags.append("NO_LINE_ITEMS")
    else:
        for idx, item in enumerate(extraction.items):
            item_num = item.item_number or (idx + 1)
            item_flags: List[str] = []

            if item.quantity is None or item.quantity <= Decimal("0"):
                msg = f"Item #{item_num}: Missing or invalid quantity"
                warnings.append(msg)
                item_flags.append("MISSING_QUANTITY")

            if not item.part_name or not item.part_name.strip():
                msg = f"Item #{item_num}: Missing part name"
                warnings.append(msg)
                item_flags.append("MISSING_PART_NAME")

            if item.confidence is not None and item.confidence < Decimal("0.85"):
                msg = f"Item #{item_num}: Low extraction confidence ({float(item.confidence):.2f})"
                warnings.append(msg)
                item_flags.append("LOW_CONFIDENCE")

            has_material = (item.material and item.material.strip()) or (item.material_grade and item.material_grade.strip())
            if not has_material:
                msg = f"Item #{item_num}: Ambiguous or missing material specification"
                warnings.append(msg)
                item_flags.append("AMBIGUOUS_MATERIAL")

            if not item.process or not item.process.strip():
                msg = f"Item #{item_num}: Ambiguous or missing manufacturing process"
                warnings.append(msg)
                item_flags.append("AMBIGUOUS_PROCESS")

            item.review_flags = list(set(item.review_flags + item_flags))
            flags.extend(item_flags)

    extraction.extraction_warnings = sorted(list(set(extraction.extraction_warnings + warnings)))
    extraction.review_flags = sorted(list(set(extraction.review_flags + flags)))
    extraction.needs_human_review = len(extraction.extraction_warnings) > 0 or len(extraction.review_flags) > 0

    return extraction


def convert_extraction_to_po_create(
    extraction: ExtractedPurchaseOrder,
    source_file_url: Optional[str] = None,
    source_file_name: Optional[str] = None,
    customer_id: Optional[str] = None,
) -> PurchaseOrderCreate:
    """
    Safely bridges unapproved AI extraction data into a validated application PurchaseOrderCreate.
    Applies 'REVIEW_REQUIRED' status if review flags or warnings are present.
    """
    po_date_dt = datetime.combine(extraction.po_date, datetime.min.time()) if extraction.po_date else None
    
    status = "REVIEW_REQUIRED" if extraction.needs_human_review else "UPLOADED"

    items: List[PurchaseOrderItemCreate] = []
    for idx, item in enumerate(extraction.items):
        item_qty = item.quantity if item.quantity is not None and item.quantity > Decimal("0") else Decimal("1.00")
        items.append(
            PurchaseOrderItemCreate(
                item_number=item.item_number or (idx + 1),
                part_name=item.part_name or f"Extracted Item {idx + 1}",
                description=item.description,
                specification=item.specification,
                part_number=item.drawing_number,
                quantity=item_qty,
                unit=item.unit or "PCS",
                material_grade=item.material_grade or item.material,
                gross_weight_kg=item.gross_weight_kg or Decimal("0.000"),
                net_weight_kg=item.gross_weight_kg or Decimal("0.000"),
                scrap_weight_kg=item.scrap_weight_kg or Decimal("0.000"),
                process_name=item.process,
                machining_hours=item.machining_hours or Decimal("0.00"),
                setup_hours=item.setup_hours or Decimal("0.00"),
                confidence=item.confidence or Decimal("1.00"),
            )
        )

    return PurchaseOrderCreate(
        customer_id=customer_id,
        customer_name=extraction.customer_name,
        po_number=extraction.po_number or f"DRAFT-PO-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        po_date=po_date_dt,
        delivery_date=None,
        source_file_url=source_file_url,
        source_file_name=source_file_name or extraction.metadata.source_document,
        status=status,
        extracted_data=extraction.model_dump(mode="json"),
        raw_text=extraction.metadata.raw_text,
        items=items,
    )


class POExtractionService:
    """
    Central service for document extraction, provider routing, and quality assessment.
    """

    _providers: Dict[str, Type[BasePOExtractor]] = {
        "mock": MockPOExtractor,
        "azure": AzureDocIntelligenceExtractor,
        "gemini": GeminiPOExtractor,
    }

    def __init__(self, default_provider: Optional[str] = None):
        self._default_provider = default_provider or settings.PO_EXTRACTION_PROVIDER

    def register_provider(self, name: str, provider_cls: Type[BasePOExtractor]):
        """Register a custom extraction provider."""
        self._providers[name.lower()] = provider_cls

    def get_extractor(self, provider_name: Optional[str] = None) -> BasePOExtractor:
        """Instantiate an extractor based on name or application configuration."""
        name = (provider_name or self._default_provider).lower()
        provider_cls = self._providers.get(name)
        if not provider_cls:
            raise ValueError(
                f"Unknown extraction provider '{name}'. Registered: {list(self._providers.keys())}"
            )
        return provider_cls()

    async def extract_document(
        self,
        content: bytes,
        file_name: str,
        content_type: str = "application/pdf",
        provider: Optional[str] = None,
    ) -> ExtractedPurchaseOrder:
        """
        Executes document extraction through the configured provider,
        evaluates quality, and attaches validation/review flags.
        """
        extractor = self.get_extractor(provider)
        extraction = await extractor.extract(
            document_content=content,
            file_name=file_name,
            content_type=content_type,
        )
        return evaluate_extraction_quality(extraction)


po_extraction_service = POExtractionService()
