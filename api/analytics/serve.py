"""Container entrypoint: uvicorn without its own log config, so its startup
and error lines go through the JSON handler on stdout like every other line."""

import uvicorn

from app.config import get_settings
from telemetry import configure


def main() -> None:
    settings = get_settings()
    configure(settings.log_level)
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.port, log_config=None, access_log=False)


if __name__ == "__main__":
    main()
