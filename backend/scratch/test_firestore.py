import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore
import json
import base64

def test():
    # Load .env
    load_dotenv(dotenv_path="../.env")
    
    cred_json = os.getenv("FIREBASE_CREDENTIALS_JSON", "")
    if not cred_json:
        print("Error: FIREBASE_CREDENTIALS_JSON is empty in .env")
        return
        
    try:
        try:
            cred_dict = json.loads(cred_json)
        except json.JSONDecodeError:
            decoded = base64.b64decode(cred_json).decode('utf-8')
            cred_dict = json.loads(decoded)
            
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        
        print("Connected to Firestore successfully!")
        
        # List all tickets
        tickets_ref = db.collection("tickets").stream()
        tickets = [doc.id for doc in tickets_ref]
        print(f"Documents in 'tickets' collection: {tickets}")
        
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test()
