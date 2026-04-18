"""Analytics Service configuration"""

from dotenv import load_dotenv
from pathlib import Path
import os

# Load .env from project root
env_path = Path(__file__).resolve().parent.parent.parent.parent / ".env"
load_dotenv(env_path)

def required(name: str) -> str:
    """Get a required environment variable."""
    value = os.getenv(name)
    if not value:
        raise RuntimeError(
            f"\n[analytics-service] STARTUP FAILED\n"
            f"Missing required environment variable: {name}\n"
            f"Ensure fairgig/.env exists and contains {name}\n"
        )
    return value

class Config:
    """Analytics Service configuration"""
    
    # Server
    port = int(os.getenv("ANALYTICS_PORT", "4005"))
    node_env = os.getenv("NODE_ENV", "development")
    
    # Database — two pools
    analytics_db_url = required("ANALYTICS_DB_URL")
    readonly_db_url = required("READONLY_DB_URL")
    
    # JWT
    jwt_access_secret = required("JWT_ACCESS_SECRET")
    
    # Logging
    log_level = os.getenv("LOG_LEVEL", "info").upper()
    
    # K-anonymity threshold
    k_anonymity_threshold = 5
    
    # View refresh schedule (minutes)
    view_refresh_interval = int(os.getenv("VIEW_REFRESH_INTERVAL", "15"))

config = Config()
