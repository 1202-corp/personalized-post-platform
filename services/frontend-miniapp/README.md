# Frontend MiniApp

Tinder-style интерфейс для оценки постов в Telegram WebApp.

## Стек

- **HTML/CSS/JS** — vanilla, без фреймворков
- **Telegram WebApp API** — интеграция с Telegram
- **Nginx** — статический сервер

## Структура

```
├── Dockerfile      # Nginx образ
├── nginx.conf      # Конфиг Nginx
├── index.html      # Главная страница
├── styles.css      # Стили (dark theme)
└── script.js       # Логика swipe + API
```

## Функционал

1. **Swipe интерфейс**
   - Свайп вправо → лайк
   - Свайп влево → дизлайк
   - Кнопки 👍/👎/⏭️

2. **Telegram WebApp**
   - Получение `initData` для авторизации
   - Тема из Telegram (dark/light)
   - `MainButton` для завершения

3. **API интеграция**
   - Загрузка постов из core-api
   - Отправка interactions

## Telegram WebApp API

```javascript
// Инициализация
const tg = window.Telegram.WebApp;
tg.ready();

// Данные пользователя
const initData = tg.initData;
const user = tg.initDataUnsafe.user;

// Тема
const isDark = tg.colorScheme === 'dark';

// Главная кнопка
tg.MainButton.setText('Finish Training');
tg.MainButton.show();
tg.MainButton.onClick(() => {
    tg.close();
});
```

## Туннель для HTTPS

MiniApp требует HTTPS. Варианты:

1. **Cloudflare Tunnel** (в docker-compose)
   ```bash
   docker-compose logs tunnel | grep trycloudflare
   ```

2. **localhost.run**
   ```bash
   ssh -R 80:localhost:8080 localhost.run
   ```

3. **Production** — VPS + Let's Encrypt

## Локальный запуск

```bash
cd services/frontend-miniapp
python -m http.server 8080
# или
npx serve -p 8080
```

## Стили

- Dark theme по умолчанию
- Адаптив под Telegram WebApp viewport
- Анимации swipe на CSS transitions

## Деплой

В production URL должен быть:
1. HTTPS
2. Валидный SSL сертификат
3. Доступен из интернета

Обновить `MINIAPP_URL` в `.env` и перезапустить main-bot.
