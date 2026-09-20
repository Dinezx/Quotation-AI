import base64
import logging
from typing import List, Optional, Dict, Any
import httpx

from app.core.config import settings
from app.services.email.base import BaseEmailService

logger = logging.getLogger(__name__)


class ResendEmailService(BaseEmailService):
    """
    Production email delivery service using Resend REST API (https://api.resend.com/emails).
    Adheres strictly to zero-secret-leakage: API keys and auth tokens are never logged or exposed.
    """

    RESEND_API_URL = "https://api.resend.com/emails"

    def __init__(
        self,
        api_key: Optional[str] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
    ):
        self.api_key = api_key if api_key is not None else settings.RESEND_API_KEY
        self.default_from_email = from_email if from_email is not None else settings.RESEND_FROM_EMAIL
        self.default_from_name = from_name if from_name is not None else settings.RESEND_FROM_NAME

    def send_email(
        self,
        *,
        to: str,
        subject: str,
        html_body: str,
        text_body: str,
        attachments: Optional[List[Dict[str, Any]]] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not self.api_key or not str(self.api_key).strip():
            raise ValueError("Resend API key is not configured. Please set RESEND_API_KEY.")

        sender_email = from_email if from_email is not None else self.default_from_email
        if not sender_email or not str(sender_email).strip():
            raise ValueError("Sender email address is not configured. Please set RESEND_FROM_EMAIL.")

        sender_name = from_name if from_name is not None else self.default_from_name
        if not sender_name or not str(sender_name).strip():
            raise ValueError("Sender display name is not configured. Please set RESEND_FROM_NAME.")

        from_header = f"{sender_name.strip()} <{sender_email.strip()}>"

        payload: Dict[str, Any] = {
            "from": from_header,
            "to": [to],
            "subject": subject,
            "html": html_body,
            "text": text_body,
        }

        if attachments:
            formatted_attachments = []
            for att in attachments:
                raw_content = att.get("content", b"")
                if isinstance(raw_content, bytes):
                    encoded_content = base64.b64encode(raw_content).decode("utf-8")
                else:
                    encoded_content = str(raw_content)

                formatted_attachments.append({
                    "filename": att.get("filename", "quotation.pdf"),
                    "content": encoded_content,
                })
            payload["attachments"] = formatted_attachments

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "Quotation-AI/1.0",
        }

        try:
            with httpx.Client(timeout=20.0) as client:
                response = client.post(self.RESEND_API_URL, headers=headers, json=payload)
        except httpx.RequestError as exc:
            logger.error("Network error communicating with Resend API: %s", type(exc).__name__)
            raise RuntimeError("Email provider failed to send the quotation.") from None

        if response.status_code >= 400:
            logger.error("Resend API rejected dispatch: status_code=%d", response.status_code)
            raise RuntimeError("Email provider failed to send the quotation.")

        try:
            res_data = response.json()
            message_id = res_data.get("id")
        except Exception:
            message_id = None

        return {
            "id": message_id,
            "status": "SENT",
        }
