from fastapi import Header, HTTPException, Depends
from typing import List, Optional
from app.repositories.user_repository import UserRepository
from app.core.logging import logger

def verify_role(allowed_roles: List[str]):
    async def dependency(
        authorization: Optional[str] = Header(None),
        user_repo: UserRepository = Depends(UserRepository)
    ):
        if not authorization:
            logger.warning("Missing Authorization header")
            raise HTTPException(status_code=401, detail="Missing authorization credentials")
        
        try:
            if not authorization.startswith("Bearer "):
                raise HTTPException(status_code=401, detail="Invalid token scheme")
            
            token = authorization.split(" ")[1]
            if not token.startswith("mock-jwt-token-"):
                raise HTTPException(status_code=401, detail="Invalid authorization token")
            
            user_id = token.replace("mock-jwt-token-", "")
            user = user_repo.get(user_id)
            if not user:
                raise HTTPException(status_code=401, detail="User account associated with token not found")
            
            if user.role not in allowed_roles:
                logger.warning(
                    f"Role boundary breach: user {user_id} with role '{user.role}' "
                    f"attempted to access resources restricted to {allowed_roles}"
                )
                raise HTTPException(status_code=403, detail="Forbidden: Insufficient role permissions")
                
            return user
        except HTTPException as he:
            raise he
        except Exception as e:
            logger.error(f"Error authenticating user role: {e}")
            raise HTTPException(status_code=401, detail="Invalid authorization credentials")
            
    return dependency
