import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore
import json
import base64

def seed():
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
        
        ticket_data = {
            "ticketId": "TICKET-123",
            "matchId": "MATCH-01",
            "matchName": "FIFA Finals",
            "matchTime": "2026-07-15T18:00:00Z",
            "seat": "12",
            "row": "H",
            "section": "204",
            "gate": "Gate C",
            "tier": "Tier 2",
            "category": "General",
            "parkingSpot": "P-45"
        }
        
        db.collection("tickets").document("TICKET-123").set(ticket_data)
        print("Successfully seeded valid TICKET-123 ticket document!")
        
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    seed()
