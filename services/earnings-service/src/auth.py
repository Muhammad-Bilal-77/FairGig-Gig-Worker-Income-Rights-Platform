from collections.abc import Callable
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from src.config import JWT_ACCESS_SECRET

oauth2_scheme = OAuth2PasswordBearer(tokenUrl='/api/auth/login')


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    try:
        payload = jwt.decode(token, JWT_ACCESS_SECRET, algorithms=['HS256'])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid authentication token',
        ) from exc

    user_id = payload.get('sub')
    role = payload.get('role')
    name = payload.get('name')
    zone = payload.get('zone')

    if not user_id or not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Token missing required claims',
        )

    return {
        'user_id': user_id,
        'role': role,
        'name': name,
        'zone': zone,
    }


def require_role(*roles: str) -> Callable:
    async def guard(user: dict = Depends(get_current_user)) -> dict:
        if user['role'] not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail='Insufficient role for this endpoint',
            )
        return user

    return guard
