import os
import shutil
import logging
from typing import Optional, Dict
from fastapi import UploadFile
import httpx
from app.core.config import settings
from app.services.storage.base import BaseStorageService

logger = logging.getLogger(__name__)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class LocalStorageService(BaseStorageService):
    """Local filesystem storage implementation for offline development and local environments."""

    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = base_dir or os.path.join(UPLOAD_DIR, "storage")
        os.makedirs(self.base_dir, exist_ok=True)

    def _get_target_path(self, bucket: str, path: str) -> str:
        clean_path = path.strip("/\\")
        return os.path.join(self.base_dir, bucket, *clean_path.split("/"))

    def upload(self, bucket: str, path: str, data: bytes, content_type: str = "application/pdf") -> str:
        target_path = self._get_target_path(bucket, path)
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        with open(target_path, "wb") as f:
            f.write(data)
        return path

    def download(self, bucket: str, path: str) -> bytes:
        target_path = self._get_target_path(bucket, path)
        if not os.path.isfile(target_path):
            raise FileNotFoundError(f"Object '{path}' does not exist in bucket '{bucket}'")
        with open(target_path, "rb") as f:
            return f.read()

    def delete(self, bucket: str, path: str) -> bool:
        target_path = self._get_target_path(bucket, path)
        if os.path.isfile(target_path):
            try:
                os.remove(target_path)
                return True
            except OSError:
                return False
        return False

    def create_signed_url(self, bucket: str, path: str, expires_in: int = 3600) -> str:
        # In local storage, return a local media path with simulated expiry query parameter
        return f"/uploads/storage/{bucket}/{path}?expires_in={expires_in}"

    def exists(self, bucket: str, path: str) -> bool:
        target_path = self._get_target_path(bucket, path)
        return os.path.isfile(target_path)


class FakeStorageService(BaseStorageService):
    """In-memory storage service designed strictly for deterministic, isolated unit testing."""

    def __init__(self):
        self._store: Dict[str, bytes] = {}

    def _key(self, bucket: str, path: str) -> str:
        return f"{bucket}:{path.strip('/')}"

    def upload(self, bucket: str, path: str, data: bytes, content_type: str = "application/pdf") -> str:
        self._store[self._key(bucket, path)] = data
        return path

    def download(self, bucket: str, path: str) -> bytes:
        key = self._key(bucket, path)
        if key not in self._store:
            raise FileNotFoundError(f"Object '{path}' does not exist in bucket '{bucket}'")
        return self._store[key]

    def delete(self, bucket: str, path: str) -> bool:
        key = self._key(bucket, path)
        if key in self._store:
            del self._store[key]
            return True
        return False

    def create_signed_url(self, bucket: str, path: str, expires_in: int = 3600) -> str:
        return f"https://fake-storage.example.com/{bucket}/{path}?signature=test&expires={expires_in}"

    def exists(self, bucket: str, path: str) -> bool:
        return self._key(bucket, path) in self._store

    def clear(self):
        self._store.clear()


class SupabaseStorageService(BaseStorageService):
    """Production Supabase Storage integration using secret service-role authentication."""

    def __init__(self, base_url: Optional[str] = None, secret_key: Optional[str] = None):
        self.base_url = (base_url or settings.SUPABASE_URL).rstrip("/")
        self.secret_key = secret_key or settings.SUPABASE_SECRET_KEY

    def _headers(self, content_type: Optional[str] = None) -> Dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self.secret_key}",
            "apikey": self.secret_key,
        }
        if content_type:
            headers["Content-Type"] = content_type
        return headers

    def upload(self, bucket: str, path: str, data: bytes, content_type: str = "application/pdf") -> str:
        clean_path = path.strip("/")
        url = f"{self.base_url}/storage/v1/object/{bucket}/{clean_path}"
        headers = self._headers(content_type=content_type)
        headers["x-upsert"] = "true"

        with httpx.Client(timeout=30.0) as client:
            resp = client.post(url, content=data, headers=headers)
            if resp.status_code not in (200, 201):
                logger.error("Supabase Storage upload failed: %s - %s", resp.status_code, resp.text)
                raise RuntimeError(f"Storage upload error: {resp.text}")
        return clean_path

    def download(self, bucket: str, path: str) -> bytes:
        clean_path = path.strip("/")
        url = f"{self.base_url}/storage/v1/object/authenticated/{bucket}/{clean_path}"
        headers = self._headers()

        with httpx.Client(timeout=30.0) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code == 404:
                raise FileNotFoundError(f"Object '{path}' does not exist in Supabase bucket '{bucket}'")
            if resp.status_code != 200:
                logger.error("Supabase Storage download failed: %s - %s", resp.status_code, resp.text)
                raise RuntimeError(f"Storage download error: {resp.text}")
            return resp.content

    def delete(self, bucket: str, path: str) -> bool:
        clean_path = path.strip("/")
        url = f"{self.base_url}/storage/v1/object/{bucket}/{clean_path}"
        headers = self._headers()

        with httpx.Client(timeout=15.0) as client:
            resp = client.delete(url, headers=headers)
            return resp.status_code in (200, 204)

    def create_signed_url(self, bucket: str, path: str, expires_in: int = 3600) -> str:
        clean_path = path.strip("/")
        url = f"{self.base_url}/storage/v1/object/sign/{bucket}/{clean_path}"
        headers = self._headers(content_type="application/json")

        with httpx.Client(timeout=15.0) as client:
            resp = client.post(url, json={"expiresIn": expires_in}, headers=headers)
            if resp.status_code != 200:
                raise RuntimeError(f"Storage sign error: {resp.text}")
            data = resp.json()
            signed_suffix = data.get("signedURL", "")
            return f"{self.base_url}/storage/v1{signed_suffix}"

    def exists(self, bucket: str, path: str) -> bool:
        try:
            self.download(bucket, path)
            return True
        except (FileNotFoundError, RuntimeError):
            return False


# Singleton registry for storage service
_current_storage_service: Optional[BaseStorageService] = None


def get_storage_service() -> BaseStorageService:
    """Returns configured storage service provider (Supabase vs Local vs Injected Test Mock)."""
    global _current_storage_service
    if _current_storage_service is not None:
        return _current_storage_service

    if (
        settings.STORAGE_PROVIDER == "supabase"
        and settings.SUPABASE_URL
        and settings.SUPABASE_SECRET_KEY
    ):
        return SupabaseStorageService()
    return LocalStorageService()


def set_storage_service(service: Optional[BaseStorageService]) -> None:
    """Injects a mock or alternative storage service provider (for tests)."""
    global _current_storage_service
    _current_storage_service = service


class StorageService:
    """Legacy helper for PO file uploads into local uploads directory."""

    @staticmethod
    async def upload_file(file: UploadFile, subfolder: str = "po_documents") -> str:
        target_dir = os.path.join(UPLOAD_DIR, subfolder)
        os.makedirs(target_dir, exist_ok=True)

        filename = f"{os.urandom(8).hex()}_{file.filename}"
        file_path = os.path.join(target_dir, filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        return f"/uploads/{subfolder}/{filename}"

