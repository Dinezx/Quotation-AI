"""
Purchase Order Semantic Normalization Prompt (Version 1).
Version: v1.0.0
Purpose: System prompt and context builder for Gemini semantic normalization.
"""
from typing import Dict, Any, Optional
import json

PROMPT_VERSION = "v1.0.0"

NORMALIZATION_SYSTEM_INSTRUCTION_V1 = """You are an expert purchase-order document normalization system for an industrial manufacturing quotation platform.

Your task is to extract and normalize factual, structured information explicitly supported by the supplied purchase-order OCR and layout representation.

CRITICAL ARCHITECTURAL RULES:

1. CUSTOMER / BUYER IDENTIFICATION:
   - Identify the exact legal or commercial name of the Customer / Buyer (the client organization purchasing the components and issuing the PO).
   - In industrial purchase orders, the unlabelled company header, logo, or letterhead at the top of the document is the Customer / Buyer issuing the order.
   - Distinguish carefully between:
     * Customer / Buyer: The client organization issuing the purchase order.
     * Supplier / Vendor: The machining manufacturer receiving the order (e.g. Bharat Precision Engineers).
     * Delivery / Consignee location: The destination plant address.
     * Inspection Instructions: Quality assurance clauses and inspection terms.
   - PHRASES LIKE "inspection before dispatch", "third party inspection", "QAP approval", "TPI by customer", OR SIMILAR ARE INSPECTION INSTRUCTIONS OR QUALITY CLAUSES, NEVER THE CUSTOMER NAME.
   - Infer the customer organization based on document context, layout hierarchy, and surrounding contact/GSTIN details. Do not confuse it with body text, notes, or clauses.

2. LINE ITEM EXTRACTION & NORMALIZATION:
   - Extract and normalize item numbers, part descriptions, specifications, drawing numbers, materials, quantities, and units.
   - Quantities must be strictly numeric positive numbers.
   - Cleanly extract engineering specifications and drawing revisions.

3. MANUFACTURING PROCESSES (STRICT INVARIANT):
   - DO NOT invent, guess, hallucinate, or infer manufacturing processes (such as "CNC Turning", "VMC Milling", "Surface Grinding", "Heat Treatment", "Induction Hardening") unless they are EXPLICITLY stated in the document text or table.
   - If a manufacturing process is NOT explicitly stated in the purchase order, set process = null.
   - Missing information must remain null.

4. ANTI-PRICING INVARIANT (CRITICAL):
   - NEVER calculate, infer, estimate, or output any pricing or rate information.
   - DO NOT output material rates, process rates, unit prices, selling prices, discounts, overheads, profit, taxes, GST, or quotation totals.
   - Pricing is exclusively handled by a downstream deterministic calculation engine.

5. UNCERTAINTY & MISSING VALUES:
   - When evidence is insufficient, missing, or ambiguous, return null.
   - Do not invent missing values.
"""


def build_normalization_user_prompt(
    document_representation: Dict[str, Any],
    candidate_extraction: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Constructs the contextual user prompt for Gemini normalization.
    Passes ONLY OCR text, paragraphs, tables, detected headers, and candidate extraction.
    NEVER includes company rate cards, pricing formulas, or financial settings.
    """
    parts = [
        "Please semantically normalize the following purchase order document data.",
        "",
        "--- DOCUMENT METADATA ---",
        f"File Name: {document_representation.get('file_name', 'Unknown')}",
        f"Pages: {document_representation.get('page_count', 1)}",
        "",
    ]

    # Include key-value pairs if detected by layout OCR
    kv_pairs = document_representation.get("key_value_pairs", [])
    if kv_pairs:
        parts.append("--- DETECTED KEY-VALUE PAIRS ---")
        for kv in kv_pairs[:30]:
            k = kv.get("key", "")
            v = kv.get("value", "")
            if k or v:
                parts.append(f"• {k}: {v}")
        parts.append("")

    # Include structured tables (without forbidden pricing columns)
    tables = document_representation.get("tables", [])
    if tables:
        parts.append("--- DETECTED TABLES ---")
        for t_idx, tbl in enumerate(tables):
            parts.append(f"Table #{t_idx + 1}:")
            if isinstance(tbl, list):
                for row in tbl:
                    parts.append(f"  {json.dumps(row)}")
            elif isinstance(tbl, dict):
                parts.append(f"  {json.dumps(tbl)}")
        parts.append("")

    # Include candidate extraction from OCR parser if available
    if candidate_extraction:
        # Strip any pricing fields just in case
        safe_candidate = {
            k: v for k, v in candidate_extraction.items()
            if not any(p in k.lower() for p in ["price", "rate", "cost", "tax", "gst", "total", "amount"])
        }
        parts.append("--- INITIAL CANDIDATE EXTRACTION ---")
        parts.append(json.dumps(safe_candidate, default=str, indent=2))
        parts.append("")

    # Include full OCR text or paragraphs
    full_text = document_representation.get("full_text")
    if full_text:
        parts.append("--- DOCUMENT OCR TEXT ---")
        parts.append(full_text[:12000])
    else:
        paragraphs = document_representation.get("paragraphs", [])
        if paragraphs:
            parts.append("--- DOCUMENT PARAGRAPHS ---")
            for p in paragraphs[:50]:
                parts.append(f"- {p}")

    return "\n".join(parts)
