import asyncio
import logging
import json
from src.services.analytics_service import get_summary
from src.database import db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    print("Connecting to DB...")
    await db.connect()
    try:
        print("Calling get_summary()...")
        res = await get_summary()
        print("Resulting JSON:")
        print(res.json())
    except Exception as e:
        print(f"ERROR OCCURRED: {e}")
        import traceback
        traceback.print_exc()
    finally:
        print("Disconnecting...")
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
