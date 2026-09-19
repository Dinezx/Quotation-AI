"""
Purchase Order Semantic Normalization Providers.

Architecture:
OCR / Layout (Azure) -> Normalized Document Representation -> Semantic Normalizer (Gemini / Mock)
-> Validated ExtractedPurchaseOrder -> Quality Evaluation -> Human Review

ANTI-PRICING INVARIANT:
Gemini must NEVER extract, calculate, or output pricing or rate information.
Rate calculations and quotation pricing belong strictly to the deterministic Python pricing engine.
"""
import os
import re
import json
import logging
from abc import ABC, abstractmethod
from datetime import date, datetime
from decimal import Decimal
from typing import Dict, Any, List, Optional, Type

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
from app.services.ai.prompts.normalization_v1 import (
    NORMALIZATION_SYSTEM_INSTRUCTION_V1,
    build_normalization_user_prompt,
    PROMPT_VERSION,
)

logger = logging.getLogger(__name__)


class BasePONormalizer(ABC):
    """Abstract base class for all purchase order semantic normalizers."""

    @abstractmethod
    async def normalize(
        self,
        document_representation: Dict[str, Any],
        initial_po: ExtractedPurchaseOrder,
    ) -> ExtractedPurchaseOrder:
        """
        Semantically normalizes OCR/layout extraction candidates into a validated ExtractedPurchaseOrder.
        """
        pass


class MockPONormalizer(BasePONormalizer):
    """
    Deterministic mock normalizer for development, offline testing, and CI/CD.
    Performs validation and normalization without making any external network or LLM calls.
    """

    async def normalize(
        self,
        document_representation: Dict[str, Any],
        initial_po: ExtractedPurchaseOrder,
    ) -> ExtractedPurchaseOrder:
        logger.info("MockPONormalizer: executing deterministic normalization pass.")

        # If document representation has a simulated customer override or fix in test scenarios
        normalized_customer = document_representation.get("simulated_customer", initial_po.customer_name)

        # Clone and return clean ExtractedPurchaseOrder preserving metadata
        return initial_po.model_copy(
            update={
                "customer_name": normalized_customer,
            }
        )


class GeminiPONormalizer(BasePONormalizer):
    """
    Production Gemini Semantic Normalizer using Google's official google-genai SDK.
    Interprets document layout, resolves unlabelled headers (e.g. Buyer vs Quality clauses),
    normalizes line items, strictly preserves missing processes as null, and enforces
    the anti-pricing boundary.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        client: Optional[Any] = None,
    ):
        self.api_key = (
            api_key if api_key is not None
            else (settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY"))
        )
        self.model_name = (
            model_name if model_name is not None
            else (settings.GEMINI_MODEL or os.getenv("GEMINI_MODEL", "gemini-2.5-flash"))
        )
        self._client = client

    def _sanitize_error(self, message: str) -> str:
        """Strips any potential API key occurrences from error strings."""
        if self.api_key and self.api_key in message:
            return message.replace(self.api_key, "[REDACTED_GEMINI_KEY]")
        return message

    def _get_client(self) -> Any:
        if self._client is not None:
            return self._client

        if not self.api_key:
            raise ValueError(
                "Gemini configuration missing: GEMINI_API_KEY must be configured."
            )

        try:
            from google import genai
            self._client = genai.Client(api_key=self.api_key)
            return self._client
        except Exception as e:
            sanitized = self._sanitize_error(str(e))
            logger.error(f"Failed to initialize Gemini Client: {sanitized}")
            raise RuntimeError(f"Gemini client initialization failed: {sanitized}") from None

    async def normalize(
        self,
        document_representation: Dict[str, Any],
        initial_po: ExtractedPurchaseOrder,
    ) -> ExtractedPurchaseOrder:
        if not self.api_key:
            raise ValueError(
                "Gemini configuration missing: GEMINI_API_KEY must be configured."
            )

        if not self.model_name or not self.model_name.strip():
            raise ValueError(
                "Gemini configuration missing: GEMINI_MODEL must be configured."
            )

        client = self._get_client()

        # Build contextual prompt containing ONLY OCR text, paragraphs, tables, and candidate extraction
        candidate_dict = initial_po.model_dump(mode="json")
        user_prompt = build_normalization_user_prompt(
            document_representation=document_representation,
            candidate_extraction=candidate_dict,
        )

        from google.genai import types

        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=GeminiNormalizedPurchaseOrder,
            system_instruction=NORMALIZATION_SYSTEM_INSTRUCTION_V1,
            temperature=0.0,
        )

        try:
            response = await client.aio.models.generate_content(
                model=self.model_name,
                contents=user_prompt,
                config=config,
            )
        except TimeoutError as e:
            logger.error("Gemini normalization request timed out.")
            raise RuntimeError("Gemini normalization service timed out.") from None
        except Exception as e:
            err_type = type(e).__name__
            sanitized_msg = self._sanitize_error(str(e))
            logger.error(f"Gemini normalization API error ({err_type}): {sanitized_msg}")
            raise RuntimeError(f"Gemini normalization request failed ({err_type}): {sanitized_msg}") from None

        # Inspect raw response text
        response_text = getattr(response, "text", "") or ""
        if not response_text.strip():
            logger.warning("Gemini returned an empty response text.")
            raise RuntimeError("Gemini normalization returned an empty response.")

        # 1. Reject any forbidden pricing fields in raw JSON before parsing into schema
        try:
            raw_json = json.loads(response_text)
        except json.JSONDecodeError as e:
            logger.error(f"Gemini normalization response is not valid JSON: {e}")
            raise RuntimeError("Gemini normalization returned invalid or malformed JSON.") from None

        if isinstance(raw_json, dict):
            # Check root forbidden pricing fields
            forbidden_found = FORBIDDEN_PRICING_FIELDS.intersection(set(raw_json.keys()))
            # Check line items forbidden pricing fields
            for it in raw_json.get("items", []):
                if isinstance(it, dict):
                    forbidden_found.update(FORBIDDEN_PRICING_FIELDS.intersection(set(it.keys())))

            if forbidden_found:
                raise ValueError(
                    f"Gemini output violates anti-pricing invariant. Forbidden fields: {sorted(forbidden_found)}"
                )

        # 2. Strict Pydantic validation via GeminiNormalizedPurchaseOrder
        try:
            normalized_data = GeminiNormalizedPurchaseOrder.model_validate(raw_json)
        except Exception as e:
            logger.error(f"Schema validation error on Gemini normalized response: {e}")
            raise RuntimeError(f"Gemini normalized output failed schema validation: {e}") from None

        # 3. Map into canonical ExtractedPurchaseOrder
        return self._map_to_extracted_po(normalized_data, initial_po)

    def _map_to_extracted_po(
        self,
        normalized: GeminiNormalizedPurchaseOrder,
        initial_po: ExtractedPurchaseOrder,
    ) -> ExtractedPurchaseOrder:
        # Parse normalized date if present
        normalized_date: Optional[date] = None
        if normalized.po_date:
            try:
                normalized_date = datetime.strptime(normalized.po_date.strip(), "%Y-%m-%d").date()
            except ValueError:
                normalized_date = initial_po.po_date
        else:
            normalized_date = initial_po.po_date

        # Customer name semantic validation: ensure inspection clauses never become customer
        cust_name = normalized.customer_name.strip() if normalized.customer_name else None
        if cust_name:
            lower_cust = cust_name.lower()
            if any(p in lower_cust for p in ["inspection", "dispatch", "clause", "terms and conditions", "tpi"]):
                cust_name = None

        # Map line items
        mapped_items: List[ExtractedPOLineItem] = []
        for idx, item in enumerate(normalized.items):
            # Quantity must be Decimal and strictly positive
            qty_decimal: Optional[Decimal] = None
            if item.quantity is not None and item.quantity > 0:
                qty_decimal = Decimal(str(round(item.quantity, 4)))

            gross_wt: Optional[Decimal] = (
                Decimal(str(round(item.gross_weight_kg, 4)))
                if item.gross_weight_kg is not None and item.gross_weight_kg >= 0
                else None
            )
            scrap_wt: Optional[Decimal] = (
                Decimal(str(round(item.scrap_weight_kg, 4)))
                if item.scrap_weight_kg is not None and item.scrap_weight_kg >= 0
                else None
            )
            machining_hrs: Optional[Decimal] = (
                Decimal(str(round(item.machining_hours, 2)))
                if item.machining_hours is not None and item.machining_hours >= 0
                else None
            )
            setup_hrs: Optional[Decimal] = (
                Decimal(str(round(item.setup_hours, 2)))
                if item.setup_hours is not None and item.setup_hours >= 0
                else None
            )

            # Delivery date for line item
            item_delivery_date: Optional[date] = None
            if item.requested_delivery_date:
                try:
                    item_delivery_date = datetime.strptime(item.requested_delivery_date.strip(), "%Y-%m-%d").date()
                except ValueError:
                    pass

            # STRICT PROCESS RULE: If not explicitly provided, must remain None
            proc = item.process.strip() if item.process and item.process.strip() else None

            # Fallback to initial line item details if normalized item left part name blank
            initial_match = (
                initial_po.items[idx]
                if idx < len(initial_po.items)
                else None
            )

            part_name = item.part_name or (initial_match.part_name if initial_match else None)
            material = item.material or (initial_match.material if initial_match else None)
            material_grade = item.material_grade or (initial_match.material_grade if initial_match else None)
            spec = item.specification or (initial_match.specification if initial_match else None)
            dwg = item.drawing_number or (initial_match.drawing_number if initial_match else None)
            unit_val = item.unit or (initial_match.unit if initial_match else "PCS")

            mapped_item = ExtractedPOLineItem(
                item_number=item.item_number or (idx + 1),
                part_name=part_name,
                description=item.description or (initial_match.description if initial_match else None),
                specification=spec,
                drawing_number=dwg,
                material=material,
                material_grade=material_grade,
                quantity=qty_decimal or (initial_match.quantity if initial_match else None),
                unit=unit_val,
                gross_weight_kg=gross_wt or (initial_match.gross_weight_kg if initial_match else None),
                scrap_weight_kg=scrap_wt or (initial_match.scrap_weight_kg if initial_match else None),
                machining_hours=machining_hrs or (initial_match.machining_hours if initial_match else None),
                setup_hours=setup_hrs or (initial_match.setup_hours if initial_match else None),
                process=proc,
                requested_delivery_date=item_delivery_date or (initial_match.requested_delivery_date if initial_match else None),
                confidence=initial_match.confidence if initial_match else Decimal("0.95"),
                raw_text=initial_match.raw_text if initial_match else None,
            )
            mapped_items.append(mapped_item)

        # Retain initial items if Gemini returned no items
        if not mapped_items and initial_po.items:
            mapped_items = initial_po.items

        # Update metadata to show azure+gemini normalization
        updated_metadata = initial_po.metadata.model_copy(
            update={
                "provider": f"{initial_po.metadata.provider}+gemini",
                "confidence": initial_po.metadata.confidence or Decimal("0.95"),
            }
        )

        return ExtractedPurchaseOrder(
            po_number=normalized.po_number or initial_po.po_number,
            po_date=normalized_date,
            customer_name=cust_name or initial_po.customer_name,
            customer_gstin=normalized.customer_gstin or initial_po.customer_gstin,
            customer_email=normalized.customer_email or initial_po.customer_email,
            customer_phone=normalized.customer_phone or initial_po.customer_phone,
            billing_address=normalized.billing_address or initial_po.billing_address,
            shipping_address=normalized.shipping_address or initial_po.shipping_address,
            currency=initial_po.currency or "INR",
            payment_terms=normalized.payment_terms or initial_po.payment_terms,
            delivery_terms=normalized.delivery_terms or initial_po.delivery_terms,
            validity_reference=initial_po.validity_reference,
            items=mapped_items,
            metadata=updated_metadata,
            extraction_warnings=list(initial_po.extraction_warnings),
            review_flags=list(initial_po.review_flags),
            needs_human_review=initial_po.needs_human_review,
        )
