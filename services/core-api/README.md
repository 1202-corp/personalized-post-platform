# Mock Core API

FastAPI бэкенд с ML-сервисом для рекомендаций.

## Стек

- **FastAPI** — REST API
- **SQLAlchemy 2.0** — ORM (async)
- **PostgreSQL** — основная БД
- **Qdrant** — векторная БД для эмбеддингов
- **httpx** — HTTP клиент для API эмбеддингов

## Структура

```
app/
├── main.py              # Точка входа, FastAPI app
├── config.py            # Настройки из env
├── database.py          # Async SQLAlchemy сессия
├── models.py            # SQLAlchemy модели
├── schemas.py           # Pydantic схемы
├── logging_config.py    # Конфигурация логирования
├── routers/
│   ├── users.py         # CRUD пользователей
│   ├── channels.py      # CRUD каналов
│   ├── posts.py         # CRUD постов + interactions
│   ├── ml.py            # Train/predict эндпоинты
│   ├── analytics.py     # Аналитика и метрики
│   ├── ab_testing.py    # A/B тестирование
│   └── admin.py         # Админ операции
└── services/
    ├── user_service.py       # Логика пользователей
    ├── channel_service.py    # Логика каналов
    ├── post_service.py       # Логика постов
    ├── ml_service.py         # ML pipeline
    ├── embedding_service.py  # Генерация эмбеддингов
    ├── qdrant_service.py     # Работа с Qdrant
    ├── analytics_service.py  # Сервис аналитики
    └── ab_testing_service.py # Сервис A/B тестов
alembic/
├── env.py               # Конфигурация Alembic
├── script.py.mako       # Шаблон миграций
└── versions/            # Файлы миграций
```

## ML Pipeline

1. **Генерация эмбеддингов** (`embedding_service.py`)
   - Используется OpenAI-совместимый API (bothub.chat)
   - Модель: `text-embedding-ada-002` (1536 dim)
   - Batch обработка для эффективности

2. **Хранение векторов** (`qdrant_service.py`)
   - Коллекция `post_embeddings`
   - Payload: `post_id`, `channel_id`
   - Cosine similarity для поиска

3. **Обучение** (`ml_service.py`)
   - Preference vector = avg(liked) - 0.5*avg(disliked)
   - Минимум 10 interactions для обучения
   - Relevance score = cosine_similarity с preference vector

## API Endpoints

### Users
| Method | Endpoint | Описание |
|--------|----------|----------|
| POST | `/api/v1/users/` | Создать/получить пользователя |
| GET | `/api/v1/users/{id}` | Получить по telegram_id |
| PATCH | `/api/v1/users/{id}` | Обновить пользователя |

### Channels
| Method | Endpoint | Описание |
|--------|----------|----------|
| POST | `/api/v1/channels/` | Создать канал |
| GET | `/api/v1/channels/defaults` | Дефолтные каналы |
| POST | `/api/v1/channels/user-channel` | Привязать канал к юзеру |

### Posts
| Method | Endpoint | Описание |
|--------|----------|----------|
| POST | `/api/v1/posts/bulk` | Bulk создание постов |
| POST | `/api/v1/posts/training` | Посты для обучения |
| POST | `/api/v1/posts/interactions` | Записать лайк/дизлайк |
| POST | `/api/v1/posts/best` | Лучшие посты для юзера |

### ML
| Method | Endpoint | Описание |
|--------|----------|----------|
| POST | `/api/v1/ml/train` | Обучить модель для юзера |
| GET | `/api/v1/ml/eligibility/{id}` | Готов ли юзер к обучению |

### Analytics
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/v1/analytics/dashboard` | Полный дашборд |
| GET | `/api/v1/analytics/overview` | Общая статистика |
| GET | `/api/v1/analytics/daily?days=7` | Статистика по дням |
| GET | `/api/v1/analytics/channels` | Топ каналов |
| GET | `/api/v1/analytics/retention` | Retention метрики |
| GET | `/api/v1/analytics/recommendations` | Эффективность ML |

### A/B Testing
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/v1/ab-testing/config` | Текущий конфиг теста |
| POST | `/api/v1/ab-testing/config` | Обновить конфиг |
| GET | `/api/v1/ab-testing/results` | Результаты по вариантам |
| GET | `/api/v1/ab-testing/user/{id}/variant` | Вариант юзера |

### Admin
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/v1/admin/users` | Список юзеров |
| GET | `/api/v1/admin/users/{id}` | Детали юзера |
| PATCH | `/api/v1/admin/users/{id}` | Обновить юзера |
| DELETE | `/api/v1/admin/users/{id}` | Удалить юзера |
| GET | `/api/v1/admin/channels` | Список каналов |
| DELETE | `/api/v1/admin/channels/{id}` | Удалить канал |
| POST | `/api/v1/admin/reset-training/{id}` | Сбросить обучение |

### Health
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/health` | Liveness check |
| GET | `/health/ready` | Readiness (postgres, qdrant) |

## Локальный запуск

```bash
cd services/mock-core-api
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Database Migrations (Alembic)

```bash
# Просмотр текущей версии
alembic current

# Генерация новой миграции
alembic revision --autogenerate -m "add new column"

# Применить все миграции
alembic upgrade head

# Откатить последнюю миграцию
alembic downgrade -1

# Откатить до начала
alembic downgrade base
```

## Логирование

Логи пишутся в `/var/log/ppb/core-api.log` с ротацией:
- Макс. размер файла: 10MB
- Количество бэкапов: 5

```bash
# Просмотр логов
cat /var/log/ppb/core-api.log

# Tail логов
tail -f /var/log/ppb/core-api.log
```

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| `DATABASE_URL` | PostgreSQL connection string |
| `OPENAI_API_BASE` | URL для эмбеддингов API |
| `OPENAI_API_KEY` | API ключ |
| `QDRANT_HOST` | Хост Qdrant |
| `QDRANT_PORT` | Порт Qdrant |
| `LOG_LEVEL` | Уровень логирования (INFO, DEBUG, WARNING) |
| `LOG_DIR` | Директория для логов |
