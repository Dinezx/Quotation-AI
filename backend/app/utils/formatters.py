"""Common utility helpers for formatting and currency."""
from decimal import Decimal, ROUND_HALF_UP

def format_inr(amount: Decimal) -> str:
    """Formats a decimal amount as Indian Rupees."""
    return f"₹{amount:,.2f}"
