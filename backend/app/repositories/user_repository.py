from typing import Optional
from app.models.user import User
from app.repositories.base import BaseRepository
from app.core.firebase import db

class UserRepository(BaseRepository[User]):
    def __init__(self):
        super().__init__("users", User)

    def get_by_email(self, email: str) -> Optional[User]:
        try:
            docs = db.collection(self.collection_name).stream()
            for doc in docs:
                data = doc.to_dict()
                if data.get("profile", {}).get("email") == email:
                    return User(**data)
            return None
        except Exception:
            return None
