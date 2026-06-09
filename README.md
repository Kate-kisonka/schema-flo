# Schema Flo

Schema Flo — персональный трекер психологического состояния, цикла и практик самоподдержки.

Проект объединяет:
- ежедневный дневник настроения;
- отслеживание активных схем;
- трекер менструального цикла;
- библиотеку практик;
- историю записей;
- авторизацию;
- backend API;
- PostgreSQL-хранилище.

> AI-функциональность временно оставлена как есть и не входит в текущий этап доработок.

---

## Статус проекта

Проект находится в активной разработке.

Текущий фокус:

1. Стабилизировать связку frontend ↔ backend ↔ PostgreSQL.
2. Довести авторизацию через Google.
3. Актуализировать локальный запуск через Docker Compose.
4. Разделить личную версию проекта с деплоем и корпоративную версию без внешнего деплоя.
5. Добавить проверки качества, безопасности и лишнего кода.

---

## Технологии

### Frontend

- React
- Vite
- JavaScript
- LocalStorage/Dexie legacy migration
- CSS/inline styles

### Backend

- Node.js
- Express
- PostgreSQL
- pg
- JWT
- bcryptjs
- Google OAuth
- Email verification flow

### Инфраструктура

- Docker Compose
- PostgreSQL 16
- pgAdmin
- Vercel	schema-flo.vercel.app	Фронтенд
- Render	schema-flo.onrender.com	Бэкенд API
- Gitea для корпоративной версии

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