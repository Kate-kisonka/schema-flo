# Schema Flo

Персональный трекер психологического состояния, менструального цикла и практик самоподдержки.

Стек: React + Vite + Node.js + Express + PostgreSQL.

> Локальная Ollama подключена через компаньона: `CompanionChat` обращается к `/api/companion/*`, а backend вызывает внутренний API Ollama.

---

## Что умеет приложение

- Ежедневный дневник настроения
- Отслеживание активных схем (схема-терапия)
- Трекер менструального цикла
- Библиотека практик самоподдержки
- История записей
- AI-компаньон с согласием на обработку, историей и управлением данными
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
├── application/
│   ├── backend/
│   │   ├── server.js             # Конфигурация и запуск
│   │   ├── app.js                # Сборка Express-приложения
│   │   ├── db.js                 # Подключение к PostgreSQL
│   │   ├── migrate.js            # Запуск SQL-миграций
│   │   ├── middleware/           # JWT middleware
│   │   ├── routes/               # HTTP-маршруты по функциональным зонам
│   │   ├── services/             # Логика Companion и Ollama
│   │   ├── lib/                  # Общая валидация
│   │   ├── Dockerfile
│   │   ├── .env.example
│   │   └── migrations/
│   │       ├── 001_init.sql
│   │       ├── 002_hardening.sql
│   │       ├── 003_frontend_state.sql
│   │       ├── 005_google_oauth.sql
│   │       ├── 006_diary_body_fields.sql
│   │       ├── 007_companion_chat.sql
│   │       └── 008_companion_chat_safety.sql
│   └── frontend/
│       ├── App.jsx
│       ├── components/
│       ├── constants/
│       ├── hooks/
│       │   ├── useAuth.js
│       │   ├── useCompanionChat.js
│       │   ├── useCycle.js
│       │   ├── useDiary.js
│       │   ├── useHistory.js
│       │   └── useSilence.js
│       ├── screens/
│       └── services/
├── docker-compose-local.yml
├── docker-compose-dev.yml
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
git clone https://git.solutions.ooo/emelina/schema-flo.git
cd schema-flo
```

---

### Шаг 2 — Запустить

```bash
docker compose -f docker-compose-local.yml up --build -d
```

**Первый запуск занимает 3–10 минут** — Docker скачивает образы и устанавливает зависимости. Это нормально, последующие запуски займут 10–30 секунд.

Проверить состояние сервисов:

```bash
docker compose -f docker-compose-local.yml ps
```

> Этот контур предназначен только для локальной разработки и обучения. В нём используются простые тестовые пароли, а опубликованные порты доступны через сетевые интерфейсы компьютера. Не запускай его на публичном сервере или в недоверенной сети.

---

### Шаг 3 — Открыть в браузере

| Сервис      | Адрес                         |
|-------------|-------------------------------|
| Приложение  | http://localhost              |
| Backend API | http://localhost/api          |
| pgAdmin     | http://localhost:5050         |
| Traefik     | http://traefik.localhost      |

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

PostgreSQL не публикуется отдельным портом на компьютере. pgAdmin подключается к нему внутри Docker-сети по адресу `postgres:5432`.

---

### Остановка

```bash
docker compose -f docker-compose-local.yml down
```

Данные БД сохраняются — при следующем `up` всё на месте.

Сбросить БД полностью:

```bash
docker compose -f docker-compose-local.yml down -v
```

> `down -v` безвозвратно удаляет локальные данные PostgreSQL, pgAdmin и Ollama. Для обычной остановки используй команду без `-v`.
