from typing import Optional
from app.core.config import settings
from app.services.email.base import BaseEmailService
from app.services.email.resend_service import ResendEmailService
from app.services.email.fake_service import FakeEmailService

_email_service_instance: Optional[BaseEmailService] = None


def get_email_service() -> BaseEmailService:
    """Returns the globally configured email service instance."""
    global _email_service_instance
    if _email_service_instance is None:
        if settings.EMAIL_PROVIDER.lower() == "fake":
            _email_service_instance = FakeEmailService()
        else:
            _email_service_instance = ResendEmailService()
    return _email_service_instance


def set_email_service(service: Optional[BaseEmailService]) -> None:
    """Overrides the global email service instance (used primarily in test fixtures)."""
    global _email_service_instance
    _email_service_instance = service
