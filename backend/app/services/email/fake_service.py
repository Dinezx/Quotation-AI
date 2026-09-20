from typing import List, Optional, Dict, Any
from app.services.email.base import BaseEmailService


class FakeEmailService(BaseEmailService):
    """
    In-memory email delivery provider used for hermetic, deterministic automated testing.
    Never contacts external APIs. Captures all outgoing emails for test inspection.
    """

    def __init__(self):
        self.sent_emails: List[Dict[str, Any]] = []
        self.should_fail: bool = False
        self.failure_message: str = "Simulated provider failure"

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
        if self.should_fail:
            raise RuntimeError(self.failure_message)

        email_record = {
            "to": to,
            "subject": subject,
            "html_body": html_body,
            "text_body": text_body,
            "attachments": attachments or [],
            "from_email": from_email,
            "from_name": from_name,
        }
        self.sent_emails.append(email_record)

        simulated_id = f"fake_msg_{len(self.sent_emails)}"
        return {
            "id": simulated_id,
            "status": "SENT",
        }

    def clear(self) -> None:
        self.sent_emails.clear()
        self.should_fail = False

    def get_last_sent(self) -> Optional[Dict[str, Any]]:
        return self.sent_emails[-1] if self.sent_emails else None

    def get_sent_count(self) -> int:
        return len(self.sent_emails)
