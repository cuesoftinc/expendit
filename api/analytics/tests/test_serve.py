import json
import logging
from types import SimpleNamespace

import pytest
import uvicorn

import serve


@pytest.fixture(autouse=True)
def settings(monkeypatch):
    monkeypatch.setattr(serve, "get_settings", lambda: SimpleNamespace(log_level="INFO", port=8080))


@pytest.fixture(autouse=True)
def root_logger():
    root = logging.getLogger()
    handlers, level = root.handlers[:], root.level
    yield
    root.handlers[:] = handlers
    root.setLevel(level)


def test_uvicorn_starts_without_its_own_log_config(monkeypatch):
    calls = []
    monkeypatch.setattr(serve.uvicorn, "run", lambda app, **kwargs: calls.append((app, kwargs)))
    serve.main()
    [(app, kwargs)] = calls
    assert app == "app.main:app" and kwargs["port"] == 8080
    assert kwargs["log_config"] is None and kwargs["access_log"] is False


def test_uvicorn_lines_are_json_on_stdout(monkeypatch, capsys):
    monkeypatch.setattr(serve.uvicorn, "run", lambda app, **kwargs: uvicorn.Config(app, **kwargs))
    serve.main()
    logging.getLogger("uvicorn.error").info("Uvicorn running on %s", "http://0.0.0.0:8080", extra={"color_message": "\x1b[1m%s\x1b[0m"})
    out, err = capsys.readouterr()
    line = json.loads(out.strip().splitlines()[-1])
    assert line["severity"] == "INFO" and line["logger"] == "uvicorn.error"
    assert line["message"] == "Uvicorn running on http://0.0.0.0:8080"
    assert "color_message" not in line
    assert err == ""
