"""
Authentication for Anomaly Service.
Supports optional Bearer token — verify if present, but don't require.
"""
from typing import Optional
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from src.config import JWT_ACCESS_SECRET

security = HTTPBearer(auto_error=False)


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[dict]:
    """
    Verify Bearer token if present.
    If no token: return None (still allow request).
    If invalid token: raise 401.
    """
    if not credentials:
        return None
    
    try:
        token = credentials.credentials
        payload = jwt.decode(
            token,
            JWT_ACCESS_SECRET,
            algorithms=['HS256']
        )
        user_id = payload.get('sub')
        role = payload.get('role')
        name = payload.get('name')
        zone = payload.get('zone')
        
        if not user_id:
            raise ValueError("Missing 'sub' in token")
        
        return {
            'user_id': user_id,
            'role': role,
            'name': name,
            'zone': zone
        }
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


def require_role(*roles):
    """Factory: return async guard checking user role."""
    async def check(user: Optional[dict] = Depends(get_optional_user)):
        if not user:
            raise HTTPException(status_code=403, detail="Token required for this endpoint")
        if user['role'] not in roles:
            raise HTTPException(status_code=403, detail=f"Insufficient permissions. Required: {roles}")
        return user
    return check
