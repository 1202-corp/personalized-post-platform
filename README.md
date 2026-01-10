# Personalized Post Bot

> [Русская версия](docs/README-RU.md)

A Telegram bot for personalized news aggregation from channels using ML recommendations based on vector embeddings. Microservices architecture on Docker Compose.

## Overview

Personalized Post Bot consists of several components that work together to provide personalized post recommendations:

- **API**: Backend service with ML recommendations based on vector embeddings
- **Main Bot**: Telegram bot built with Aiogram 3.x implementing AARRR funnel
- **User Bot**: Telethon-based scraper service with HTTP API for channel scraping
- **MiniApp**: Tinder-style swipe interface for post rating in Telegram WebApp
- **Admin Dashboard**: Monitoring dashboard with service status and analytics

## Key Features

- Personalized post recommendations using ML and vector embeddings
- AARRR funnel implementation (Acquisition, Activation, Training, Revenue, Retention)
- Channel scraping and post aggregation
- User training flow with swipe interface
- Analytics and A/B testing
- Real-time recommendations based on user preferences

## Architecture

```
┌─────────────────┐     HTTP/REST      ┌──────────────────┐     Vectors     ┌──────────────┐
│   main-bot      │◄──────────────────►│       api       │◄───────────────►│    Qdrant    │
│   (Aiogram 3)   │                    │  (FastAPI + ML)  │                 │  (embeddings)│
└────────┬────────┘                    └────────┬─────────┘                 └──────────────┘
         │                                      │
         │ HTTP /cmd/*                          │ PostgreSQL
         ▼                                      ▼
┌─────────────────┐                    ┌──────────────────┐
│   user-bot      │                    │    postgres      │
│   (Telethon)    │                    │                  │
└────────────────┘                    └──────────────────┘
         
┌─────────────────┐
│ miniapp│
│   (HTML/JS)     │
└─────────────────┘
```

## Components

- [API](https://github.com/1202-corp/personalized-post-api) - Backend API with ML service
- [Bot Services](https://github.com/1202-corp/personalized-post-telegram-bot) - Bot services (main-bot, user-bot)
- [Frontend Services](https://github.com/1202-corp/personalized-post-frontend) - Frontend services (miniapp, admin-dashboard)

## Quick Start

### Requirements

- Docker & Docker Compose
- Telegram Bot Token ([@BotFather](https://t.me/BotFather))
- Telegram API credentials ([my.telegram.org](https://my.telegram.org))
- OpenAI-compatible API key for embeddings (bothub.chat, OpenAI, etc.)

### Configuration

```bash
cp .env.example .env
nano .env
```

**Required variables:**
| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Bot token from BotFather |
| `TELEGRAM_API_ID` | API ID from my.telegram.org |
| `TELEGRAM_API_HASH` | API Hash from my.telegram.org |
| `TELEGRAM_SESSION_STRING` | Telethon session (see below) |
| `OPENAI_API_KEY` | API key for embeddings |

### Generate Telethon Session

```bash
pip install telethon
python scripts/generate_session.py
```

### Run

```bash
# Start all services
docker-compose up -d --build

# View logs
docker-compose logs -f main-bot
```

### Access Services

| URL | Description |
|-----|-------------|
| http://localhost:8000/docs | API documentation |
| http://localhost:8080 | MiniApp (locally) |
| http://localhost:8001/docs | User Bot API |
| http://localhost:5050 | pgAdmin (database) |
| http://localhost:6333/dashboard | Qdrant UI |

## User Flow (AARRR)

1. **Acquisition**: `/start` → welcome message
2. **Activation**: Onboarding → add user channel
3. **Training**: Rate posts (👍/👎/⏭️) from 3 channels
4. **Revenue**: Bonus channel after training
5. **Retention**: Personalized posts for inactive users

## ML Pipeline

1. Post scraping → 2. Embedding generation → 3. Storage in Qdrant
4. User likes/dislikes posts
5. Preference vector calculation = avg(liked) - avg(disliked)
6. Recommendations = cosine_similarity(preference_vector, post_embeddings)

## Documentation

- [Russian documentation](docs/README-RU.md)
