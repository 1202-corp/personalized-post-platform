# Personalized Post Bot

> [English version](../README.md)

Telegram-бот для персонализированной агрегации новостей из каналов с использованием ML-рекомендаций на основе векторных эмбеддингов. Микросервисная архитектура на Docker Compose.

## Обзор

Personalized Post Bot состоит из нескольких компонентов, которые работают вместе для предоставления персонализированных рекомендаций постов:

- **API**: Backend сервис с ML-рекомендациями на основе векторных эмбеддингов
- **Main Bot**: Telegram бот на Aiogram 3.x с реализацией AARRR воронки
- **User Bot**: Telethon-based скрейпер с HTTP API для скрейпинга каналов
- **MiniApp**: Tinder-style swipe интерфейс для оценки постов в Telegram WebApp
- **Admin Dashboard**: Панель мониторинга со статусом сервисов и аналитикой

## Ключевые функции

- Персонализированные рекомендации постов с использованием ML и векторных эмбеддингов
- Реализация AARRR воронки (Acquisition, Activation, Training, Revenue, Retention)
- Скрейпинг каналов и агрегация постов
- Флоу обучения пользователей со swipe интерфейсом
- Аналитика и A/B тестирование
- Рекомендации в реальном времени на основе предпочтений пользователя

## Архитектура

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

## Компоненты

- [API](https://github.com/1202-corp/personalized-post-api) - Backend API с ML сервисом
- [Bot Services](https://github.com/1202-corp/personalized-post-telegram-bot) - Сервисы ботов (main-bot, user-bot)
- [Frontend Services](https://github.com/1202-corp/personalized-post-frontend) - Фронтенд сервисы (miniapp, admin-dashboard)

## Быстрый старт

### Требования

- Docker & Docker Compose
- Telegram Bot Token ([@BotFather](https://t.me/BotFather))
- Telegram API credentials ([my.telegram.org](https://my.telegram.org))
- OpenAI-совместимый API ключ для эмбеддингов (bothub.chat, OpenAI, etc.)

### Конфигурация

```bash
cp .env.example .env
nano .env
```

**Обязательные переменные:**
| Переменная | Описание |
|-----------|----------|
| `TELEGRAM_BOT_TOKEN` | Токен бота от BotFather |
| `TELEGRAM_API_ID` | API ID от my.telegram.org |
| `TELEGRAM_API_HASH` | API Hash от my.telegram.org |
| `TELEGRAM_SESSION_STRING` | Сессия Telethon (см. ниже) |
| `OPENAI_API_KEY` | API ключ для эмбеддингов |

### Генерация Telethon Session

```bash
pip install telethon
python scripts/generate_session.py
```

### Запуск

```bash
# Запустить все сервисы
docker-compose up -d --build

# Посмотреть логи
docker-compose logs -f main-bot
```

### Доступ к сервисам

| URL | Описание |
|-----|----------|
| http://localhost:8000/docs | API документация |
| http://localhost:8080 | MiniApp (локально) |
| http://localhost:8001/docs | User Bot API |
| http://localhost:5050 | pgAdmin (БД) |
| http://localhost:6333/dashboard | Qdrant UI |

## Пользовательский флоу (AARRR)

1. **Acquisition**: `/start` → приветствие
2. **Activation**: Онбординг → добавление своего канала
3. **Training**: Оценка постов (👍/👎/⏭️) из 3 каналов
4. **Revenue**: Бонусный канал после обучения
5. **Retention**: Персонализированные посты неактивным юзерам

## ML Pipeline

1. Скрейпинг постов → 2. Генерация эмбеддингов → 3. Сохранение в Qdrant
4. Пользователь лайкает/дизлайкает посты
5. Вычисление preference vector = avg(liked) - avg(disliked)
6. Рекомендации = cosine_similarity(preference_vector, post_embeddings)
