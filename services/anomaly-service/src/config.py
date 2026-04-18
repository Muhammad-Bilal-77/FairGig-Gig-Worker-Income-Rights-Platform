"""
Environment configuration for Anomaly Service.
Loads variables from repository root .env.
"""
import os
from dotenv import load_dotenv

# Load from workspace root
load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))


def _required(name: str) -> str:
    """Get required environment variable or crash."""
    value = os.getenv(name)
    if not value or not value.strip():
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


# Database
READONLY_DB_URL = _required('READONLY_DB_URL')

# Authentication
JWT_ACCESS_SECRET = _required('JWT_ACCESS_SECRET')

# Service Config
ANOMALY_PORT = int(os.getenv('ANOMALY_PORT', '4003'))
NODE_ENV = os.getenv('NODE_ENV', 'development')
