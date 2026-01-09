# User Bot

Telethon-based скрейпер каналов с HTTP API.

## Стек

- **Telethon** — MTProto клиент
- **FastAPI** — HTTP API
- **Session String** — авторизация без интерактива

## Структура

```
app/
├── main.py            # FastAPI приложение
├── config.py          # Настройки из env
└── telethon_client.py # Telethon клиент + методы
```

## API Endpoints

| Method | Endpoint | Описание |
|--------|----------|----------|
| POST | `/cmd/scrape` | Скрейпинг постов канала |
| POST | `/cmd/join` | Присоединиться к каналу |
| GET | `/cmd/get_photo/{channel}/{msg_id}` | Скачать фото |
| GET | `/cmd/get_video/{channel}/{msg_id}` | Скачать видео |
| GET | `/health` | Health check |

## Скрейпинг

```python
POST /cmd/scrape
{
    "channel_username": "durov",
    "limit": 50
}
```

Возвращает посты с:
- `telegram_message_id`
- `text`
- `media_type` (photo/video/other)
- `media_file_id` (для альбомов — через запятую)
- `posted_at`

## Медиа

```python
# Фото
GET /cmd/get_photo/durov/123
# Возвращает bytes изображения

# Видео
GET /cmd/get_video/durov/456
# Возвращает bytes видео (timeout 30s)
```

## Генерация Session String

```bash
pip install telethon
python scripts/generate_session.py
```

Скрипт запросит:
1. API ID
2. API Hash
3. Номер телефона
4. Код подтверждения

Результат — base64 строка для `TELEGRAM_SESSION_STRING`.

## Локальный запуск

```bash
cd services/user-bot
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| `TELEGRAM_API_ID` | API ID от my.telegram.org |
| `TELEGRAM_API_HASH` | API Hash |
| `TELEGRAM_SESSION_STRING` | Session string |
| `CORE_API_URL` | URL mock-core-api |

## Важно

- Session string привязан к аккаунту — не шарить!
- При бане аккаунта нужен новый session string
- Рекомендуется использовать отдельный аккаунт для скрейпинга
