from pathlib import Path
import os
from dotenv import load_dotenv

ENV_PATH = (Path(__file__).resolve().parent / '../../../.env').resolve()
load_dotenv(ENV_PATH)


def _required(name: str) -> str:
    value = os.getenv(name)
    if value is None or value.strip() == '':
        raise RuntimeError(
            f"[earnings-service] STARTUP FAILED: missing required environment variable '{name}'. "
            f"Expected .env at: {ENV_PATH}"
        )
    return value


EARNINGS_DB_URL = _required('EARNINGS_DB_URL')
READONLY_DB_URL = _required('READONLY_DB_URL')
JWT_ACCESS_SECRET = _required('JWT_ACCESS_SECRET')
ANOMALY_SERVICE_URL = _required('ANOMALY_SERVICE_URL')
EARNINGS_PORT = int(_required('EARNINGS_PORT'))
NODE_ENV = _required('NODE_ENV')
