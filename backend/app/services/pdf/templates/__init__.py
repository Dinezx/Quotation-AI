from typing import Dict, List, Any, Optional
from app.services.pdf.templates.base import BaseQuotationTemplate
from app.services.pdf.templates.classic_professional import ClassicProfessionalTemplate
from app.services.pdf.templates.modern_minimal import ModernMinimalTemplate
from app.services.pdf.templates.premium_corporate import PremiumCorporateTemplate
from app.services.pdf.templates.elegant_bordered import ElegantBorderedTemplate
from app.services.pdf.templates.industrial_bold import IndustrialBoldTemplate
from app.services.pdf.templates.modern_two_column import ModernTwoColumnTemplate
from app.services.pdf.templates.creative_modern import CreativeModernTemplate
from app.services.pdf.templates.simple_clean import SimpleCleanTemplate

TEMPLATE_REGISTRY: Dict[str, BaseQuotationTemplate] = {
    "classic_professional": ClassicProfessionalTemplate(),
    "modern_minimal": ModernMinimalTemplate(),
    "premium_corporate": PremiumCorporateTemplate(),
    "elegant_bordered": ElegantBorderedTemplate(),
    "industrial_bold": IndustrialBoldTemplate(),
    "modern_two_column": ModernTwoColumnTemplate(),
    "creative_modern": CreativeModernTemplate(),
    "simple_clean": SimpleCleanTemplate(),
}
# Aliases for alternative canonical naming
TEMPLATE_REGISTRY["industrial"] = TEMPLATE_REGISTRY["industrial_bold"]
TEMPLATE_REGISTRY["executive"] = TEMPLATE_REGISTRY["modern_two_column"]
TEMPLATE_REGISTRY["compact"] = TEMPLATE_REGISTRY["creative_modern"]
TEMPLATE_REGISTRY["modern_document"] = TEMPLATE_REGISTRY["simple_clean"]

GALLERY_METADATA: List[Dict[str, Any]] = [
    {
        "id": "classic_professional",
        "name": "Classic Professional",
        "description": "Clean corporate layout with structured header, traditional item table, and professional blue accents. Suitable for general manufacturing companies.",
        "best_for": "General manufacturing, standard RFQs, traditional corporate buyers",
        "category": "Professional",
        "preview_accent": "#1e3a8a",
        "features": ["Structured Header", "Traditional Grid Table", "Corporate Blue", "Remittance Box"],
        "default_primary_color": "#1e3a8a",
        "default_secondary_color": "#64748b",
        "default_font": "Helvetica",
    },
    {
        "id": "modern_minimal",
        "name": "Modern Minimal",
        "description": "Generous white space, understated divider rules, compact reference blocks, and restrained color palette for modern precision firms.",
        "best_for": "Precision CNC shops, cleanroom/aerospace suppliers, modern engineers",
        "category": "Minimal",
        "preview_accent": "#0f172a",
        "features": ["Generous Whitespace", "Single-Line Table Rules", "Discreet Breakdown", "Slate Palette"],
        "default_primary_color": "#0f172a",
        "default_secondary_color": "#64748b",
        "default_font": "Helvetica",
    },
    {
        "id": "premium_corporate",
        "name": "Premium Corporate",
        "description": "Prestigious full-width dark slate header banner, executive typography, and sophisticated summary module for established enterprises.",
        "best_for": "Enterprise OEMs, multi-national contracts, Tier-1 automotive",
        "category": "Professional",
        "preview_accent": "#0f172a",
        "features": ["Full-Width Dark Banner", "Carded Parties", "High-Contrast Badges", "Executive Signoff"],
        "default_primary_color": "#0f172a",
        "default_secondary_color": "#d97706",
        "default_font": "Helvetica",
    },
    {
        "id": "elegant_bordered",
        "name": "Elegant Bordered",
        "description": "Formal quotation layout with elegant double borders, structured information blocks, and traditional legal document typography.",
        "best_for": "Defense, railway, and formal tender-based commercial bids",
        "category": "Professional",
        "preview_accent": "#1e293b",
        "features": ["Formal Border Frames", "Centered Letterhead", "Serif Typography", "Contract Aesthetic"],
        "default_primary_color": "#1e293b",
        "default_secondary_color": "#64748b",
        "default_font": "Times-Roman",
    },
    {
        "id": "industrial_bold",
        "name": "Industrial",
        "description": "Strong industrial visual language with bold amber/steel accents, monospace engineering codes, and manufacturing shop-floor clarity.",
        "best_for": "Machine shops, heavy fabrication, tool & die manufacturers",
        "category": "Industrial",
        "preview_accent": "#ea580c",
        "features": ["Heavy Accent Stripe", "Drawing Specs Callout", "Monospace Pricing", "High Contrast"],
        "default_primary_color": "#1e293b",
        "default_secondary_color": "#ea580c",
        "default_font": "Helvetica",
    },
    {
        "id": "modern_two_column",
        "name": "Executive",
        "description": "Company identity and quotation information organized using side-by-side columns for highly efficient A4 space utilization.",
        "best_for": "C-suite summaries, high-value capital equipment, board-level proposals",
        "category": "Professional",
        "preview_accent": "#0369a1",
        "features": ["Side-by-Side Upper Columns", "Executive Summary", "Sky Blue Highlights", "Detailed Information"],
        "default_primary_color": "#0369a1",
        "default_secondary_color": "#64748b",
        "default_font": "Helvetica",
    },
    {
        "id": "creative_modern",
        "name": "Compact",
        "description": "Dense layout designed for quotations with many line items. High space efficiency, compact table rows, and compressed summary terms.",
        "best_for": "High item-count BOMs, multi-part assemblies, dense quotations",
        "category": "Minimal",
        "preview_accent": "#0f766e",
        "features": ["Compact Row Spacing", "Dense BOM Tabulation", "Space-Saving Terms", "Maximized A4 Efficiency"],
        "default_primary_color": "#0f766e",
        "default_secondary_color": "#0284c7",
        "default_font": "Helvetica",
    },
    {
        "id": "simple_clean",
        "name": "Modern Document",
        "description": "Contemporary SaaS-inspired quotation layout with asymmetric structure, modern card styling, and distinct metadata grouping.",
        "best_for": "Modern SaaS-oriented buyers, agile job-shops, rapid turnaround bids",
        "category": "Modern",
        "preview_accent": "#334155",
        "features": ["Contemporary Layout", "Asymmetric Metadata", "Modern Badge Cards", "Clean Minimal Footer"],
        "default_primary_color": "#334155",
        "default_secondary_color": "#64748b",
        "default_font": "Helvetica",
    },
]


def get_template_renderer(template_id: Optional[str]) -> BaseQuotationTemplate:
    t_id = (template_id or "classic_professional").lower()
    return TEMPLATE_REGISTRY.get(t_id, TEMPLATE_REGISTRY["classic_professional"])


def list_gallery_templates() -> List[Dict[str, Any]]:
    return list(GALLERY_METADATA)
