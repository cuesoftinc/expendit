from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    port: int = 8082
    kafka_brokers: str = ""
    kafka_username: str = ""
    kafka_password: str = ""
    kafka_ssl_ca: str = ""


settings = Settings()
