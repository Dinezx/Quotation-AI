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
import os
import re
import asyncio
from abc import ABC, abstractmethod
from datetime import date, datetime
from decimal import Decimal
from typing import Dict, Any, List, Optional, Type
import logging

from azure.core.credentials import AzureKeyCredential
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.core.exceptions import (
    ClientAuthenticationError,
    HttpResponseError,
    ServiceRequestError,
    ServiceResponseError,
)

from app.core.config import settings
from app.schemas.extraction import (
    ExtractedPurchaseOrder,
    ExtractedPOLineItem,
    ExtractionMetadata,
    FORBIDDEN_PRICING_FIELDS,
)
from app.schemas.purchase_order import (
    PurchaseOrderCreate,
    PurchaseOrderItemCreate,
)
from app.services.ai.normalizer import (
    BasePONormalizer,
    MockPONormalizer,
    GeminiPONormalizer,
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

    def __init__(self):
        self.last_raw_result: Optional[Dict[str, Any]] = None

    def get_last_raw_result(self) -> Optional[Dict[str, Any]]:
        """Returns the safe normalized internal representation of the last extraction."""
        return self.last_raw_result

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

        extracted_po = ExtractedPurchaseOrder(
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

        self.last_raw_result = {
            "file_name": file_name,
            "page_count": 1,
            "paragraph_count": 8,
            "table_count": 1,
            "key_value_pair_count": 6,
            "line_count": 10,
            "has_content": True,
            "full_text": metadata.raw_text,
            "paragraphs": [
                "PURCHASE ORDER",
                "PO Number: PO-2026-00125",
                "Buyer: ABC Manufacturing Pvt Ltd",
                "Item 1: Bearing Housing, Qty: 100 PCS",
                "Item 2: Pinion Shaft 40mm, Qty: 50 PCS",
            ],
            "key_value_pairs": [
                {"key": "PO Number", "value": "PO-2026-00125"},
                {"key": "Buyer", "value": "ABC Manufacturing Pvt Ltd"},
                {"key": "GSTIN", "value": "27AABCU9603R1ZM"},
            ],
            "tables": [
                [
                    ["Item", "Description", "Material", "Qty", "UOM"],
                    ["1", "Bearing Housing", "EN8", "100", "PCS"],
                    ["2", "Pinion Shaft 40mm", "AISI 4140", "50", "PCS"],
                ]
            ],
        }

        return extracted_po


class AzureDocIntelligenceExtractor(BasePOExtractor):
    """
    Official Azure AI Document Intelligence Provider.
    Extracts text, layout, and structured tables from PO documents using the prebuilt-layout model.
    Enforces strict anti-pricing boundaries: zero pricing/rate fields are ever extracted.
    """

    ALLOWED_MIME_TYPES = {
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/tiff",
    }

    def __init__(
        self,
        endpoint: Optional[str] = None,
        key: Optional[str] = None,
        client: Optional[Any] = None,
        model_id: str = "prebuilt-layout",
    ):
        self.endpoint = (
            endpoint if endpoint is not None
            else (settings.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT or os.getenv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT"))
        )
        self.key = (
            key if key is not None
            else (settings.AZURE_DOCUMENT_INTELLIGENCE_KEY or os.getenv("AZURE_DOCUMENT_INTELLIGENCE_KEY"))
        )
        self.model_id = model_id
        self._client = client
        self.last_raw_result: Optional[Dict[str, Any]] = None

    def get_last_raw_result(self) -> Optional[Dict[str, Any]]:
        """Returns the safe normalized internal representation of the last Azure extraction."""
        return self.last_raw_result

    def _get_client(self) -> DocumentIntelligenceClient:
        if self._client is not None:
            return self._client

        if not self.endpoint or not self.key:
            raise ValueError(
                "Azure Document Intelligence configuration missing: "
                "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and AZURE_DOCUMENT_INTELLIGENCE_KEY must be configured."
            )

        credential = AzureKeyCredential(self.key)
        self._client = DocumentIntelligenceClient(endpoint=self.endpoint, credential=credential)
        return self._client

    async def extract(
        self,
        document_content: bytes,
        file_name: str,
        content_type: str = "application/pdf",
    ) -> ExtractedPurchaseOrder:
        if content_type not in self.ALLOWED_MIME_TYPES:
            raise ValueError(
                f"Unsupported document MIME type '{content_type}'. Allowed types: {', '.join(sorted(self.ALLOWED_MIME_TYPES))}"
            )

        if not document_content:
            raise ValueError("Document content cannot be empty.")

        client = self._get_client()

        def _analyze():
            poller = client.begin_analyze_document(
                model_id=self.model_id,
                body=document_content,
                content_type="application/octet-stream",
            )
            return poller.result()

        try:
            result = await asyncio.to_thread(_analyze)
        except ClientAuthenticationError as e:
            logger.error("Azure Document Intelligence authentication failed.")
            raise RuntimeError("Azure Document Intelligence authentication failed. Verify configured credentials.") from e
        except HttpResponseError as e:
            status_code = getattr(e, "status_code", "unknown")
            logger.error(f"Azure Document Intelligence HTTP request error: status={status_code}")
            err_msg = getattr(e, "message", "") or "Request failed"
            raise RuntimeError(f"Azure Document Intelligence request failed: {err_msg}") from e
        except (ServiceRequestError, ServiceResponseError, TimeoutError) as e:
            logger.error("Azure Document Intelligence connection or timeout error.")
            raise RuntimeError("Azure Document Intelligence service timed out or was unreachable.") from e
        except Exception as e:
            logger.error(f"Unexpected error during Azure Document Intelligence extraction: {type(e).__name__}")
            raise RuntimeError(f"Azure Document Intelligence extraction error: {type(e).__name__}") from e

        return self._parse_analyze_result(result=result, file_name=file_name)

    def _parse_analyze_result(self, result: Any, file_name: str) -> ExtractedPurchaseOrder:
        if result is None:
            self.last_raw_result = {"file_name": file_name, "status": "empty_or_none"}
            return ExtractedPurchaseOrder(
                extraction_warnings=["Empty OCR/layout result returned from Azure Document Intelligence"],
                needs_human_review=True,
            )

        try:
            full_text = getattr(result, "content", "") or ""
            pages = getattr(result, "pages", []) or []
            paragraphs = getattr(result, "paragraphs", []) or []
            tables = getattr(result, "tables", []) or []
            key_value_pairs = getattr(result, "key_value_pairs", []) or []
        except Exception as e:
            raise RuntimeError("Malformed response received from Azure Document Intelligence.") from e

        # Extract lines across all pages
        lines: List[Any] = []
        for page in pages:
            lines.extend(getattr(page, "lines", []) or [])

        # Format tables for safe representation (stripping pricing columns)
        serialized_tables: List[List[List[str]]] = []
        for table in tables:
            cells = getattr(table, "cells", []) or []
            rows_by_idx: Dict[int, Dict[int, str]] = {}
            for cell in cells:
                r_i = getattr(cell, "row_index", 0)
                c_i = getattr(cell, "column_index", 0)
                text = (getattr(cell, "content", "") or "").strip()
                if r_i not in rows_by_idx:
                    rows_by_idx[r_i] = {}
                rows_by_idx[r_i][c_i] = text
            table_matrix: List[List[str]] = []
            for r_i in sorted(rows_by_idx.keys()):
                row_vals = [rows_by_idx[r_i][c_i] for c_i in sorted(rows_by_idx[r_i].keys())]
                table_matrix.append(row_vals)
            if table_matrix:
                serialized_tables.append(table_matrix)

        # Preserve safe normalized internal representation (no secrets/credentials)
        self.last_raw_result = {
            "file_name": file_name,
            "page_count": len(pages) if pages else 1,
            "paragraph_count": len(paragraphs),
            "table_count": len(tables),
            "key_value_pair_count": len(key_value_pairs),
            "line_count": len(lines),
            "has_content": bool(full_text.strip()),
            "full_text": full_text[:12000] if full_text else "",
            "paragraphs": [
                getattr(p, "content", "")
                for p in paragraphs[:50]
                if getattr(p, "content", None)
            ],
            "key_value_pairs": [
                {
                    "key": (getattr(kv.key, "content", "") or "").strip(),
                    "value": (getattr(kv.value, "content", "") or "").strip(),
                }
                for kv in key_value_pairs
                if getattr(kv, "key", None) and getattr(kv, "value", None)
            ],
            "tables": serialized_tables,
        }

        if not full_text.strip() and not tables:
            return ExtractedPurchaseOrder(
                extraction_warnings=["Empty OCR/layout result returned from Azure Document Intelligence"],
                needs_human_review=True,
            )

        # 1. Document Confidence & Page count
        page_count = len(pages) if pages else 1
        confidences: List[Decimal] = []
        try:
            for page in pages:
                for word in getattr(page, "words", []) or []:
                    if hasattr(word, "confidence") and word.confidence is not None:
                        confidences.append(Decimal(str(round(word.confidence, 4))))
        except Exception:
            pass

        doc_confidence = (
            round(sum(confidences) / len(confidences), 2)
            if confidences
            else Decimal("0.95")
        )

        # 2. Header Discovery via Key-Value Pairs and Regex
        po_number: Optional[str] = None
        po_date_val: Optional[date] = None
        customer_name: Optional[str] = None
        customer_gstin: Optional[str] = None
        payment_terms: Optional[str] = None
        delivery_terms: Optional[str] = None
        customer_email: Optional[str] = None
        customer_phone: Optional[str] = None

        # Check key_value_pairs from layout analysis if present
        try:
            for kv in key_value_pairs:
                k_text = (getattr(kv.key, "content", "") or "").strip().lower()
                v_text = (getattr(kv.value, "content", "") or "").strip()
                if not v_text:
                    continue
                if not po_number and any(x in k_text for x in ["po number", "po no", "p.o.", "order no", "purchase order"]):
                    po_number = v_text
                elif not po_date_val and "date" in k_text and not any(x in k_text for x in ["delivery", "valid", "due"]):
                    po_date_val = self._parse_date(v_text)
                elif not customer_name and any(x in k_text for x in ["customer", "buyer", "company", "vendor to", "bill to"]):
                    customer_name = v_text
                elif not customer_gstin and "gst" in k_text:
                    customer_gstin = v_text
                elif not payment_terms and "payment" in k_text:
                    payment_terms = v_text
                elif not delivery_terms and "delivery" in k_text and "term" in k_text:
                    delivery_terms = v_text
        except Exception:
            pass

        # Fallback text regex for header fields
        if not po_number:
            match = re.search(r"(?i)(?:PO|P\.O\.|Purchase\s*Order|Order)\s*(?:Number|No\.?|#)\s*[:\-]?\s*([A-Za-z0-9\-_/]+)", full_text)
            if not match:
                match = re.search(r"(?i)(?:PO|P\.O\.|Purchase\s*Order|Order)\s*[:\-]\s*([A-Za-z0-9\-_/]+)", full_text)
            if match:
                candidate = match.group(1).strip()
                if candidate.lower() not in ["order", "date", "no", "number"]:
                    po_number = candidate

        if not po_date_val:
            match = re.search(r"(?i)(?:PO\s*Date|Date\s*of\s*PO|Order\s*Date|Date)\s*[:\-]?\s*(\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4}|\d{2}-[A-Za-z]{3}-\d{4})", full_text)
            if match:
                po_date_val = self._parse_date(match.group(1))

        if not customer_name:
            match = re.search(r"(?i)(?:Buyer|Customer|Bill\s*To|Purchaser)\s*[:\-]?\s*([^\n\r]+)", full_text)
            if match:
                candidate = match.group(1).strip()
                if len(candidate) > 2 and not candidate.lower().startswith("gst"):
                    customer_name = candidate

        if not customer_gstin:
            match = re.search(r"\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b", full_text)
            if match:
                customer_gstin = match.group(1).strip()

        # 3. Table & Line Item Discovery
        items: List[ExtractedPOLineItem] = []
        try:
            for table in tables:
                table_items = self._parse_table_to_line_items(table)
                items.extend(table_items)
        except Exception as e:
            logger.warning(f"Error parsing tables from Azure Document Intelligence result: {e}")

        metadata = ExtractionMetadata(
            source_document=file_name,
            page_number=page_count,
            confidence=doc_confidence,
            provider="azure",
            raw_text=full_text[:4000] if full_text else None,
        )

        extracted_po = ExtractedPurchaseOrder(
            po_number=po_number,
            po_date=po_date_val,
            customer_name=customer_name,
            customer_gstin=customer_gstin,
            customer_email=customer_email,
            customer_phone=customer_phone,
            currency="INR",
            payment_terms=payment_terms,
            delivery_terms=delivery_terms,
            items=items,
            metadata=metadata,
        )

        return evaluate_extraction_quality(extracted_po)

    def _parse_table_to_line_items(self, table: Any) -> List[ExtractedPOLineItem]:
        cells = getattr(table, "cells", []) or []
        if not cells:
            return []

        # Group cells by row index
        rows_by_idx: Dict[int, Dict[int, Any]] = {}
        for cell in cells:
            r_idx = getattr(cell, "row_index", 0)
            c_idx = getattr(cell, "column_index", 0)
            if r_idx not in rows_by_idx:
                rows_by_idx[r_idx] = {}
            rows_by_idx[r_idx][c_idx] = cell

        sorted_row_indices = sorted(rows_by_idx.keys())
        if not sorted_row_indices:
            return []

        # Header row inspection
        header_row_idx = sorted_row_indices[0]
        header_cells = rows_by_idx[header_row_idx]
        col_mapping: Dict[int, str] = {}

        for col_idx, cell in header_cells.items():
            content = (getattr(cell, "content", "") or "").strip().lower()

            # CRITICAL ANTI-PRICING: Discard any pricing/commercial column
            if any(p in content for p in [
                "rate", "price", "unit price", "amount", "total", "tax", "gst",
                "discount", "margin", "cost", "value", "final price", "selling price",
                "cgst", "sgst", "igst", "overhead", "profit"
            ]):
                col_mapping[col_idx] = "FORBIDDEN_PRICING"
                continue

            if any(x in content for x in ["item no", "sl no", "sr no", "item #", "s.no", "pos", "line"]):
                col_mapping[col_idx] = "item_number"
            elif any(x in content for x in ["part name", "description", "item description", "part description", "material description", "item"]):
                col_mapping[col_idx] = "part_name"
            elif any(x in content for x in ["drawing", "dwg"]):
                col_mapping[col_idx] = "drawing_number"
            elif any(x in content for x in ["specification", "spec"]):
                col_mapping[col_idx] = "specification"
            elif "grade" in content:
                col_mapping[col_idx] = "material_grade"
            elif "material" in content:
                col_mapping[col_idx] = "material"
            elif any(x in content for x in ["qty", "quantity", "nos"]):
                col_mapping[col_idx] = "quantity"
            elif any(x in content for x in ["uom", "unit"]):
                col_mapping[col_idx] = "unit"
            elif "gross" in content:
                col_mapping[col_idx] = "gross_weight_kg"
            elif "scrap" in content:
                col_mapping[col_idx] = "scrap_weight_kg"
            elif "setup" in content:
                col_mapping[col_idx] = "setup_hours"
            elif any(x in content for x in ["machining", "hours", "hrs"]):
                col_mapping[col_idx] = "machining_hours"
            elif any(x in content for x in ["process", "operation"]):
                col_mapping[col_idx] = "process"
            elif any(x in content for x in ["delivery", "due date"]):
                col_mapping[col_idx] = "requested_delivery_date"

        items: List[ExtractedPOLineItem] = []
        for r_idx in sorted_row_indices[1:]:
            row_cells = rows_by_idx[r_idx]
            item_data: Dict[str, Any] = {}
            confidences: List[Decimal] = []

            for col_idx, cell in row_cells.items():
                target_field = col_mapping.get(col_idx)
                if not target_field or target_field == "FORBIDDEN_PRICING" or target_field in FORBIDDEN_PRICING_FIELDS:
                    continue

                cell_text = (getattr(cell, "content", "") or "").strip()
                if hasattr(cell, "confidence") and cell.confidence is not None:
                    confidences.append(Decimal(str(round(cell.confidence, 4))))

                if target_field == "item_number":
                    try:
                        digits = re.sub(r"[^\d]", "", cell_text)
                        if digits:
                            item_data["item_number"] = int(digits)
                    except ValueError:
                        pass
                elif target_field == "quantity":
                    try:
                        clean_num = re.sub(r"[^\d.]", "", cell_text)
                        if clean_num:
                            qty = Decimal(clean_num)
                            if qty > Decimal("0"):
                                item_data["quantity"] = qty
                    except Exception:
                        pass
                elif target_field in ["gross_weight_kg", "scrap_weight_kg", "machining_hours", "setup_hours"]:
                    try:
                        clean_num = re.sub(r"[^\d.]", "", cell_text)
                        if clean_num:
                            val = Decimal(clean_num)
                            if val >= Decimal("0"):
                                item_data[target_field] = val
                    except Exception:
                        pass
                elif target_field == "requested_delivery_date":
                    dt = self._parse_date(cell_text)
                    if dt:
                        item_data["requested_delivery_date"] = dt
                else:
                    if cell_text:
                        item_data[target_field] = cell_text

            if item_data.get("part_name") or item_data.get("quantity") or item_data.get("material"):
                if "item_number" not in item_data:
                    item_data["item_number"] = len(items) + 1
                row_confidence = (
                    round(sum(confidences) / len(confidences), 2)
                    if confidences
                    else Decimal("0.95")
                )
                item_data["confidence"] = row_confidence
                try:
                    line_item = ExtractedPOLineItem(**item_data)
                    items.append(line_item)
                except Exception as e:
                    logger.warning(f"Validation error on extracted line item row {r_idx}: {e}")

        return items

    @staticmethod
    def _parse_date(date_str: str) -> Optional[date]:
        if not date_str:
            return None
        cleaned = date_str.strip()
        match = re.search(r"(\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4}|\d{2}-[A-Za-z]{3}-\d{4})", cleaned)
        if match:
            candidate = match.group(1).strip()
        else:
            candidate = cleaned

        formats = [
            "%Y-%m-%d",
            "%d-%m-%Y",
            "%d/%m/%Y",
            "%m/%d/%Y",
            "%d-%b-%Y",
            "%d %b %Y",
            "%d-%B-%Y",
            "%d %B %Y",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(candidate, fmt).date()
            except ValueError:
                continue
        return None


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

            item.review_flags = sorted(list(set(item.review_flags + item_flags)))
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
    Central service for document extraction, provider routing,
    semantic normalization, and quality assessment.
    """

    _providers: Dict[str, Type[BasePOExtractor]] = {
        "mock": MockPOExtractor,
        "azure": AzureDocIntelligenceExtractor,
        "gemini": GeminiPOExtractor,
    }

    _normalizers: Dict[str, Type[BasePONormalizer]] = {
        "mock": MockPONormalizer,
        "gemini": GeminiPONormalizer,
    }

    def __init__(
        self,
        default_provider: Optional[str] = None,
        default_normalizer: Optional[str] = None,
    ):
        self._default_provider = default_provider or settings.PO_EXTRACTION_PROVIDER
        self._default_normalizer = default_normalizer or settings.PO_NORMALIZATION_PROVIDER

    def register_provider(self, name: str, provider_cls: Type[BasePOExtractor]):
        """Register a custom extraction provider."""
        self._providers[name.lower()] = provider_cls

    def register_normalizer(self, name: str, normalizer_cls: Type[BasePONormalizer]):
        """Register a custom normalizer provider."""
        self._normalizers[name.lower()] = normalizer_cls

    def get_extractor(self, provider_name: Optional[str] = None) -> BasePOExtractor:
        """Instantiate an extractor based on name or application configuration."""
        name = (provider_name or self._default_provider).lower()
        provider_cls = self._providers.get(name)
        if not provider_cls:
            raise ValueError(
                f"Unknown extraction provider '{name}'. Registered: {list(self._providers.keys())}"
            )
        return provider_cls()

    def get_normalizer(self, normalizer_name: Optional[str] = None) -> BasePONormalizer:
        """Instantiate a normalizer based on name or application configuration."""
        name = (normalizer_name or self._default_normalizer).lower()
        normalizer_cls = self._normalizers.get(name)
        if not normalizer_cls:
            raise ValueError(
                f"Unknown normalization provider '{name}'. Registered: {list(self._normalizers.keys())}"
            )
        return normalizer_cls()

    async def extract_document(
        self,
        content: bytes,
        file_name: str,
        content_type: str = "application/pdf",
        provider: Optional[str] = None,
        normalizer_provider: Optional[str] = None,
    ) -> ExtractedPurchaseOrder:
        """
        Executes document extraction through the configured provider,
        runs semantic normalization (e.g. Gemini) if configured,
        evaluates quality, and attaches validation/review flags.
        """
        extractor = self.get_extractor(provider)
        initial_po = await extractor.extract(
            document_content=content,
            file_name=file_name,
            content_type=content_type,
        )

        norm_name = normalizer_provider or self._default_normalizer
        if norm_name and norm_name.lower() != "none":
            normalizer = self.get_normalizer(norm_name)
            doc_rep = (
                extractor.get_last_raw_result()
                if hasattr(extractor, "get_last_raw_result")
                else {}
            ) or {
                "file_name": file_name,
                "full_text": initial_po.metadata.raw_text,
            }
            normalized_po = await normalizer.normalize(
                document_representation=doc_rep,
                initial_po=initial_po,
            )
            return evaluate_extraction_quality(normalized_po)

        return evaluate_extraction_quality(initial_po)


po_extraction_service = POExtractionService()
