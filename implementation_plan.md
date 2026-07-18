# Implementation Plan: AI Stadium Operating System MVP (PRD, TRD & Guardrails)

## Goal Description
Build a unified, multi-agent AI-powered Stadium Operating System that manages the complete stadium lifecycle (Arrival, Auth, Navigation, Food, Safety, Transport) for Spectators, Vendors, Security, and Operations.

---

## Part 1: Product Requirements Document (PRD)

### 1. Objective
Establish a single, synchronized platform that breaks operational silos, decreases processing bottlenecks (entry, navigation, ordering, incident response), and ensures accessibility and safety for all visitor types during high-density sporting events.

### 2. User Roles & Personas
1.  **Spectators (General, Premium, VIP, VVIP)**:
    *   *Needs*: Fast entry, step-by-step indoor seat routing, context-aware food ordering, quick language translation, and instant SOS help.
2.  **Vendors**:
    *   *Needs*: Real-time order dispatch, inventory counts, demand estimations, and queue updates.
3.  **Security Officers**:
    *   *Needs*: Crowd level density metrics, real-time zone incident alerts, and direct dispatch coordination.
4.  **Operations Team**:
    *   *Needs*: Integrated dashboard detailing crowd analytics, queue latency, utility levels (waste, water, electricity), and AI-generated operational health summaries.
5.  **Transportation Coordinators**:
    *   *Needs*: Control center visibility on parking occupancy, road traffic, and exit strategy schedules.

### 3. Key Feature Scope (MVP)
*   **Authentication**: Multi-role login (Ticket QR code/Ticket ID for spectators; secure credentials for vendors, security, operations).
*   **Indoor Navigation**: Accurate 2D coordinate-based pathfinding with standard and wheelchair-accessible routing parameters.
*   **AI Fan Assistant**: Context-rich Gemini conversation partner, handling voice/text questions, food orders, and FAQ routing.
*   **Security & Ops Dashboards**: Interactive metrics view, active incident logging, crowd alerts, and utility monitoring.
*   **Voice & Accessibility**: Support for large text, screen readers, multilingual translation (15+ languages), and hands-free voice commands.

---

## Part 2: Technical Requirements Document (TRD)

### 1. System Architecture
```
[Client App: Next.js + React]
        │   ▲
        │   │ HTTP / JSON API (REST + WebSocket)
        ▼   │
  [API Gateway / FastAPI Backend]
        │
        ├──► [Master AI Orchestrator (Gemini Pro/Flash)]
        │      │
        │      ├──► Fan Agent
        │      ├──► Security Agent
        │      ├──► Vendor Agent
        │      ├──► Operations Agent
        │      ├──► Transportation Agent
        │      └──► Accessibility Agent
        │
        └──► [Shared Infrastructure Services]
               ├──► Google Firestore (Database)
               ├──► Firebase Auth (Authentication)
               ├──► Cloud Speech-to-Text / Text-to-Speech
               ├──► Cloud Translation API
               └──► Google Maps Platform
```

### 2. Network Degradation & Quota Guardrails (Graceful Failures)
All external API calls (Gemini, Speech, Translation) operate through an execution pipeline designed to degrade gracefully:

```
[API Call Triggered]
        │
        ├──► [Try API Request] ──(Success)──► [Return Response & Update Cache]
        │
        └──(Error / Quota 429)
                 │
                 ▼
          [Exponential Retry] ──(Success)──► [Return Response]
                 │
                 ▼ (Failure after 3 retries)
          [Fetch Local Cache] ──(Cache Hit)──► [Return Stale Cached Response]
                 │
                 ▼ (Cache Miss)
          [Generate Fallback] ──► [System Template / Mock Response]
                 │
                 ▼
          [UI Notification] ──► "Displaying cached info due to network load."
```

---

## Part 3: Canonical Database Schema (Cloud Firestore)

All Firestore collections and records enforce strict field typing:

### 1. `/users/{userId}`
*   `id`: `string` (Firebase UID)
*   `role`: `'spectator' | 'vendor' | 'security' | 'operations' | 'transport'`
*   `profile`: `Map` { `name`: `string`, `email`: `string`, `phone?`: `string` }
*   `ticketId`: `string | null` (referenced if spectator)
*   `language`: `string` (ISO 639-1 code, defaults to `'en'`)
*   `preferences`: `Map` {
        `accessibilityMode`: `boolean`,
        `largeText`: `boolean`,
        `screenReader`: `boolean`,
        `wheelchairRoute`: `boolean`,
        `voiceInteraction`: `boolean`
    }
*   `createdAt`: `timestamp`

### 2. `/tickets/{ticketId}`
*   `ticketId`: `string` (Primary Key)
*   `matchId`: `string`
*   `matchName`: `string`
*   `matchTime`: `timestamp`
*   `seat`: `string` (e.g., `"Seat 12"`)
*   `row`: `string` (e.g., `"Row H"`)
*   `section`: `string` (e.g., `"Section 204"`)
*   `gate`: `string` (e.g., `"Gate C"`)
*   `tier`: `string` (e.g., `"Tier 2"`)
*   `category`: `'General' | 'Premium' | 'VIP' | 'VVIP'`
*   `parkingSpot`: `string | null`

### 3. `/sessions/{sessionId}`
*   `sessionId`: `string`
*   `userId`: `string`
*   `activeAgentId`: `'master' | 'fan' | 'security' | 'vendor' | 'operations' | 'transportation' | 'accessibility'`
*   `messages`: `Array` [
        {
            `messageId`: `string`,
            `sender`: `'user' | 'orchestrator' | 'agent'`,
            `agentId?`: `string`,
            `content`: `string`,
            `timestamp`: `timestamp`,
            `suggestedActions?`: `Array` [
                { `type`: `string`, `payload`: `Map` }
            ]
        }
    ]
*   `context`: `Map` {
        `currentLocation?`: { `x`: `number`, `y`: `number`, `level`: `string`, `label`: `string` },
        `destination?`: { `x`: `number`, `y`: `number`, `level`: `string`, `label`: `string` },
        `currentOrderId?`: `string`,
        `emergencySOS?`: `boolean`
    }
*   `updatedAt`: `timestamp`

### 4. `/orders/{orderId}`
*   `orderId`: `string`
*   `userId`: `string`
*   `vendorId`: `string`
*   `seatNumber`: `string`
*   `items`: `Array` [{ `itemId`: `string`, `name`: `string`, `quantity`: `number`, `price`: `number` }]
*   `totalAmount`: `number`
*   `status`: `'pending' | 'preparing' | 'delivered' | 'cancelled'`
*   `createdAt`: `timestamp`

### 5. `/incidents/{incidentId}`
*   `incidentId`: `string`
*   `severity`: `'low' | 'medium' | 'high' | 'critical'`
*   `location`: `Map` { `section`: `string`, `gate`: `string`, `label`: `string`, `coords`: { `x`: `number`, `y`: `number` } }
*   `description`: `string`
*   `status`: `'reported' | 'assigned' | 'resolving' | 'resolved'`
*   `assignedTeam?`: `string`
*   `reportedBy`: `string`
*   `createdAt`: `timestamp`

---

## Part 4: Agent Guardrails & Safety Protocols

To ensure safety, prevent hallucinations, and protect PII, the Master AI Orchestrator applies input/output guardrails:

### 1. Input Guardrails
*   **Sanitization Filters**: Regex filters on user message payloads to sanitize HTML, script tags, and database queries.
*   **Prompt Injection Detection**: Auxiliary Gemini validation check rejecting system instruction overrides (e.g., "Ignore previous instructions").
*   **Role Authorization Boundary Check**: Ensures user metadata role matches request intent. A spectator requesting vendor metrics or incident list yields an immediate `403 Forbidden` response.

### 2. Output Guardrails
*   **Schema Consistency Engine**: Confirms agent outputs conform to the structural JSON contract. If broken, the orchestrator automatically reformats/retries the query.
*   **Hallucination Check**: Re-evaluates structural variables (seats, gates, coordinates) against the user's active Firestore record. If the agent claims a different gate than the ticket data, the system auto-corrects the output prior to client delivery.
*   **Safety Filtering**: Hard filters blocks on profanity, self-harm language, harassment, and unauthorized weapon disclosures.

---

## Part 5: Agent Contracts & Interfaces

### Pydantic Models for Agent Exchange (Python Backend)

```python
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class Location(BaseModel):
    x: float
    y: float
    level: str
    label: str

class UserPreferences(BaseModel):
    accessibilityMode: bool = False
    largeText: bool = False
    screenReader: bool = False
    wheelchairRoute: bool = False
    voiceInteraction: bool = False

class AgentMessage(BaseModel):
    user_id: str
    session_id: str
    content: str
    current_location: Optional[Location] = None
    language: str = "en"
    preferences: UserPreferences = Field(default_factory=UserPreferences)

class ActionItem(BaseModel):
    type: str  # e.g., 'navigate', 'order_food', 'play_audio', 'sos'
    payload: Dict[str, Any] = {}

class AgentResponse(BaseModel):
    content: str
    suggested_actions: List[ActionItem] = []
    updated_context: Dict[str, Any] = {}
    next_agent_id: Optional[str] = None
```

---

## Part 6: Verification & Testing Plan

### Automated Coverage
1.  **Backend Pytests**: Validate that input guardrails intercept injection attempts and that the degradation pipeline switches to mock data correctly under simulated 429 rate limit exceptions.
2.  **Frontend TypeScript Validation**: Standardized compilation tests checking model alignment.

### Manual Scenarios
1.  **SOS Escalation Routing**: Spectator requests urgent medical aid via chat -> Verify Master Orchestrator instantly bypasses standard Fan routing and assigns the query to the Accessibility/Security agent to log an high-priority incident.
2.  **Wheelchair Pathing Validation**: Enable wheelchair preference -> Request directions -> Verify system computes paths avoiding steep staircases.

---

## Part 7: Deployment to Vercel

### Goal
Deploy the MVP to Vercel since Google Cloud deployment is blocked by billing constraints. Vercel provides a generous free tier for both Next.js (frontend) and Python Serverless Functions (backend).

### User Review Required
> [!IMPORTANT]
> - Vercel CLI will be used to deploy the frontend and backend directly from your local machine. You will need to authenticate with Vercel during the first deployment step.
> - The backend uses Firebase credentials and a Gemini API key. We will need to set these as environment variables in the Vercel dashboard after the first initial push.

### Open Questions
> [!WARNING]
> 1. Do you already have a Vercel account? (You can sign in with GitHub when prompted).
> 2. Vercel serverless functions have a 250MB deployment size limit and 10-second timeout on the free tier. This MVP should fit within those constraints, but is that acceptable for testing?

### Proposed Changes

#### [NEW] [backend/vercel.json](file:///c:/Users/krish/OneDrive/Desktop/promptwars/backend/vercel.json)
Create a Vercel configuration file for the Python backend to route API requests to the FastAPI app using the `@vercel/python` builder.

#### [NEW] [backend/api/index.py](file:///c:/Users/krish/OneDrive/Desktop/promptwars/backend/api/index.py)
Vercel expects a specific entrypoint for Python serverless functions. We will create a small wrapper that imports the FastAPI `app` from `app.main`.

#### [MODIFY] [frontend/next.config.ts](file:///c:/Users/krish/OneDrive/Desktop/promptwars/frontend/next.config.ts)
Remove the `output: "standalone"` setting, as Vercel natively optimizes Next.js without needing standalone Docker builds.

### Verification Plan
1. Deploy the backend to Vercel using `npx vercel`.
2. Configure the required environment variables in the Vercel dashboard.
3. Deploy the frontend to Vercel, setting `NEXT_PUBLIC_API_URL` to the new backend URL.
4. Verify the web application is fully functional.
