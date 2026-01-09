# Команды для запуска проекта

## 🚀 Быстрый старт

```bash
# 1. Запустить все сервисы
docker-compose up -d --build

# 2. Запустить туннель для MiniApp
./scripts/start-ngrok.sh

# 3. Получить URL туннеля
docker logs ppb-tunnel 2>&1 | grep -oE "https://[a-z0-9]+\.lhr\.life" | head -1

# 4. Обновить MINIAPP_URL в .env (заменить <URL> на полученный URL)
sed -i '' 's|^MINIAPP_URL=.*|MINIAPP_URL=<URL>|' .env

# 5. Перезапустить main-bot для применения нового URL
docker-compose restart main-bot
```

---

## 📦 Docker Compose

### Запуск сервисов
```bash
# Запустить все сервисы
docker-compose up -d

# Запустить с пересборкой
docker-compose up -d --build

# Запустить конкретный сервис
docker-compose up -d mock-core-api
docker-compose up -d main-bot
docker-compose up -d user-bot
docker-compose up -d frontend-miniapp
```

### Остановка сервисов
```bash
# Остановить все сервисы
docker-compose down

# Остановить с удалением volumes (ОСТОРОЖНО - удалит данные!)
docker-compose down -v

# Остановить конкретный сервис
docker-compose stop main-bot
```

### Перезапуск сервисов
```bash
# Перезапустить все
docker-compose restart

# Перезапустить конкретный сервис
docker-compose restart main-bot
docker-compose restart mock-core-api
```

### Пересборка сервисов
```bash
# Пересобрать все
docker-compose build

# Пересобрать конкретный сервис
docker-compose build mock-core-api

# Пересобрать без кеша
docker-compose build --no-cache mock-core-api
```

---

## 📋 Логи

```bash
# Логи всех сервисов
docker-compose logs

# Логи конкретного сервиса
docker-compose logs main-bot
docker-compose logs mock-core-api
docker-compose logs user-bot

# Следить за логами в реальном времени
docker-compose logs -f main-bot
docker-compose logs -f mock-core-api

# Последние N строк логов
docker-compose logs --tail=100 main-bot

# Логи туннеля
docker logs ppb-tunnel
```

---

## 🌐 Туннель (для MiniApp)

```bash
# Запустить туннель
./scripts/start-ngrok.sh

# Получить URL туннеля
docker logs ppb-tunnel 2>&1 | grep -oE "https://[a-z0-9]+\.lhr\.life" | head -1

# Остановить туннель
docker-compose -f docker-compose.ngrok.yml down
```

---

## 🗄️ База данных

### PostgreSQL
```bash
# Подключиться к PostgreSQL
docker exec -it ppb-postgres psql -U ppb_user -d ppb_db

# Очистить все таблицы (сброс данных)
docker exec ppb-postgres psql -U ppb_user -d ppb_db -c "TRUNCATE TABLE user_logs, interactions, user_channels, posts, channels, users RESTART IDENTITY CASCADE;"

# Посмотреть пользователей
docker exec ppb-postgres psql -U ppb_user -d ppb_db -c "SELECT * FROM users;"

# Посмотреть посты
docker exec ppb-postgres psql -U ppb_user -d ppb_db -c "SELECT * FROM posts LIMIT 10;"

# Посмотреть взаимодействия
docker exec ppb-postgres psql -U ppb_user -d ppb_db -c "SELECT * FROM interactions;"
```

### Qdrant (Vector DB)
```bash
# Удалить коллекцию эмбеддингов
curl -X DELETE "http://localhost:6333/collections/post_embeddings"

# Посмотреть коллекции
curl "http://localhost:6333/collections"

# Информация о коллекции
curl "http://localhost:6333/collections/post_embeddings"
```

### Redis
```bash
# Подключиться к Redis
docker exec -it ppb-redis redis-cli

# Очистить Redis
docker exec ppb-redis redis-cli FLUSHALL
```

---

## 🔍 API Тестирование

### Health Check
```bash
curl http://localhost:8000/health
```

### Пользователи
```bash
# Получить пользователя
curl http://localhost:8000/api/v1/users/895475191

# Создать пользователя
curl -X POST http://localhost:8000/api/v1/users/ \
  -H "Content-Type: application/json" \
  -d '{"telegram_id": 123456789, "username": "testuser"}'
```

### ML Endpoints
```bash
# Проверить готовность к обучению
curl http://localhost:8000/api/v1/ml/eligibility/895475191

# Обучить модель
curl -X POST http://localhost:8000/api/v1/ml/train \
  -H "Content-Type: application/json" \
  -d '{"user_telegram_id": 895475191}'

# Получить рекомендации
curl -X POST http://localhost:8000/api/v1/ml/recommendations \
  -H "Content-Type: application/json" \
  -d '{"user_telegram_id": 895475191, "limit": 5}'

# Предсказать релевантность
curl -X POST http://localhost:8000/api/v1/ml/predict \
  -H "Content-Type: application/json" \
  -d '{"user_telegram_id": 895475191, "post_ids": [1, 2, 3]}'
```

### Каналы
```bash
# Дефолтные каналы
curl http://localhost:8000/api/v1/channels/defaults

# Каналы пользователя
curl http://localhost:8000/api/v1/channels/user/895475191
```

### Посты
```bash
# Лучшие посты для пользователя
curl -X POST http://localhost:8000/api/v1/posts/best \
  -H "Content-Type: application/json" \
  -d '{"user_telegram_id": 895475191, "limit": 5}'

# Посты для тренировки
curl -X POST http://localhost:8000/api/v1/posts/training \
  -H "Content-Type: application/json" \
  -d '{"user_telegram_id": 895475191, "channel_usernames": ["@durov"], "posts_per_channel": 5}'
```

---

## 🔧 Отладка

```bash
# Статус контейнеров
docker ps --format "table {{.Names}}\t{{.Status}}"

# Войти в контейнер
docker exec -it ppb-main-bot /bin/bash
docker exec -it ppb-core-api /bin/bash

# Проверить ошибки в логах
docker logs ppb-core-api 2>&1 | grep -i "error\|exception"
docker logs ppb-main-bot 2>&1 | grep -i "error\|exception"

# Использование ресурсов
docker stats
```

---

## 🧹 Полная очистка

```bash
# Остановить всё
docker-compose down
docker-compose -f docker-compose.ngrok.yml down

# Удалить volumes (данные)
docker-compose down -v

# Удалить все образы проекта
docker rmi $(docker images | grep personalized-post-bot | awk '{print $3}')

# Очистить Docker полностью (ОСТОРОЖНО!)
docker system prune -a
```

---

## 📍 Полезные URL

| Сервис | URL |
|--------|-----|
| Core API | http://localhost:8000 |
| Core API Docs | http://localhost:8000/docs |
| Qdrant Dashboard | http://localhost:6333/dashboard |
| MiniApp (локально) | http://localhost:3000 |
| MiniApp (туннель) | https://xxx.lhr.life |

---

## ⚡ Однострочники

```bash
# Полный рестарт с очисткой БД
docker-compose down && docker-compose up -d --build && sleep 5 && docker exec ppb-postgres psql -U ppb_user -d ppb_db -c "TRUNCATE TABLE user_logs, interactions, user_channels, posts, channels, users RESTART IDENTITY CASCADE;" && curl -X DELETE "http://localhost:6333/collections/post_embeddings"

# Проверить что всё работает
curl -s http://localhost:8000/health && echo " ✅ API OK"

# Следить за логами main-bot и core-api одновременно
docker-compose logs -f main-bot mock-core-api
```
