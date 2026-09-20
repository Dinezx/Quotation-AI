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
        self.api_key = api_key or settings.RESEND_API_KEY
        self.default_from_email = from_email or settings.RESEND_FROM_EMAIL
        self.default_from_name = from_name or settings.RESEND_FROM_NAME or "Quotation AI"

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
        if not self.api_key:
            raise ValueError("Resend API key is not configured. Please set RESEND_API_KEY.")

        sender_email = from_email or self.default_from_email
        if not sender_email:
            raise ValueError("Sender email address is not configured. Please set RESEND_FROM_EMAIL.")

        sender_name = from_name or self.default_from_name
        from_header = f"{sender_name} <{sender_email}>" if sender_name else sender_email

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
            logger.error("Network failure contacting Resend API: %s", type(exc).__name__)
            raise RuntimeError(f"Email delivery network error: {type(exc).__name__}") from exc

        if response.status_code >= 400:
            try:
                err_data = response.json()
                sanitized_msg = err_data.get("message") or err_data.get("name") or "Email delivery failed"
            except Exception:
                sanitized_msg = f"HTTP {response.status_code} from email provider"

            # Clean any potential accidental key reflection
            if self.api_key and self.api_key in sanitized_msg:
                sanitized_msg = sanitized_msg.replace(self.api_key, "[REDACTED]")

            logger.error("Resend API rejected dispatch: status=%d msg=%s", response.status_code, sanitized_msg)
            raise RuntimeError(f"Resend dispatch error: {sanitized_msg}")

        try:
            res_data = response.json()
            message_id = res_data.get("id")
        except Exception:
            message_id = None

        return {
            "id": message_id,
            "status": "SENT",
        }
