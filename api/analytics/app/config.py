"""Typed environment config (CueLABS standard: fail fast on missing settings).

Variable names follow system-design.md §10.3. Nothing else in the service
reads os.environ.
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 8082
    log_level: str = "INFO"

    # Which worker pool this process runs (D8). Cloud runs one pool per
    # worker pool; compose and Helm run "all" in one process.
    analytics_pool: Literal["extract", "compute", "all"] = "all"

    kafka_brokers: str = Field(min_length=1)
    kafka_username: str = ""
    kafka_password: str = ""
    kafka_ssl_ca: str = ""
    kafka_group_prefix: str = "expendit-analytics"

    # Object storage (S-3). gcs in cloud (ADC); s3 for MinIO in compose/self-host.
    storage_driver: Literal["gcs", "s3"] = "gcs"
    storage_bucket: str = Field(min_length=1)
    storage_prefix: str = Field(min_length=1, description="e.g. expendit/stg")
    storage_endpoint: str = ""
    storage_access_key: str = ""
    storage_secret_key: str = ""
    storage_use_ssl: bool = True

    # AI (X-4): Vertex via ADC in cloud; Groq/Gemini keys for self-host.
    google_cloud_project: str = ""
    vertex_location: str = "us-central1"
    groq_api_key: str = ""
    gemini_api_key: str = ""

    # JSON Schemas copied from api/common/contract at build time.
    contract_dir: str = "contract"

    @property
    def kafka_broker_list(self) -> list[str]:
        return [b.strip() for b in self.kafka_brokers.split(",") if b.strip()]

    @property
    def runs_extract(self) -> bool:
        return self.analytics_pool in ("extract", "all")

    @property
    def runs_compute(self) -> bool:
        return self.analytics_pool in ("compute", "all")


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]  # values come from the environment
