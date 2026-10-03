import os
import re
from typing import Optional, Tuple
from fastapi import HTTPException, status

MAX_PO_FILE_BYTES = 25 * 1024 * 1024  # 25 MB
MAX_LOGO_FILE_BYTES = 5 * 1024 * 1024  # 5 MB

# Magic Byte Signatures
MAGIC_BYTES = {
    "pdf": [b"%PDF-"],
    "png": [b"\x89PNG\r\n\x1a\n"],
    "jpeg": [b"\xff\xd8\xff"],
    "tiff": [b"II*\x00", b"MM\x00*"],
    "webp": [b"RIFF"],
}

# Blocked dangerous magic bytes (executables, scripts, java bytecode, dangerous archives)
BLOCKED_MAGIC_BYTES = [
    (b"MZ", "Windows executable (EXE/DLL)"),
    (b"\x7fELF", "Linux executable (ELF)"),
    (b"#!", "Shell script"),
    (b"\xca\xfe\xba\xbe", "Java bytecode class"),
    (b"PK\x03\x04", "Compressed archive (ZIP/JAR/Office macro)"),
    (b"Rar!\x1a\x07", "RAR archive"),
    (b"7z\xbc\xaf\x27\x1c", "7-Zip archive"),
]

def sanitize_filename(filename: Optional[str], default_name: str = "document.pdf") -> str:
    """
    Sanitizes user-provided filenames to prevent path traversal, null bytes,
    and control characters.
    """
    if not filename:
        return default_name

    # Extract base name only (strips any path components)
    clean = os.path.basename(filename).strip()

    # Remove null bytes and non-printable ASCII
    clean = re.sub(r'[\x00-\x1f\x7f]', '', clean)

    # Replace path traversal sequences and dangerous characters
    clean = re.sub(r'\.\.+[/\\]', '', clean)
    clean = re.sub(r'[^a-zA-Z0-9_.\-\s]', '_', clean)

    # Trim length
    if len(clean) > 100:
        name_part, ext = os.path.splitext(clean)
        clean = f"{name_part[:90]}{ext}"

    return clean or default_name

def validate_file_content(
    content: bytes,
    declared_content_type: str = "application/pdf",
    allowed_formats: Tuple[str, ...] = ("pdf", "png", "jpeg", "tiff"),
    max_bytes: int = MAX_PO_FILE_BYTES,
    filename: Optional[str] = None,
    allowed_types: Optional[list] = None,
) -> str:
    """
    Validates uploaded file payload against magic-byte signatures, size constraints,
    and prohibited executable formats. Returns the detected canonical format string.
    """
    if allowed_types:
        mapped = []
        for t in allowed_types:
            t_lower = t.lower()
            if "pdf" in t_lower:
                mapped.append("pdf")
            elif "png" in t_lower:
                mapped.append("png")
            elif "jpeg" in t_lower or "jpg" in t_lower:
                mapped.append("jpeg")
            elif "tiff" in t_lower or "tif" in t_lower:
                mapped.append("tiff")
            elif "webp" in t_lower:
                mapped.append("webp")
            elif "svg" in t_lower:
                mapped.append("svg")
            else:
                mapped.append(t_lower)
        allowed_formats = tuple(mapped)

    if not content or len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if len(content) > max_bytes:
        max_mb = max_bytes // (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {max_mb} MB.",
        )

    # Check for blocked executable payloads regardless of declared format
    for sig, desc in BLOCKED_MAGIC_BYTES:
        if content.startswith(sig):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Uploaded file rejected: Dangerous executable or archive format detected ({desc}).",
            )

    # Magic byte signature match
    detected_format = None
    for fmt in allowed_formats:
        signatures = MAGIC_BYTES.get(fmt, [])
        for sig in signatures:
            if content.startswith(sig):
                detected_format = fmt
                break
        if detected_format:
            break

    # SVG special handling (XML-based)
    if not detected_format and "svg" in allowed_formats:
        head = content[:512].strip().lower()
        if (head.startswith(b"<?xml") or head.startswith(b"<svg")) and b"<svg" in head:
            # Check for embedded script tags in SVG
            if b"<script" in head or b"javascript:" in head or b"onload=" in head or b"onerror=" in head:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="SVG file rejected: Embedded scripts or executable event handlers detected.",
                )
            detected_format = "svg"

    if not detected_format:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"File content does not match allowed format signatures ({', '.join(allowed_formats).upper()}). "
                f"Declared MIME type '{declared_content_type}' could not be verified."
            ),
        )

    return detected_format
