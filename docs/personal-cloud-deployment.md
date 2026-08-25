# Личный облачный контур: GitHub, Vercel и Render

Этот файл относится только к личному репозиторию
`https://github.com/Kate-kisonka/schema-flo`. Корпоративный remote `company`
и Gitea этим контуром не изменяются.

## Поток доставки

1. Изменение попадает в ветку `main` личного GitHub.
2. GitHub Actions устанавливает зависимости, запускает backend/frontend тесты,
   ESLint, `npm audit`, production build и сборку обоих Docker images.
3. После успешных проверок workflow вызывает секретный Render deploy hook для
   точного commit SHA.
4. Существующая GitHub-интеграция Vercel автоматически собирает frontend по
   корневому `vercel.json`.
5. Production frontend обращается к API по адресу
   `https://schema-flo.onrender.com`.

## GitHub

В `Settings -> Secrets and variables -> Actions` должен существовать repository
secret `RENDER_DEPLOY_HOOK`. Его значением служит Deploy Hook URL из настроек
личного сервиса Render. URL является секретом и не должен попадать в Git,
логи или документацию.

Workflow находится в `.github/workflows/personal-cloud.yml`. Файл
`.github/ci.yml` оставлен без изменений: он подготовлен для корпоративного
Gitea-контура и GitHub Actions его не выполняет.

## Vercel

Проект `schema-flo` должен быть связан с личным GitHub-репозиторием и веткой
`main`. Root Directory должен быть корнем репозитория (`.`), потому что там
лежит `vercel.json`.

`vercel.json` задаёт:

- установку зависимостей из `application/frontend`;
- запуск Vite production build;
- каталог результата `application/frontend/dist`;
- публичный build-time адрес backend через `VITE_API_URL`.

Секретов в Vercel-конфигурации нет. Если адрес Render изменится, нужно обновить
`VITE_API_URL` и повторно развернуть frontend.

## Render

Для существующего Web Service необходимо проверить настройки:

- Repository: `Kate-kisonka/schema-flo`;
- Branch: `main`;
- Root Directory: `application/backend`;
- Runtime: `Docker`;
- Dockerfile Path: `./Dockerfile`;
- Health Check Path: `/health`.

Команды и путь к Dockerfile считаются относительно Root Directory. Backend image
сам запускает миграции через `docker-entrypoint.sh`, поэтому отдельную команду
миграции в Render добавлять не нужно.

Минимальные production-переменные Render:

- `NODE_ENV=production`;
- `DATABASE_URL` и `DATABASE_SSL=true` для облачного PostgreSQL;
- `JWT_SECRET` длиной не менее 32 символов;
- `FRONTEND_URL=https://schema-flo.vercel.app`;
- `ALLOWED_ORIGINS=https://schema-flo.vercel.app`;
- OAuth-переменные, если Google OAuth включён.

Значения паролей, токенов и OAuth client secret хранятся только в Render/GitHub
Secrets. Для Companion нужен доступный из Render `OLLAMA_URL`; локальный адрес
`http://localhost:11434` в облачном сервисе не предоставляет модель.

## Проверка после deploy

1. GitHub Actions завершился без ошибок.
2. Vercel deployment относится к тому же commit SHA, что и `main`.
3. `https://schema-flo.onrender.com/health` отвечает HTTP 200.
4. `https://schema-flo.vercel.app` отдаёт новый frontend bundle.
5. Вход, чтение и сохранение данных проходят через Render API.
6. Данные двух разных пользователей изолированы.

До выполнения всех шести пунктов облачный релиз считается `NO-GO`.
