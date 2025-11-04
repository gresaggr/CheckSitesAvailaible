# ⚡ Quick Start Guide

Запуск проекта за 5 минут!

## 📋 Prerequisites

- Docker & Docker Compose
- Git

## 🚀 Быстрый старт

### 1. Скачать проект

```bash
git clone <your-repo>
cd website-monitor
```

### 2. Настроить окружение

```bash
cp .env.example .env
nano .env  # или vim/code
```

**Обязательно измените:**
```env
POSTGRES_PASSWORD=your_secure_password_here
SECRET_KEY=your_very_long_random_secret_key_here
```

Генерация SECRET_KEY:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

### 3. Запустить

```bash
make rebuild-up
```

Или вручную:
```bash
docker-compose down
docker-compose build
docker-compose up -d
```

### 4. Применить миграции

```bash
docker exec -it website_monitor_backend bash
cd backend
alembic upgrade head
exit
```

### 5. Готово! 🎉

- Frontend: http://localhost:8080
- API Docs: http://localhost:8000/docs
- Flower (опционально): http://localhost:5555

## 📝 Первые шаги

### 1. Зарегистрироваться

Откройте http://localhost:8080 и создайте аккаунт.

### 2. Добавить сайт

```
URL: https://google.com
Valid Word: google
Timeout: 10s
Check Interval: 300s (5 минут)
```

### 3. Наблюдать за статусом

Страница обновляется автоматически каждые 30 секунд.

## 🔔 Telegram уведомления (опционально)

### 1. Создать бота

1. Найти @BotFather в Telegram
2. `/newbot`
3. Скопировать токен

### 2. Добавить токен

```bash
nano .env
```

```env
TELEGRAM_BOT_TOKEN=123456789:ABC-DEF...
```

### 3. Перезапустить

```bash
docker-compose restart backend celery_worker celery_beat
```

### 4. Получить Chat ID

1. Найти @userinfobot
2. Отправить любое сообщение
3. Скопировать Chat ID
4. Указать при добавлении сайта

## 🧪 Тестирование

### Проверить сайт вручную

```bash
curl http://localhost:8000/api/v1/websites
```

### Посмотреть логи

```bash
docker-compose logs -f celery_worker
```

### Проверить задачи в Redis

```bash
docker exec -it website_monitor_redis redis-cli
> KEYS *
```

## 🛑 Остановка

```bash
make down
# или
docker-compose down
```

## 🧹 Полная очистка

```bash
docker-compose down -v  # Удалит все данные!
```

## ⚙️ Настройка интервалов

По умолчанию:
- **Celery Beat** проверяет каждые 60 секунд
- **Check Interval** для сайта: 300 секунд (5 минут)
- **Timeout**: 30 секунд

Изменить в `backend/app/core/celery_app.py`:

```python
"check-all-websites": {
    "task": "app.tasks.monitor.check_all_websites",
    "schedule": 30.0,  # Каждые 30 секунд
},
```

## 📊 Мониторинг

### Посмотреть статус сервисов

```bash
docker-compose ps
```

### Использование ресурсов

```bash
docker stats
```

### Логи в реальном времени

```bash
# Все сервисы
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f celery_worker
```

## 🐛 Проблемы?

### Backend не запускается

```bash
docker-compose logs backend
```

Проверить:
- PostgreSQL запущен: `docker-compose ps postgres`
- Redis запущен: `docker-compose ps redis`

### Celery не работает

```bash
docker-compose logs celery_worker
docker-compose logs celery_beat
```

Перезапустить:
```bash
docker-compose restart celery_worker celery_beat
```

### Frontend не подключается

Проверить CORS в `.env`:
```env
BACKEND_CORS_ORIGINS=["http://localhost:8080"]
```

## 📚 Дальше

- Прочитать [README.md](README.md) для полной документации
- Изучить API в Swagger: http://localhost:8000/docs
- Настроить production deploy

## 💡 Полезные команды

```bash
# Пересобрать и запустить
make rebuild-up

# Просмотр логов
docker-compose logs -f

# Войти в контейнер
docker exec -it website_monitor_backend bash

# Выполнить миграцию
docker exec -it website_monitor_backend alembic -c backend/alembic.ini upgrade head

# Остановить
make down

# Удалить всё
docker-compose down -v
docker system prune -a
```

---

**Готово!** Ваш сервис мониторинга запущен 🚀

Следующий шаг: Добавьте свои сайты и настройте Telegram уведомления!
