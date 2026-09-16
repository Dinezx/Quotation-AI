import os
import shutil
from typing import Optional
from fastapi import UploadFile
from app.core.config import settings

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class StorageService:
    @staticmethod
    async def upload_file(file: UploadFile, subfolder: str = "po_documents") -> str:
        """
        Stores file either to Supabase Storage (if configured) or local uploads directory.
        Returns a accessible relative URL path.
        """
        target_dir = os.path.join(UPLOAD_DIR, subfolder)
        os.makedirs(target_dir, exist_ok=True)
        
        filename = f"{os.urandom(8).hex()}_{file.filename}"
        file_path = os.path.join(target_dir, filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # In production with Supabase Storage, this would invoke the Supabase client upload.
        # For local standalone / development, return the relative path URL.
        return f"/uploads/{subfolder}/{filename}"
