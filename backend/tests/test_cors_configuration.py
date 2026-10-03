import os
import json
import pytest
from pydantic import ValidationError
from app.core.config import Settings, DEFAULT_DEV_CORS_ORIGINS


class TestCorsConfiguration:
    """Test suite covering CORS_ORIGINS parsing and production hardening rules."""

    def test_cors_empty_list_literal_prod(self, monkeypatch):
        """Verify CORS_ORIGINS = [] (python list) is accepted in production."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        s = Settings(ENVIRONMENT="production", CORS_ORIGINS=[])
        assert s.CORS_ORIGINS == []

    def test_cors_empty_list_json_str_prod(self, monkeypatch):
        """Verify CORS_ORIGINS = '[]' (JSON string as in Azure Container Apps) is accepted in production."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        monkeypatch.setenv("CORS_ORIGINS", "[]")
        s = Settings()
        assert s.CORS_ORIGINS == []

    def test_cors_empty_string_prod(self, monkeypatch):
        """Verify CORS_ORIGINS = '' (empty string from env) safely parses as [] in production."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        monkeypatch.setenv("CORS_ORIGINS", "")
        s = Settings()
        assert s.CORS_ORIGINS == []

    def test_cors_whitespace_string_prod(self, monkeypatch):
        """Verify CORS_ORIGINS = '   ' safely parses as [] in production."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        monkeypatch.setenv("CORS_ORIGINS", "   ")
        s = Settings()
        assert s.CORS_ORIGINS == []

    def test_cors_single_origin_json_prod(self, monkeypatch):
        """Verify CORS_ORIGINS = '["https://example.com"]' is accepted in production."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        monkeypatch.setenv("CORS_ORIGINS", '["https://example.com"]')
        s = Settings()
        assert s.CORS_ORIGINS == ["https://example.com"]

    def test_cors_single_origin_list_prod(self, monkeypatch):
        """Verify CORS_ORIGINS = ["https://example.com"] (list) is accepted in production."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        s = Settings(ENVIRONMENT="production", CORS_ORIGINS=["https://example.com"])
        assert s.CORS_ORIGINS == ["https://example.com"]

    def test_cors_multiple_origins_json_prod(self, monkeypatch):
        """Verify multiple origins in a JSON array are accepted in production."""
        origins = ["https://quotationai.com", "https://app.quotationai.com", "https://portal.quotationai.com"]
        monkeypatch.setenv("ENVIRONMENT", "production")
        monkeypatch.setenv("CORS_ORIGINS", json.dumps(origins))
        s = Settings()
        assert s.CORS_ORIGINS == origins

    def test_cors_multiple_origins_comma_separated(self, monkeypatch):
        """Verify comma-separated origins string is accepted in production."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        monkeypatch.setenv("CORS_ORIGINS", "https://quotationai.com, https://app.quotationai.com")
        s = Settings()
        assert s.CORS_ORIGINS == ["https://quotationai.com", "https://app.quotationai.com"]

    def test_cors_trailing_slash_stripped(self, monkeypatch):
        """Verify trailing slashes are stripped to adhere to CORS specification."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        monkeypatch.setenv("CORS_ORIGINS", '["https://example.com/"]')
        s = Settings()
        assert s.CORS_ORIGINS == ["https://example.com"]

    def test_cors_malformed_json_unclosed_bracket(self, monkeypatch):
        """Verify malformed JSON (missing closing bracket) is safely rejected."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        monkeypatch.setenv("CORS_ORIGINS", '["https://example.com"')
        with pytest.raises(ValidationError) as exc_info:
            Settings()
        assert "Malformed JSON" in str(exc_info.value)

    def test_cors_malformed_json_bad_syntax(self, monkeypatch):
        """Verify malformed JSON syntax is safely rejected."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        monkeypatch.setenv("CORS_ORIGINS", "[invalid-json]")
        with pytest.raises(ValidationError) as exc_info:
            Settings()
        assert "Malformed JSON" in str(exc_info.value)

    def test_cors_malformed_json_single_quotes(self, monkeypatch):
        """Verify single-quoted JSON array is safely rejected as malformed JSON."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        monkeypatch.setenv("CORS_ORIGINS", "['https://example.com']")
        with pytest.raises(ValidationError) as exc_info:
            Settings()
        assert "Malformed JSON" in str(exc_info.value)

    def test_cors_json_object_rejected(self, monkeypatch):
        """Verify a JSON object instead of array is rejected."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        monkeypatch.setenv("CORS_ORIGINS", '{"origin": "https://example.com"}')
        with pytest.raises(ValidationError) as exc_info:
            Settings()
        assert "must be a list" in str(exc_info.value)

    def test_cors_invalid_origin_scheme_rejected(self, monkeypatch):
        """Verify origin without http:// or https:// is rejected."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        monkeypatch.setenv("CORS_ORIGINS", '["not-a-valid-url"]')
        with pytest.raises(ValidationError) as exc_info:
            Settings()
        assert "must start with http:// or https://" in str(exc_info.value)

    def test_cors_wildcard_rejected_in_production(self, monkeypatch):
        """Verify wildcard CORS ('*') is strictly rejected in production."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        monkeypatch.setenv("CORS_ORIGINS", '["*"]')
        with pytest.raises(ValidationError) as exc_info:
            Settings()
        assert "Wildcard CORS ('*') is strictly forbidden in production" in str(exc_info.value)

    def test_cors_wildcard_in_list_rejected_in_production(self, monkeypatch):
        """Verify wildcard CORS ('*') mixed in list is strictly rejected in production."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        monkeypatch.setenv("CORS_ORIGINS", '["https://example.com", "*"]')
        with pytest.raises(ValidationError) as exc_info:
            Settings()
        assert "Wildcard CORS ('*') is strictly forbidden in production" in str(exc_info.value)

    def test_cors_localhost_rejected_in_production(self, monkeypatch):
        """Verify localhost origin is strictly rejected in production."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        monkeypatch.setenv("CORS_ORIGINS", '["http://localhost:3000"]')
        with pytest.raises(ValidationError) as exc_info:
            Settings()
        assert "Localhost/loopback origin 'http://localhost:3000' is strictly forbidden in production" in str(exc_info.value)

    def test_cors_127_0_0_1_rejected_in_production(self, monkeypatch):
        """Verify 127.0.0.1 origin is strictly rejected in production."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        monkeypatch.setenv("CORS_ORIGINS", '["http://127.0.0.1:5173"]')
        with pytest.raises(ValidationError) as exc_info:
            Settings()
        assert "Localhost/loopback origin 'http://127.0.0.1:5173' is strictly forbidden in production" in str(exc_info.value)

    def test_cors_0_0_0_0_rejected_in_production(self, monkeypatch):
        """Verify 0.0.0.0 origin is strictly rejected in production."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        monkeypatch.setenv("CORS_ORIGINS", '["http://0.0.0.0:8000"]')
        with pytest.raises(ValidationError) as exc_info:
            Settings()
        assert "Localhost/loopback origin 'http://0.0.0.0:8000' is strictly forbidden in production" in str(exc_info.value)

    def test_cors_mixed_production_and_localhost_rejected(self, monkeypatch):
        """Verify production origin combined with localhost is rejected in production."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        monkeypatch.setenv("CORS_ORIGINS", '["https://example.com", "http://localhost:5173"]')
        with pytest.raises(ValidationError) as exc_info:
            Settings()
        assert "Localhost/loopback origin 'http://localhost:5173' is strictly forbidden in production" in str(exc_info.value)

    def test_cors_development_localhost_allowed(self, monkeypatch):
        """Verify localhost is allowed in development environment."""
        monkeypatch.setenv("ENVIRONMENT", "development")
        monkeypatch.setenv("CORS_ORIGINS", '["http://localhost:5173", "http://127.0.0.1:5173"]')
        s = Settings()
        assert s.CORS_ORIGINS == ["http://localhost:5173", "http://127.0.0.1:5173"]

    def test_cors_default_in_production_is_empty_list(self, monkeypatch):
        """Verify that when CORS_ORIGINS is unset in production, it safely defaults to []."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        monkeypatch.delenv("CORS_ORIGINS", raising=False)
        s = Settings(_env_file=None)
        assert s.CORS_ORIGINS == []

    def test_cors_default_in_development_has_dev_origins(self, monkeypatch):
        """Verify that when CORS_ORIGINS is unset in development, it defaults to dev origins."""
        monkeypatch.setenv("ENVIRONMENT", "development")
        monkeypatch.delenv("CORS_ORIGINS", raising=False)
        s = Settings(_env_file=None)
        assert s.CORS_ORIGINS == DEFAULT_DEV_CORS_ORIGINS
