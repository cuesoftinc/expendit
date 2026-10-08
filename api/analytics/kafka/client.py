"""aiokafka connection settings shared by the producer and consumers."""

from aiokafka.helpers import create_ssl_context

from app.config import Settings


def ssl_context(ca: str):
    """KAFKA_SSL_CA is the CA certificate's PEM text, as in the Go and Node
    services (Aiven's CA, pasted into Doppler). A file path also works for
    native runs. Empty = the system trust store."""
    if not ca:
        return create_ssl_context()
    if "-----BEGIN" in ca:
        return create_ssl_context(cadata=ca)
    return create_ssl_context(cafile=ca)


def connection_kwargs(settings: Settings) -> dict:
    kwargs: dict = {"bootstrap_servers": settings.kafka_broker_list}
    if settings.kafka_username:
        # Aiven: SASL/SCRAM over TLS, one user per service (S-11).
        kwargs.update(
            security_protocol="SASL_SSL",
            sasl_mechanism="SCRAM-SHA-256",
            sasl_plain_username=settings.kafka_username,
            sasl_plain_password=settings.kafka_password,
            ssl_context=ssl_context(settings.kafka_ssl_ca),
        )
    return kwargs
