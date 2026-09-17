"""
AI Extraction Interfaces (Placeholders for Developer 1 Phase 3 integrations).
Architecture reserved for:
- Azure Document Intelligence (OCR / Table Layout)
- Gemini Extraction (Line Item & Material Identification)
"""
from typing import Dict, Any, Optional

class BaseExtractor:
    """Abstract interface for PO document extraction."""
    async def extract_from_file(self, file_path: str) -> Dict[str, Any]:
        raise NotImplementedError("Production OCR / Gemini extraction will be implemented in Phase 3.")
