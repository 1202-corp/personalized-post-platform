# Architecture Documentation

## Communication Protocol Between Containers

### Overview

All services communicate via HTTP/REST over the Docker internal network (`ppb-network`). Services reference each other by container name (e.g., `http://mock-core-api:8000`).

```
┌─────────────────────────────────────────────────────────────────┐
│                        Docker Network                           │
│                        (ppb-network)                            │
│                                                                 │
│  ┌─────────────┐         ┌─────────────┐      ┌──────────────┐ │
│  │  main-bot   │◄───────►│mock-core-api│◄────►│   postgres   │ │
│  │  (Aiogram)  │  HTTP   │  (FastAPI)  │ SQL  │              │ │
│  └──────┬──────┘         └──────┬──────┘      └──────────────┘ │
│         │                       │                               │
│         │ HTTP                  │ HTTP (CORS)                   │
│         ▼                       ▼                               │
│  ┌─────────────┐         ┌─────────────┐                       │
│  │  user-bot   │         │   miniapp   │                       │
│  │ (Telethon)  │         │  (Nginx)    │                       │
│  └─────────────┘         └─────────────┘                       │
│                                                                 │
│  ┌─────────────┐                                               │
│  │    redis    │◄──────── Used for state/caching               │
│  └─────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Service Communication Matrix

| From | To | Protocol | Purpose |
|------|-----|----------|---------|
| `main-bot` | `mock-core-api` | HTTP REST | User CRUD, posts, ML endpoints |
| `main-bot` | `user-bot` | HTTP REST | Trigger scraping, join channels |
| `user-bot` | `mock-core-api` | HTTP REST | Sync scraped data |
| `frontend-miniapp` | `mock-core-api` | HTTP REST | Submit interactions |
| `mock-core-api` | `postgres` | PostgreSQL | Data persistence |
| `main-bot` | `redis` | Redis Protocol | State storage (FSM) |

---

## Detailed Communication Flows

### 1. User Registration Flow (`/start`)

```
User ──► main-bot ──► mock-core-api ──► postgres
              │
              ▼
         [Response]
              │
              ▼
         User (Menu)
```

**Request (main-bot → core-api):**
```json
POST /api/v1/users/
{
    "telegram_id": 123456789,
    "username": "john_doe",
    "first_name": "John",
    "last_name": "Doe"
}
```

**Response:**
```json
{
    "id": 1,
    "telegram_id": 123456789,
    "username": "john_doe",
    "status": "new",
    "is_trained": false,
    "bonus_channels_count": 0
}
```

---

### 2. Training Initiation Flow

```
User ──► main-bot ──► user-bot ──► Telegram API
              │            │
              │            ▼
              │      [Scrape Posts]
              │            │
              │            ▼
              │      mock-core-api ──► postgres
              │            │
              ▼            ▼
         main-bot ◄── [Posts Data]
              │
              ▼
         User (Posts)
```

**Step 1: main-bot triggers scraping**
```json
POST http://user-bot:8001/cmd/scrape
{
    "channel_username": "@durov",
    "limit": 7
}
```

**Step 2: user-bot syncs to core-api**
```json
POST /api/v1/channels/
{
    "telegram_id": -1001234567890,
    "username": "durov",
    "title": "Durov's Channel"
}
```

```json
POST /api/v1/posts/bulk
{
    "channel_telegram_id": -1001234567890,
    "posts": [
        {
            "telegram_message_id": 12345,
            "text": "Post content...",
            "media_type": "photo",
            "posted_at": "2024-01-15T10:30:00Z"
        }
    ]
}
```

**Step 3: main-bot fetches training posts**
```json
POST /api/v1/posts/training
{
    "user_telegram_id": 123456789,
    "channel_usernames": ["@durov", "@telegram", "@user_channel"],
    "posts_per_channel": 7
}
```

---

### 3. Interaction Recording Flow

```
User ──► main-bot ──► mock-core-api ──► postgres
   or
User ──► miniapp ──► mock-core-api ──► postgres
```

**Request:**
```json
POST /api/v1/posts/interactions
{
    "user_telegram_id": 123456789,
    "post_id": 42,
    "interaction_type": "like"
}
```

**Response:**
```json
{
    "id": 1,
    "user_id": 1,
    "post_id": 42,
    "interaction_type": "like",
    "created_at": "2024-01-15T10:35:00Z"
}
```

---

### 4. ML Training Flow

```
main-bot ──► mock-core-api ──► [Simulate Delay]
                   │
                   ▼
              [Update User Status]
                   │
                   ▼
              [Generate Scores]
                   │
                   ▼
              postgres
```

**Request:**
```json
POST /api/v1/ml/train
{
    "user_telegram_id": 123456789
}
```

**Response (after delay):**
```json
{
    "success": true,
    "message": "Model trained successfully",
    "training_time": 3.14
}
```

---

### 5. Retention Nudge Flow

```
[Timer] ──► main-bot ──► mock-core-api
                 │
                 ▼
            [Best Posts]
                 │
                 ▼
            User (Nudge)
```

**Request:**
```json
POST /api/v1/posts/best
{
    "user_telegram_id": 123456789,
    "limit": 1
}
```

**Response:**
```json
{
    "posts": [
        {
            "id": 42,
            "text": "Trending post content...",
            "channel_title": "Tech News",
            "relevance_score": 0.95
        }
    ]
}
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────────┐       ┌─────────────┐
│    User     │       │   UserChannel   │       │   Channel   │
├─────────────┤       ├─────────────────┤       ├─────────────┤
│ id          │◄──────│ user_id         │       │ id          │
│ telegram_id │       │ channel_id      │──────►│ telegram_id │
│ username    │       │ is_for_training │       │ username    │
│ status      │       │ is_bonus        │       │ title       │
│ is_trained  │       └─────────────────┘       │ is_default  │
│ bonus_count │                                 └──────┬──────┘
└──────┬──────┘                                        │
       │                                               │
       │         ┌─────────────────┐                   │
       │         │   Interaction   │                   │
       │         ├─────────────────┤                   │
       └────────►│ user_id         │                   │
                 │ post_id         │◄──────────────────┤
                 │ interaction_type│                   │
                 └─────────────────┘         ┌─────────┴───────┐
                                             │      Post       │
       ┌─────────────────┐                   ├─────────────────┤
       │    UserLog      │                   │ id              │
       ├─────────────────┤                   │ channel_id      │
       │ user_id         │◄──────────────────│ telegram_msg_id │
       │ action          │                   │ text            │
       │ details         │                   │ relevance_score │
       └─────────────────┘                   └─────────────────┘
```

### User Status State Machine

```
     ┌─────────┐
     │   NEW   │
     └────┬────┘
          │ /start
          ▼
    ┌───────────┐
    │ ONBOARDING│
    └─────┬─────┘
          │ Start Training
          ▼
    ┌───────────┐
    │  TRAINING │
    └─────┬─────┘
          │ Complete Training
          ▼
    ┌───────────┐
    │  TRAINED  │
    └─────┬─────┘
          │ View Feed
          ▼
    ┌───────────┐         ┌─────────┐
    │   ACTIVE  │────────►│ CHURNED │
    └───────────┘ timeout └─────────┘
```

---

## MessageManager Design

### Message Types

| Type | Lifecycle | Deletion | Use Case |
|------|-----------|----------|----------|
| `SYSTEM` | Persistent | On trigger only | Main menu, navigation |
| `EPHEMERAL` | Temporary | After interaction | Confirmations, prompts |
| `ONETIME` | Permanent | Never auto-deleted | Feed posts, content |

### Registry Pattern Implementation

```python
class MessageRegistry:
    """
    Thread-safe registry for tracking messages per chat.
    Structure: {chat_id: {MessageType: [ManagedMessage, ...]}}
    """
    
    _registry: Dict[int, Dict[MessageType, List[ManagedMessage]]]
    _lock: asyncio.Lock
    
    async def register(message: ManagedMessage) -> None
    async def get_messages(chat_id, type, tag) -> List[ManagedMessage]
    async def get_latest(chat_id, type, tag) -> Optional[ManagedMessage]
    async def remove(chat_id, message_id) -> bool
    async def clear_type(chat_id, type) -> List[int]
```

### Usage Example

```python
# Send persistent menu (SYSTEM)
await message_manager.send_system(
    chat_id=123,
    text="Main Menu",
    reply_markup=keyboard,
    tag="menu"
)

# Send confirmation dialog (EPHEMERAL)
await message_manager.send_ephemeral(
    chat_id=123,
    text="Are you sure?",
    auto_delete_after=10.0
)

# Send feed post (ONETIME)
await message_manager.send_onetime(
    chat_id=123,
    text="Post content",
    reply_markup=rating_buttons
)

# Transition: clean ephemeral, update system
await message_manager.transition_to_system(
    chat_id=123,
    text="New Menu State",
    reply_markup=new_keyboard
)
```

---

## Error Handling Strategy

### Service Resilience

1. **Docker Restart Policies**
   - All services use `restart: unless-stopped`
   - PostgreSQL and Redis have health checks

2. **HTTP Client Timeouts**
   - Default: 30 seconds
   - ML training: 60 seconds
   - Configurable per-request

3. **Graceful Degradation**
   - If `user-bot` is unavailable, use cached data
   - If `mock-core-api` fails, show error message
   - MiniApp falls back to mock data

### Error Response Format

```json
{
    "detail": "Error message",
    "status_code": 400
}
```

---

## Security Considerations

1. **Environment Variables**
   - All secrets in `.env` file
   - Never committed to version control

2. **Session String**
   - Telethon session grants full account access
   - Generate on secure machine
   - Rotate periodically

3. **CORS**
   - Currently allows all origins (`*`)
   - In production, restrict to MiniApp domain

4. **Rate Limiting**
   - Telethon handles Telegram rate limits
   - Consider adding API rate limiting

---

## Scaling Considerations

### Horizontal Scaling

| Service | Scalable | Notes |
|---------|----------|-------|
| `mock-core-api` | Yes | Stateless, scale with load balancer |
| `main-bot` | No* | Single instance per bot token |
| `user-bot` | No* | Single instance per session |
| `frontend-miniapp` | Yes | Static files, CDN-ready |
| `postgres` | Yes | Read replicas |
| `redis` | Yes | Cluster mode |

*Bot instances can be scaled with multiple tokens/sessions

### Performance Optimizations

1. **Database Indexes**
   - `telegram_id` on users, channels
   - `(user_id, post_id)` on interactions
   - `relevance_score` on posts

2. **Connection Pooling**
   - SQLAlchemy async: pool_size=10, max_overflow=20
   - HTTP clients: connection reuse

3. **Caching Strategy**
   - Redis for FSM state
   - Consider caching user preferences
   - Cache channel metadata
