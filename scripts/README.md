# Скрипты

## clear_db_and_qdrant.py

Очищает БД и Qdrant для сброса к начальному состоянию.

**Что очищается (ВСЕ таблицы):**
- `interactions` — все взаимодействия пользователей (лайки/дизлайки/скипы)
- `user_preference_vectors` — векторы предпочтений пользователей
- `user_channels` — связи пользователей с каналами
- `posts` — все посты
- `channels` — все каналы
- `taste_clusters` — кластеры вкусов
- `users` — все пользователи
- Qdrant collection `post_embeddings` — эмбеддинги постов

**Запуск:**
```bash
# Из корня проекта
python3 scripts/clear_db_and_qdrant.py

# Или через Docker (если ml-service запущен)
docker compose exec ml-service python3 /app/../scripts/clear_db_and_qdrant.py
```

**Требования:**
- Переменные окружения из `.env` (DATABASE_URL, QDRANT_HOST, QDRANT_PORT)
- Доступ к БД и Qdrant

**Внимание:** Скрипт удаляет ВСЕ данные из БД (пользователи, каналы, посты, взаимодействия, ML-данные). БД и Qdrant полностью очищаются.
