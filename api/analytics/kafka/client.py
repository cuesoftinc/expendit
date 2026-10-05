"""aiokafka connection settings shared by the producer and consumers."""

from aiokafka.helpers import create_ssl_context

from app.config import Settings


def connection_kwargs(settings: Settings) -> dict:
    kwargs: dict = {"bootstrap_servers": settings.kafka_broker_list}
    if settings.kafka_username:
        # Aiven: SASL/SCRAM over TLS, one user per service (S-11).
        kwargs.update(
            security_protocol="SASL_SSL",
            sasl_mechanism="SCRAM-SHA-256",
            sasl_plain_username=settings.kafka_username,
            sasl_plain_password=settings.kafka_password,
            ssl_context=create_ssl_context(cafile=settings.kafka_ssl_ca or None),
        )
    return kwargs
