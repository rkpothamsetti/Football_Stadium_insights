from typing import TypeVar, Generic, Type, Optional, List, Dict, Any
from pydantic import BaseModel
from app.core.firebase import db
from app.core.logging import logger

ModelType = TypeVar("ModelType", bound=BaseModel)

class BaseRepository(Generic[ModelType]):
    def __init__(self, collection_name: str, model_class: Type[ModelType]):
        self.collection_name = collection_name
        self.model_class = model_class

    def get(self, id: str) -> Optional[ModelType]:
        try:
            doc_ref = db.collection(self.collection_name).document(id)
            doc = doc_ref.get()
            if doc.exists:
                return self.model_class(**doc.to_dict())
            return None
        except Exception as e:
            logger.error(f"Error fetching from {self.collection_name} [id={id}]: {e}")
            return None

    def save(self, id: str, obj: ModelType) -> bool:
        try:
            doc_ref = db.collection(self.collection_name).document(id)
            doc_ref.set(obj.model_dump())
            return True
        except Exception as e:
            logger.error(f"Error saving to {self.collection_name} [id={id}]: {e}")
            return False

    def update(self, id: str, update_data: Dict[str, Any]) -> bool:
        try:
            doc_ref = db.collection(self.collection_name).document(id)
            doc_ref.update(update_data)
            return True
        except Exception as e:
            logger.error(f"Error updating {self.collection_name} [id={id}]: {e}")
            return False

    def delete(self, id: str) -> bool:
        try:
            doc_ref = db.collection(self.collection_name).document(id)
            doc_ref.delete()
            return True
        except Exception as e:
            logger.error(f"Error deleting from {self.collection_name} [id={id}]: {e}")
            return False

    def list_all(self) -> List[ModelType]:
        try:
            docs = db.collection(self.collection_name).stream()
            results = []
            for doc in docs:
                try:
                    results.append(self.model_class(**doc.to_dict()))
                except Exception as model_err:
                    logger.warning(f"Failed parsing doc {doc.id} in {self.collection_name}: {model_err}")
            return results
        except Exception as e:
            logger.error(f"Error listing all from {self.collection_name}: {e}")
            return []
