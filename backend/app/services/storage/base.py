from abc import ABC, abstractmethod
from typing import Optional

class BaseStorageService(ABC):
    """
    Abstract storage service interface for PDF and document persistence.
    Decouples storage provider implementations (Supabase Storage vs Local/Fake Storage).
    """

    @abstractmethod
    def upload(self, bucket: str, path: str, data: bytes, content_type: str = "application/pdf") -> str:
        """
        Upload binary data to storage bucket at specified path.
        Returns the stored storage path/key.
        """
        pass

    @abstractmethod
    def download(self, bucket: str, path: str) -> bytes:
        """
        Download binary data from storage bucket at specified path.
        Raises FileNotFoundError if object does not exist.
        """
        pass

    @abstractmethod
    def delete(self, bucket: str, path: str) -> bool:
        """
        Deletes object from storage bucket.
        Returns True if successful, False otherwise.
        """
        pass

    @abstractmethod
    def create_signed_url(self, bucket: str, path: str, expires_in: int = 3600) -> str:
        """
        Generates a secure, short-lived signed URL for downloading the stored object.
        """
        pass

    @abstractmethod
    def exists(self, bucket: str, path: str) -> bool:
        """
        Checks whether object exists in storage bucket.
        """
        pass
