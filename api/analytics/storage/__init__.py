"""Object storage (system-design.md §5.1). analytics only reads tmp/ and
compute/, and writes compute/ for oversized message payloads (S-3)."""

from typing import Protocol

from app.config import Settings


class ObjectStore(Protocol):
    bucket: str

    async def get(self, key: str) -> bytes: ...

    async def put(self, key: str, data: bytes, content_type: str) -> None: ...


def from_settings(settings: Settings) -> ObjectStore:
    if settings.storage_driver == "s3":
        from storage.s3 import S3Store

        return S3Store(
            bucket=settings.storage_bucket,
            endpoint=settings.storage_endpoint,
            access_key=settings.storage_access_key,
            secret_key=settings.storage_secret_key,
            secure=settings.storage_use_ssl,
        )
    from storage.gcs import GCSStore

    return GCSStore(bucket=settings.storage_bucket)
