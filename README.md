# Schema Flo

Персональный трекер психологического состояния, менструального цикла и практик самоподдержки.

Стек: React + Vite + Node.js + Express + PostgreSQL.

> AI-функциональность в коде есть, но не подключена к навигации и не входит в текущий этап.

---

## Что умеет приложение

- Ежедневный дневник настроения
- Отслеживание активных схем (схема-терапия)
- Трекер менструального цикла
- Библиотека практик самоподдержки
- История записей
- Авторизация (email + Google OAuth)
- Backend API + PostgreSQL-хранилище

---

## Статус проекта

Проект находится в активной разработке.

Текущий фокус:
1. Стабилизировать связку frontend ↔ backend ↔ PostgreSQL
2. Довести авторизацию через Google
3. Разделить личную версию (с деплоем) и корпоративную (без внешнего деплоя)
4. Добавить проверки качества и безопасности

---

## Технологии

**Frontend:** React, Vite, JavaScript, CSS  
**Backend:** Node.js, Express, PostgreSQL, JWT, bcryptjs, Google OAuth  
**Инфраструктура:** Docker Compose, PostgreSQL 16, pgAdmin  
**Деплой:** Vercel (фронтенд), Render (бэкенд), Gitea (корпоративная версия)

---

## Структура проекта

```txt
schema-flo/
├── backend/
│   ├── db.js                     # Подключение к PostgreSQL
│   ├── migrate.js                # Запуск SQL-миграций
│   ├── server.js                 # Express API
│   ├── Dockerfile
│   ├── .env.example
│   └── migrations/
│       ├── 001_init.sql
│       ├── 002_hardening.sql
│       ├── 003_frontend_state.sql
│       └── 005_google_oauth.sql
│
├── frontend/
│   ├── App.jsx
│   ├── components/
│   ├── constants/
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useCycle.js
│   │   ├── useDiary.js
│   │   ├── useHistory.js
│   │   └── useSilence.js
│   ├── screens/
│   │   ├── LoginScreen.jsx
│   │   ├── RegisterScreen.jsx
│   │   ├── HomeScreen.jsx
│   │   ├── HistoryScreen.jsx
│   │   ├── PracticesScreen.jsx
│   │   └── LogDetailScreen.jsx
│   └── services/
│       ├── authApi.js
│       ├── db.js
│       └── migrate.js
│
├── docker-compose.yml
├── package.json
└── README.md
```

---

## Локальный запуск

### Требования

Перед началом установи:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — программа для запуска контейнеров. Включает всё необходимое.
- [Git](https://git-scm.com/) — система контроля версий для клонирования репозитория.

Node.js на машине **не нужен** — всё запускается внутри Docker.

---

### Шаг 1 — Клонировать репозиторий

```bash
git clone <URL-репозитория>
cd schema-flo
```

---

### Шаг 2 — Запустить

```bash
docker compose up --build
```

**Первый запуск занимает 3–10 минут** — Docker скачивает образы и устанавливает зависимости. Это нормально, последующие запуски займут 10–30 секунд.

Когда всё готово, в терминале появится:
schema-flo-frontend  | ➜  Local:   http://localhost:5173/

---

### Шаг 3 — Открыть в браузере

| Сервис      | Адрес                         |
|-------------|-------------------------------|
| Приложение  | http://localhost:5173         |
| Backend API | http://localhost:3001         |
| pgAdmin     | http://localhost:5050         |

---

### Подключение к базе данных через pgAdmin

1. Открой http://localhost:5050
2. Войди: email `admin@example.com`, пароль `schema_flo`
3. Нажми **Add New Server** и заполни:
    - **Host:** `postgres`
    - **Port:** `5432`
    - **Database:** `schema_flo`
    - **Username:** `schema_flo`
    - **Password:** `schema_flo`

> Порт `5433` — это порт postgres наружу (чтобы не конфликтовать с локально установленным PostgreSQL).  
> Внутри Docker сервисы общаются через `5432` — это нормально.

---

### Остановка

```bash
docker compose down
```

Данные БД сохраняются — при следующем `up` всё на месте.

Сбросить БД полностью:

```bash
docker compose down -v
```
