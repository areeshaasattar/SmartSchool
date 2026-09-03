import hmac
import os

from fastapi import Header, HTTPException, status


def require_service_key(x_service_key: str | None = Header(default=None)) -> None:
    """Reject calls that did not originate from a trusted internal service."""
    configured_key = os.getenv("AI_SERVICE_KEY")
    if not configured_key or not x_service_key or not hmac.compare_digest(x_service_key, configured_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid service authentication is required",
        )
