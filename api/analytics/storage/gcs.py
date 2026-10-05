import asyncio

from google.cloud import storage


class GCSStore:
    """Cloud Storage via Application Default Credentials (Cloud Run's service
    account). IAM grants read on tmp/ and compute/ only (system-design.md §8)."""

    def __init__(self, bucket: str):
        self.bucket = bucket
        self._bucket = storage.Client().bucket(bucket)

    async def get(self, key: str) -> bytes:
        return await asyncio.to_thread(self._bucket.blob(key).download_as_bytes)

    async def put(self, key: str, data: bytes, content_type: str) -> None:
        blob = self._bucket.blob(key)
        await asyncio.to_thread(blob.upload_from_string, data, content_type=content_type)
