# PRP-003 Telegram Integration - Architecture Diagrams

Visual reference for understanding the integration architecture.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRP CLI Ecosystem                           │
│                                                                     │
│  ┌─────────────────┐                                               │
│  │   User's CLI    │  $ prp init my-project                        │
│  │   (Terminal)    │                                               │
│  └────────┬────────┘                                               │
│           │                                                         │
│           │ 1. Generate project                                    │
│           ↓                                                         │
│  ┌─────────────────┐                                               │
│  │  PRP Generator  │  TypeScript/Node.js                          │
│  │   (src/*)       │  - CLI logic                                 │
│  │                 │  - Template engine                            │
│  │                 │  - File operations                            │
│  └────────┬────────┘                                               │
│           │                                                         │
│           │ 2. Project created                                     │
│           │                                                         │
│           │ 3. Send notification                                   │
│           ↓                                                         │
│  ┌─────────────────┐                                               │
│  │ Telegram Utils  │  src/utils/telegram.ts                       │
│  │ sendNudge()     │  - HTTP client                               │
│  │                 │  - Authentication                             │
│  │                 │  - Error handling                             │
│  └────────┬────────┘                                               │
│           │                                                         │
└───────────┼─────────────────────────────────────────────────────────┘
            │
            │ HTTP POST
            │ Authorization: Bearer <NUDGE_SECRET>
            │
            ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    dcmaidbot Infrastructure                         │
│                         (Kubernetes)                                │
│                                                                     │
│  ┌─────────────────┐                                               │
│  │   Ingress HTTPS │  dcmaidbot.shark-versus.com                  │
│  │   (Cert-Manager)│  SSL/TLS termination                         │
│  └────────┬────────┘                                               │
│           │                                                         │
│           ↓                                                         │
│  ┌─────────────────┐                                               │
│  │  Service (K8s)  │  ClusterIP                                   │
│  │  Port 8080      │  Load balancing                              │
│  └────────┬────────┘                                               │
│           │                                                         │
│           ↓                                                         │
│  ┌─────────────────┐                                               │
│  │  Pod (Docker)   │  Python 3.13 container                       │
│  │  bot_webhook.py │  - aiohttp web server                        │
│  │                 │  - /nudge handler                             │
│  │                 │  - /health, /version                          │
│  └────────┬────────┘                                               │
│           │                                                         │
│           │ 1. Validate auth                                       │
│           │ 2. Validate payload                                    │
│           │                                                         │
│           ↓                                                         │
│  ┌─────────────────┐                                               │
│  │  NudgeService   │  services/nudge_service.py                   │
│  │  forward_nudge()│  - Build request                             │
│  │                 │  - HTTP client                                │
│  │                 │  - Timeout handling                           │
│  └────────┬────────┘                                               │
│           │                                                         │
└───────────┼─────────────────────────────────────────────────────────┘
            │
            │ HTTP POST
            │ Authorization: Bearer <NUDGE_SECRET>
            │
            ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   External LLM Service                              │
│                  dcmaid.theedgestory.org                            │
│                                                                     │
│  ┌─────────────────┐                                               │
│  │  /nudge Handler │  External endpoint                           │
│  │                 │  - Parse request                              │
│  │                 │  - Format message                             │
│  │                 │  - Add context (PR, PRP links)                │
│  └────────┬────────┘                                               │
│           │                                                         │
│           ↓                                                         │
│  ┌─────────────────┐                                               │
│  │  LLM Processor  │  - Message enrichment                        │
│  │                 │  - Link formatting                            │
│  │                 │  - Urgency handling                           │
│  └────────┬────────┘                                               │
│           │                                                         │
└───────────┼─────────────────────────────────────────────────────────┘
            │
            │ bot.sendMessage()
            │ via Telegram Bot API
            │
            ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    Telegram Infrastructure                          │
│                                                                     │
│  ┌─────────────────┐                                               │
│  │ Telegram Bot API│  api.telegram.org                            │
│  │                 │  - Message routing                            │
│  │                 │  - Delivery tracking                          │
│  └────────┬────────┘                                               │
│           │                                                         │
│           ↓                                                         │
│  ┌─────────────────┐                                               │
│  │  User's Device  │  Telegram mobile/desktop app                 │
│  │  @username      │  - Push notification                         │
│  │  ID: 123456789  │  - Message display                           │
│  └─────────────────┘                                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

Time: ~1-2 seconds end-to-end
```

---

## 2. Authentication Flow

```
┌──────────┐                                    ┌──────────┐
│ PRP CLI  │                                    │ dcmaidbot│
└────┬─────┘                                    └────┬─────┘
     │                                                │
     │ 1. Load NUDGE_SECRET from .env                │
     │    (or environment variable)                  │
     │                                                │
     │ 2. Prepare HTTP request:                      │
     │    POST /nudge                                │
     │    Authorization: Bearer <secret>             │
     │    Content-Type: application/json             │
     │    Body: { user_ids, message, ... }           │
     │                                                │
     │────────── HTTP POST ──────────────────────────>│
     │                                                │
     │                                    3. Receive request
     │                                    4. Extract auth header
     │                                    5. Load NUDGE_SECRET from env
     │                                    6. Compare:
     │                                       provided == expected?
     │                                                │
     │                                    ┌───────────┴─────────┐
     │                                    │                     │
     │                               YES (Match)            NO (Mismatch)
     │                                    │                     │
     │                          7. Proceed with request   7. Return 401
     │<────────── 200 OK ───────────────────┘                  │
     │                                                          │
     │<────────── 401 Unauthorized ─────────────────────────────┘
     │            { error: "Invalid token" }
     │
     └─ Continue or log error
```

---

## 3. Request/Response Flow (Detailed)

```
PRP CLI                 dcmaidbot               External Service      Telegram
   │                        │                          │                 │
   │ 1. POST /nudge         │                          │                 │
   │ {user_ids, message}    │                          │                 │
   │───────────────────────>│                          │                 │
   │                        │                          │                 │
   │                   2. Validate Auth                │                 │
   │                   (Bearer token)                  │                 │
   │                        │                          │                 │
   │                   3. Validate Payload             │                 │
   │                   (user_ids, message)             │                 │
   │                        │                          │                 │
   │                   4. Forward request              │                 │
   │                        │─────────────────────────>│                 │
   │                        │  POST /nudge             │                 │
   │                        │  (with same auth)        │                 │
   │                        │                          │                 │
   │                        │              5. Process request            │
   │                        │              - Parse payload               │
   │                        │              - Format message              │
   │                        │              - Add links                   │
   │                        │                          │                 │
   │                        │              6. Send to Telegram           │
   │                        │                          │────────────────>│
   │                        │                          │ bot.sendMessage │
   │                        │                          │                 │
   │                        │                          │      7. Deliver │
   │                        │                          │      (push notif)
   │                        │                          │                 │
   │                        │              8. Return success              │
   │                        │<──────────────────────────│                 │
   │                        │  {status: "success"}     │                 │
   │                        │                          │                 │
   │ 9. Return to CLI       │                          │                 │
   │<───────────────────────│                          │                 │
   │ {status: "success"}    │                          │                 │
   │                        │                          │                 │
   │ 10. Log success        │                          │                 │
   │ Continue workflow      │                          │                 │
   │                        │                          │                 │

Total time: ~1-2 seconds
```

---

## 4. Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Error Scenarios                             │
└─────────────────────────────────────────────────────────────────┘

Scenario A: Missing NUDGE_SECRET in PRP
─────────────────────────────────────────
PRP CLI
   │
   ├─ Load .env
   │  NUDGE_SECRET not found
   │
   └─> Log warning: "NUDGE_SECRET not configured"
       Skip notification
       Continue workflow ✅ (non-blocking)


Scenario B: Invalid NUDGE_SECRET
─────────────────────────────────
PRP CLI ───POST───> dcmaidbot
                         │
                    Validate token
                    provided != expected
                         │
                    Return 401 ─────> PRP CLI
                                         │
                                    Log error
                                    Continue ✅


Scenario C: Network Timeout
────────────────────────────
PRP CLI ───POST───> dcmaidbot (unreachable)
   │                     ✗
   │ Timeout (30s)
   │
   └─> Catch error
       Log: "Failed to send notification"
       Continue ✅


Scenario D: External Endpoint Down
───────────────────────────────────
PRP CLI ───> dcmaidbot ───> External (down)
                │                ✗
                │ Forward fails
                │
                └───> Return 502 ─────> PRP CLI
                                           │
                                      Log error
                                      Continue ✅


Scenario E: Invalid User ID
────────────────────────────
PRP CLI ───> dcmaidbot ───> External ───> Telegram
                                               │
                                          User not found
                                               │
                                          Error response
                                               │
                                    Return to dcmaidbot
                                               │
                                    Forward error to PRP
                                               │
                                          Log error
                                          Continue ✅

All scenarios: Notifications NEVER block main workflow!
```

---

## 5. User Account Linking Flow (Future)

```
Step 1: User initiates linking
───────────────────────────────
$ prp link-telegram

┌─────────────────────────────────────────┐
│ Link your Telegram account              │
│                                          │
│ 1. Open: https://t.me/dcmaidbot?        │
│           start=A1B2C3D4                 │
│                                          │
│ 2. Send /start in Telegram              │
│                                          │
│ Waiting for verification...              │
└─────────────────────────────────────────┘


Step 2: User opens Telegram
────────────────────────────
[User clicks link]
    │
    └─> Opens Telegram app
        Pre-fills: /start A1B2C3D4


Step 3: User sends code
────────────────────────
User in Telegram: /start A1B2C3D4
    │
    └─> dcmaidbot receives:
        - User ID: 123456789
        - Code: A1B2C3D4
        - Username: @john_doe


Step 4: dcmaidbot verifies
───────────────────────────
dcmaidbot
    │
    ├─> Lookup code in database
    │   Code: A1B2C3D4
    │   Status: pending
    │   Created: 2025-10-28 12:00:00
    │
    ├─> Validate (not expired, unused)
    │
    ├─> Mark as verified
    │   User ID: 123456789
    │   Username: @john_doe
    │
    └─> Reply to user:
        "✅ Verified! You'll receive PRP updates!"


Step 5: PRP confirms
────────────────────
PRP CLI (polling for verification)
    │
    ├─> Check code status every 5s
    │   GET /api/link-status?code=A1B2C3D4
    │
    └─> Status: verified
        User ID: 123456789
        
        Save to config:
        ~/.prp/config.json
        {
          "telegram": {
            "userId": 123456789,
            "username": "@john_doe",
            "linkedAt": "2025-10-28T12:00:30Z"
          }
        }
        
        Display:
        "✅ Telegram linked successfully!"


Step 6: Test notification
──────────────────────────
PRP CLI
    │
    └─> Send test nudge
        POST /nudge
        {
          "user_ids": [123456789],
          "message": "Test from PRP! 🎉"
        }
        
        User receives on Telegram:
        "Test from PRP! 🎉"
        
        Display:
        "✅ Test notification sent!"
```

---

## 6. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Data Transformations                     │
└─────────────────────────────────────────────────────────────────┘

INPUT (PRP CLI)
───────────────
{
  userIds: [123456789],
  message: "Project 'my-app' created!",
  urgency: "medium"
}
    │
    │ Transform to HTTP request
    ↓
HTTP REQUEST (PRP → dcmaidbot)
──────────────────────────────
POST /nudge
Authorization: Bearer <secret>
Content-Type: application/json

{
  "user_ids": [123456789],
  "message": "Project 'my-app' created!",
  "urgency": "medium"
}
    │
    │ Forward (unchanged)
    ↓
HTTP REQUEST (dcmaidbot → External)
────────────────────────────────────
POST https://dcmaid.theedgestory.org/nudge
Authorization: Bearer <secret>
Content-Type: application/json

{
  "user_ids": [123456789],
  "message": "Project 'my-app' created!",
  "urgency": "medium"
}
    │
    │ Enrich with formatting
    ↓
TELEGRAM API CALL (External → Telegram)
────────────────────────────────────────
bot.sendMessage({
  chat_id: 123456789,
  text: "💕 dcmaidbot says:\n\n" +
        "Project 'my-app' created!\n\n" +
        "Nya~ Sent by PRP CLI",
  parse_mode: "Markdown"
})
    │
    │ Deliver
    ↓
USER RECEIVES
─────────────
┌──────────────────────────────┐
│ 💕 dcmaidbot says:           │
│                              │
│ Project 'my-app' created!    │
│                              │
│ Nya~ Sent by PRP CLI         │
└──────────────────────────────┘
```

---

## 7. Security Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                      Security Layers                            │
└─────────────────────────────────────────────────────────────────┘

Layer 1: Network
────────────────
Internet ──[HTTPS]──> Kubernetes Ingress
                      │
                      ├─ SSL/TLS termination
                      ├─ Valid certificate
                      └─ Enforce HTTPS only


Layer 2: Authentication
───────────────────────
HTTP Request ──[Bearer Token]──> dcmaidbot
                                  │
                                  ├─ Extract token
                                  ├─ Compare with NUDGE_SECRET
                                  └─ Return 401 if invalid


Layer 3: Input Validation
──────────────────────────
Request Body ──[Schema Check]──> Handler
                                  │
                                  ├─ user_ids: list of int?
                                  ├─ message: non-empty string?
                                  └─ Return 400 if invalid


Layer 4: Rate Limiting (Future)
────────────────────────────────
Request ──[Check Rate]──> Handler
                          │
                          ├─ Count requests per IP/user
                          ├─ Max 10/minute per user
                          └─ Return 429 if exceeded


Layer 5: User ID Validation (Future)
─────────────────────────────────────
user_ids ──[Check Allowed]──> Handler
                               │
                               ├─ Only send to admin IDs
                               └─ Return 403 if unauthorized


Layer 6: Kubernetes Secrets
────────────────────────────
NUDGE_SECRET stored in:
    Kubernetes Secret (encrypted at rest)
    │
    ├─ Not in code
    ├─ Not in environment files
    ├─ Not in logs
    └─ Injected at runtime


Layer 7: Logging Privacy
─────────────────────────
Log only:
    ✅ Request timestamp
    ✅ HTTP method and path
    ✅ Response status code
    ✅ Error messages (sanitized)

Never log:
    ❌ NUDGE_SECRET
    ❌ User IDs (or hash them)
    ❌ Full message content
    ❌ Authorization headers
```

---

## 8. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              Kubernetes Production Setup                        │
└─────────────────────────────────────────────────────────────────┘

Namespace: prod-core
────────────────────

┌──────────────────────────────────────────┐
│            Ingress (HTTPS)               │
│  dcmaidbot.shark-versus.com              │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  cert-manager (Let's Encrypt)      │  │
│  │  Auto-renewed SSL certificate      │  │
│  └────────────────────────────────────┘  │
└────────────┬─────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────┐
│         Service (ClusterIP)              │
│  dcmaidbot-prod                          │
│  Port: 8080                              │
└────────────┬─────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────┐
│          Deployment                      │
│  dcmaidbot-prod                          │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │         Pod 1 (Active)             │  │
│  │  ┌──────────────────────────────┐  │  │
│  │  │  Container: dcmaidbot        │  │  │
│  │  │  Image: ghcr.io/dcversus/   │  │  │
│  │  │         dcmaidbot:latest     │  │  │
│  │  │                              │  │  │
│  │  │  Env vars:                   │  │  │
│  │  │  - BOT_TOKEN (secret)        │  │  │
│  │  │  - ADMIN_IDS (secret)        │  │  │
│  │  │  - NUDGE_SECRET (secret) ✨  │  │  │
│  │  │  - DATABASE_URL (secret)     │  │  │
│  │  │  - WEBHOOK_MODE=true         │  │  │
│  │  │                              │  │  │
│  │  │  Health check:               │  │  │
│  │  │  GET /health (30s interval)  │  │  │
│  │  └──────────────────────────────┘  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │         Pod 2 (Standby)            │  │
│  │  (Same configuration)              │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│          Secrets (K8s)                   │
│                                          │
│  dcmaidbot-secrets                       │
│  - BOT_TOKEN                             │
│  - ADMIN_IDS                             │
│  - DATABASE_URL                          │
│  - WEBHOOK_SECRET                        │
│                                          │
│  dcmaidbot-nudge-secret ✨               │
│  - NUDGE_SECRET                          │
│    (64-char hex, rotated annually)       │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│          ArgoCD (GitOps)                 │
│                                          │
│  Syncs from: uz0/core-charts            │
│  Chart: charts/dcmaidbot/               │
│                                          │
│  Auto-deploy on:                         │
│  - Git push to main                      │
│  - Manual sync                           │
│  - Scheduled sync (5 min)                │
└──────────────────────────────────────────┘
```

---

*End of Architecture Diagrams*

Generated for: PRP-003 Telegram Integration Research  
Date: 2025-10-28  
Status: Complete
