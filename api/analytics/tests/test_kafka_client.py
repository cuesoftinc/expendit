import ssl
from pathlib import Path

from kafka.client import ssl_context

# A throwaway self-signed CA (CN=test-ca) used only by this test.
CA = Path(__file__).with_name("test-ca.crt")


def _has_test_ca(context: ssl.SSLContext) -> bool:
    return any(c["subject"] == ((("commonName", "test-ca"),),) for c in context.get_ca_certs())


def test_pem_text_is_loaded_like_the_go_and_node_services():
    # Doppler holds the CA's PEM text in KAFKA_SSL_CA (Aiven's CA certificate).
    assert _has_test_ca(ssl_context(CA.read_text()))


def test_a_file_path_still_works_for_native_runs():
    assert _has_test_ca(ssl_context(str(CA)))


def test_empty_uses_system_trust():
    assert isinstance(ssl_context(""), ssl.SSLContext)
