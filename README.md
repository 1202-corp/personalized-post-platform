# Personalized Post Bot (example: [@mmyyyyau_bot](https://t.me/mmyyyyau_bot))

Telegram-бот для персонализированной агрегации новостей из каналов с использованием ML-рекомендаций на основе векторных эмбеддингов. Микросервисная архитектура на Docker Compose.

## Архитектура

```
┌─────────────────┐     HTTP/REST      ┌──────────────────┐     Vectors     ┌──────────────┐
│   main-bot      │◄──────────────────►│     core-api     │◄───────────────►│    Qdrant    │
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
│ frontend-miniapp│
│   (HTML/JS)     │
└─────────────────┘
```

## Сервисы

|       Сервис      | Порт |                Описание                  |
|-------------------|------|------------------------------------------|
| `core-api`        | 8000 | FastAPI бэкенд + ML сервис               |
| `main-bot`        | -    | Aiogram 3.x Telegram бот (AARRR воронка) |
| `user-bot`        | 8001 | Telethon скрейпер с HTTP API             |
| `frontend-miniapp`| 8080 | Tinder-style интерфейс для оценки постов |
| `postgres`        | 5432 | PostgreSQL база данных                   |
| `redis`           | 6379 | Redis для кэширования                    |
| `qdrant`          | 6333 | Векторная БД для эмбеддингов             |
| `pgadmin`         | 5050 | Веб-интерфейс для БД                     |

## Быстрый старт

### 1. Требования

- Docker & Docker Compose
- Telegram Bot Token ([@BotFather](https://t.me/BotFather))
- Telegram API credentials ([my.telegram.org](https://my.telegram.org))
- OpenAI-совместимый API ключ для эмбеддингов (bothub.chat, OpenAI, etc.)

### 2. Конфигурация

```bash
cp .env.example .env
nano .env
```

**Обязательные переменные:**
|         Переменная        |           Описание         |
|---------------------------|----------------------------|
| `TELEGRAM_BOT_TOKEN`      | Токен бота от BotFather    |
| `TELEGRAM_API_ID`         | API ID от my.telegram.org  |
| `TELEGRAM_API_HASH`       | API Hash от my.telegram.org|
| `TELEGRAM_SESSION_STRING` | Сессия Telethon (см. ниже) |
| `OPENAI_API_KEY`          | API ключ для эмбеддингов   |

### 3. Генерация Telethon Session

```bash
pip install telethon
python scripts/generate_session.py
```

### 4. Запуск

```bash
# Запустить все сервисы
docker-compose up -d --build

# Посмотреть логи
docker-compose logs -f main-bot

# Получить URL туннеля для MiniApp
docker-compose logs tunnel | grep trycloudflare

# Обновить MINIAPP_URL в .env и перезапустить
docker-compose up -d main-bot
```

### 5. Доступ к сервисам

|               URL               |      Описание      |
|---------------------------------|--------------------|
| http://localhost:8000/docs      | API документация   |
| http://localhost:8080           | MiniApp (локально) |
| http://localhost:8001/docs      | User Bot API       |
| http://localhost:5050           | pgAdmin (БД)       |
| http://localhost:6333/dashboard | Qdrant UI          |

## Пользовательский флоу (AARRR)

1. **Acquisition**: `/start` → приветствие
2. **Activation**: Онбординг → добавление своего канала
3. **Training**: Оценка постов (👍/👎/⏭️) из 3 каналов
4. **Revenue**: Бонусный канал после обучения
5. **Retention**: Персонализированные посты неактивным юзерам

## ML Pipeline

```
1. Скрейпинг постов → 2. Генерация эмбеддингов → 3. Сохранение в Qdrant
                                ↓
4. Пользователь лайкает/дизлайкает посты
                                ↓
5. Вычисление preference vector = avg(liked) - avg(disliked)
                                ↓
6. Рекомендации = cosine_similarity(preference_vector, post_embeddings)
```

## Структура проекта

```
├── docker-compose.yml          # Все сервисы
├── .env.example                # Пример конфигурации
├── COMMANDS.md                 # Полезные команды
├── docs/
│   ├── ARCHITECTURE.md         # Детальная архитектура
│   └── MINIAPP_SETUP.md        # Настройка туннеля
├── scripts/
│   └── generate_session.py     # Генератор Telethon сессии
└── services/
    ├── core-api/          # Бэкенд + ML
    │   └── app/
    │       ├── routers/        # API эндпоинты
    │       └── services/       # Бизнес-логика + ML
    ├── main-bot/               # Telegram бот
    │   └── bot/
    │       ├── handlers/       # Обработчики команд
    │       ├── message_manager.py  # Registry Pattern
    │       └── retention.py    # Retention сервис
    ├── user-bot/               # Telethon скрейпер
    └── frontend-miniapp/       # Swipe UI
```

## API Endpoints

### Core API (`core-api`)

#### Users
- `POST /api/v1/users/` - Create or get user
- `GET /api/v1/users/{telegram_id}` - Get user
- `PATCH /api/v1/users/{telegram_id}` - Update user
- `POST /api/v1/users/activity` - Update activity
- `POST /api/v1/users/logs` - Create log

#### Channels
- `POST /api/v1/channels/` - Create channel
- `GET /api/v1/channels/defaults` - Get default channels
- `POST /api/v1/channels/user-channel` - Add user channel

#### Posts
- `POST /api/v1/posts/` - Create post
- `POST /api/v1/posts/bulk` - Bulk create posts
- `POST /api/v1/posts/training` - Get training posts
- `POST /api/v1/posts/interactions` - Create interaction
- `POST /api/v1/posts/best` - Get best posts

#### ML (Mock)
- `POST /api/v1/ml/train` - Train model
- `POST /api/v1/ml/predict` - Get predictions
- `GET /api/v1/ml/eligibility/{telegram_id}` - Check eligibility

#### Analytics
- `GET /api/v1/analytics/dashboard` - Полный дашборд со всеми метриками
- `GET /api/v1/analytics/overview` - Общая статистика (users, posts, interactions)
- `GET /api/v1/analytics/daily?days=7` - Статистика по дням
- `GET /api/v1/analytics/channels?limit=10` - Топ каналов по активности
- `GET /api/v1/analytics/retention?days=7` - Метрики retention
- `GET /api/v1/analytics/recommendations` - Эффективность рекомендаций

#### A/B Testing
- `GET /api/v1/ab-testing/config` - Текущая конфигурация теста
- `POST /api/v1/ab-testing/config` - Обновить конфигурацию
- `GET /api/v1/ab-testing/results` - Результаты теста по вариантам
- `GET /api/v1/ab-testing/user/{user_id}/variant` - Вариант для юзера

#### Admin
- `GET /api/v1/admin/users` - Список юзеров с пагинацией
- `GET /api/v1/admin/users/{id}` - Детали юзера с каналами и статистикой
- `PATCH /api/v1/admin/users/{id}` - Обновить юзера
- `DELETE /api/v1/admin/users/{id}` - Удалить юзера
- `GET /api/v1/admin/channels` - Список каналов
- `PATCH /api/v1/admin/channels/{id}` - Обновить канал
- `DELETE /api/v1/admin/channels/{id}` - Удалить канал
- `POST /api/v1/admin/reset-training/{id}` - Сбросить обучение юзера
- `POST /api/v1/admin/clear-all-data?confirm=true` - Очистить все данные

#### Health Checks
- `GET /health` - Базовая проверка (liveness)
- `GET /health/ready` - Проверка зависимостей (readiness)

### User Bot (`user-bot`)

- `POST /cmd/scrape` - Scrape channel messages
- `POST /cmd/join` - Join a channel
- `GET /health` - Базовая проверка
- `GET /health/ready` - Проверка Telethon и core-api
- `GET /media/photo?channel_username=X&message_id=Y` - Получить фото
- `GET /media/video?channel_username=X&message_id=Y` - Получить видео

## MessageManager (Registry Pattern)

The `MessageManager` class in `main-bot` implements a strict registry pattern for managing three message types:

|     Type    |           Behavior           |        Example       |
|-------------|------------------------------|----------------------|
|  `SYSTEM`   | Persistent, edited in place  |        Main menu     |
| `EPHEMERAL` | Deleted after interaction    | Confirmation dialogs |
| `ONETIME`   | Kept in history | Feed posts |

Key methods:
- `send_system()` - Send/edit system message
- `send_ephemeral()` - Send temporary message
- `send_onetime()` - Send permanent feed post
- `delete_ephemeral()` - Clean up temporary messages
- `transition_to_system()` - Clean up and switch to system message

## Development

### Running Tests
```bash
# Run API tests
docker-compose exec core-api pytest

# Run bot tests
docker-compose exec main-bot pytest
```

### Database Migrations (Alembic)
```bash
# Просмотр текущей версии
docker exec ppb-core-api alembic current

# Генерация миграции
docker exec ppb-core-api alembic revision --autogenerate -m "description"

# Применить миграции
docker exec ppb-core-api alembic upgrade head

# Откатить миграцию
docker exec ppb-core-api alembic downgrade -1
```

### Логирование

Логи сохраняются в `/var/log/ppb/` с ротацией (10MB, 5 файлов):

```bash
# Просмотр логов из файла
docker exec ppb-core-api cat /var/log/ppb/core-api.log
docker exec ppb-main-bot cat /var/log/ppb/main-bot.log

# Docker логи (stdout)
docker-compose logs -f main-bot
docker-compose logs -f core-api
```

### Health Checks

```bash
# Core API - проверка всех зависимостей
curl http://localhost:8000/health/ready
# {"service":"core-api","postgres":"healthy","qdrant":"healthy","status":"healthy"}

# User Bot - проверка Telethon и API
curl http://localhost:8001/health/ready
# {"service":"user-bot","telethon":"healthy","core_api":"healthy","status":"healthy"}
```

## Полезные команды

```bash
# Просмотр таблиц в БД
docker exec ppb-postgres psql -U ppb_user -d ppb_db -c "\dt"

# Топ постов по relevance
docker exec ppb-postgres psql -U ppb_user -d ppb_db -c "SELECT id, relevance_score FROM posts WHERE relevance_score IS NOT NULL ORDER BY relevance_score DESC LIMIT 10;"

# Очистка БД
docker exec ppb-postgres psql -U ppb_user -d ppb_db -c "TRUNCATE TABLE user_logs, interactions, user_channels, posts, channels, users RESTART IDENTITY CASCADE;"

# Перезапуск бота
docker-compose restart main-bot
```

## Лицензия

MIT
