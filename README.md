# Website Monitor

Сервис для мониторинга доступности веб-сайтов с проверкой наличия валидного слова в ответе.

## Возможности

- 🔐 Регистрация и авторизация пользователей
- 🌐 Добавление сайтов для мониторинга
- ⚡ Настройка таймаута для каждого сайта
- 🔍 Проверка наличия валидного слова в ответе сайта
- 📊 Отображение статуса сайтов (online/offline/pending/error)
- ✏️ Редактирование и удаление сайтов
- 📈 Статистика по всем сайтам

## Структура проекта

```
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py              # Зависимости (авторизация)
│   │   │   └── v1/
│   │   │       ├── auth.py          # Регистрация и авторизация
│   │   │       └── websites.py      # CRUD для сайтов
│   │   ├── core/
│   │   │   ├── config.py            # Конфигурация
│   │   │   ├── logger.py            # Логирование
│   │   │   └── security.py          # JWT и хеширование паролей
│   │   ├── db/
│   │   │   └── session.py           # Подключение к БД
│   │   ├── models/
│   │   │   ├── user.py              # Модель пользователя
│   │   │   └── website.py           # Модель сайта
│   │   ├── schemas/
│   │   │   ├── token.py             # Схемы токенов
│   │   │   ├── user.py              # Схемы пользователя
│   │   │   └── website.py           # Схемы сайта
│   │   └── main.py                  # Точка входа FastAPI
│   ├── migrations/                  # Миграции Alembic
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── js/
│   │   ├── components/
│   │   │   ├── login.js             # Компонент логина
│   │   │   ├── register.js          # Компонент регистрации
│   │   │   ├── dashboard.js         # Компонент дашборда
│   │   │   ├── website-list.js      # Список сайтов
│   │   │   └── website-modal.js     # Модальное окно добавления/редактирования
│   │   ├── api.js                   # API клиент
│   │   └── app.js                   # Главное Vue приложение
│   ├── index.html
│   └── styles.css
├── docker-compose.yml
├── .env.example
└── README.md
```

## Установка и запуск

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd website-monitor
```

### 2. Настройка окружения

```bash
cp .env.example .env
```

Отредактируйте `.env` файл:

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=website_monitor

# Security
SECRET_KEY=your_very_long_random_secret_key_here
```

### 3. Запуск через Docker

```bash
# Сборка и запуск
docker-compose up -d

# Или используя Makefile
make rebuild-up
```

### 4. Применение миграций

```bash
# Войти в контейнер
docker exec -it tg_monitor_backend bash

# Применить миграции
cd backend
alembic upgrade head
```

### 5. Открыть приложение

- Frontend: http://localhost:8080
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## API Endpoints

### Авторизация

- `POST /api/v1/auth/register` - Регистрация
- `POST /api/v1/auth/login` - Вход
- `GET /api/v1/auth/me` - Текущий пользователь

### Сайты

- `GET /api/v1/websites` - Список сайтов
- `POST /api/v1/websites` - Добавить сайт
- `GET /api/v1/websites/{id}` - Получить сайт
- `PATCH /api/v1/websites/{id}` - Обновить сайт
- `DELETE /api/v1/websites/{id}` - Удалить сайт

## Разработка

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

Просто откройте `frontend/index.html` в браузере или используйте локальный сервер:

```bash
cd frontend
python -m http.server 8080
```

## Создание миграций

```bash
cd backend
alembic revision --autogenerate -m "описание изменений"
alembic upgrade head
```

## Makefile команды

```bash
make build        # Собрать Docker образы
make up           # Запустить сервисы
make down         # Остановить сервисы
make restart      # Перезапустить сервисы
make rebuild-up   # Пересобрать и запустить
```

## Технологии

### Backend
- FastAPI
- SQLAlchemy (async)
- PostgreSQL
- Alembic
- JWT Authentication
- Pydantic

### Frontend
- Vue.js 3
- Axios
- Vanilla CSS

## TODO

- [ ] Реализовать фоновую проверку сайтов (Celery/APScheduler)
- [ ] Добавить историю проверок
- [ ] Уведомления при падении сайтов
- [ ] Графики доступности
- [ ] Экспорт отчетов
