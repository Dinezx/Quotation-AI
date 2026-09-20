from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any


class BaseEmailService(ABC):
    """Abstract base class defining the contract for quotation email delivery providers."""

    @abstractmethod
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
        """
        Sends an email with optional attachments.

        :param to: Recipient email address
        :param subject: Email subject line
        :param html_body: HTML formatted body
        :param text_body: Plain text formatted body
        :param attachments: Optional list of attachment dicts: [{"filename": str, "content": bytes}]
        :param from_email: Optional sender email override
        :param from_name: Optional sender name override
        :return: Dict containing provider response, e.g. {"id": "...", "status": "SENT"}
        """
        pass
