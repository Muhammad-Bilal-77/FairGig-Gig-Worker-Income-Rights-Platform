"""Authentication and authorization"""

from fastapi import Depends, HTTPException, status, Request
from jose import JWTError, jwt
from .config import config
import logging

logger = logging.getLogger(__name__)

async def verify_token(request: Request):
    """Verify JWT access token from Authorization header"""
    auth_header = request.headers.get("Authorization")
    
    if not auth_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        scheme, token = auth_header.split()
        if scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication scheme",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        payload = jwt.decode(
            token,
            config.jwt_access_secret,
            algorithms=["HS256"],
            options={
                "verify_signature": True,
                "verify_exp": True,
                "require_exp": True,
            }
        )
        user_id = payload.get("sub")
        role = payload.get("role")
        name = payload.get("name")
        
        if not user_id or not role:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing sub or role"
            )
        
        return {
            "sub": user_id,
            "user_id": user_id,
            "role": role,
            "name": name,
        }
    except JWTError as err:
        logger.warning(f"Token verification failed: {err}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

async def require_advocate_or_verifier(user = Depends(verify_token)):
    """Require advocate or verifier role"""
    if user["role"] not in ["advocate", "verifier"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This endpoint requires advocate or verifier role, you have: {user['role']}"
        )
    return user

async def require_advocate(user = Depends(verify_token)):
    """Require advocate role"""
    if user["role"] != "advocate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This endpoint requires advocate role, you have: {user['role']}"
        )
    return user

