import json
import base64
from typing import Dict, Any, List, Optional
import firebase_admin
from firebase_admin import credentials, firestore
from app.core.config import settings
from app.core.logging import logger

# Global database handle
db = None

def init_firebase():
    global db
    if firebase_admin._apps:
        db = firestore.client()
        return db

    try:
        if settings.FIREBASE_CREDENTIALS_JSON:
            # Try parsing from raw JSON or Base64 string
            try:
                cred_dict = json.loads(settings.FIREBASE_CREDENTIALS_JSON)
            except json.JSONDecodeError:
                decoded = base64.b64decode(settings.FIREBASE_CREDENTIALS_JSON).decode('utf-8')
                cred_dict = json.loads(decoded)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
        else:
            # Fallback to default application credentials
            firebase_admin.initialize_app()
        
        db = firestore.client()
        logger.info("Successfully connected to live Cloud Firestore.")
    except Exception as e:
        if settings.USE_MOCK_FIREBASE:
            logger.warning(f"Failed to initialize live Firestore: {e}. Falling back to mock client.")
            # Minimal in-memory mock client to support test execution
            class MockDocument:
                def __init__(self, doc_id: str, data: Optional[Dict[str, Any]] = None):
                    self.id = doc_id
                    self._data = data or {}
                    self.exists = len(self._data) > 0
                def to_dict(self) -> Dict[str, Any]:
                    return self._data

            class MockDocumentReference:
                def __init__(self, doc_id: str, collection_store: Dict[str, Dict[str, Any]], col_path: str):
                    self.id = doc_id
                    self._collection_store = collection_store
                    self._col_path = col_path
                def get(self) -> MockDocument:
                    doc_data = self._collection_store.get(self._col_path, {}).get(self.id, {})
                    return MockDocument(self.id, doc_data)
                def set(self, data: Dict[str, Any], merge: bool = False) -> None:
                    if self._col_path not in self._collection_store:
                        self._collection_store[self._col_path] = {}
                    if merge and self.id in self._collection_store[self._col_path]:
                        self._collection_store[self._col_path][self.id].update(data)
                    else:
                        self._collection_store[self._col_path][self.id] = data
                def update(self, data: Dict[str, Any]) -> None:
                    if self._col_path not in self._collection_store:
                        self._collection_store[self._col_path] = {}
                    if self.id not in self._collection_store[self._col_path]:
                        self._collection_store[self._col_path][self.id] = {}
                    self._collection_store[self._col_path][self.id].update(data)
                def delete(self) -> None:
                    if self._col_path in self._collection_store and self.id in self._collection_store[self._col_path]:
                        del self._collection_store[self._col_path][self.id]

            class MockCollectionReference:
                def __init__(self, col_path: str, collection_store: Dict[str, Dict[str, Any]]):
                    self.path = col_path
                    self._collection_store = collection_store
                def document(self, doc_id: str) -> MockDocumentReference:
                    return MockDocumentReference(doc_id, self._collection_store, self.path)
                def stream(self) -> List[MockDocument]:
                    docs = []
                    col_data = self._collection_store.get(self.path, {})
                    for doc_id, doc_data in col_data.items():
                        docs.append(MockDocument(doc_id, doc_data))
                    return docs

            class MockFirestoreClient:
                def __init__(self):
                    self._store: Dict[str, Dict[str, Any]] = {}
                def collection(self, col_path: str) -> MockCollectionReference:
                    return MockCollectionReference(col_path, self._store)

            db = MockFirestoreClient()
            return db

        logger.critical(f"Failed to initialize Firebase Admin SDK: {e}. Live Firestore is required.")
        raise e
    
    return db

# Initialize immediately
init_firebase()
