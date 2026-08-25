# Schema Flo: план реализации и переноса в Portainer

## Контекст и цель

Довести текущий MVP до развёртывания в корпоративном Portainer/Swarm и затем закрыть production-риски.

Целевой Stack-файл уже создан: `docker-compose-dev.yml`. Отдельный `docker-stack-prod.yml` на этом этапе создавать не нужно. `docker-compose-local.yml` остаётся конфигурацией для локальной разработки и не должен переделываться под корпоративную инфраструктуру.

Корпоративный эталон оформления Stack передан владельцем проекта. Его обязательные паттерны:

- готовые images из `registry.solutions.ooo`, без `build:` в Stack;
- общий Traefik через external network `traefik_default`;
- корпоративный PostgreSQL через external network `postgresql_network`;
- отдельная внутренняя overlay network приложения;
- external Portainer Config для Caddy;
- external versioned Portainer Secrets и переменные `*_FILE`;
- `deploy` с replicas, update/rollback policy, resource limits, restart policy и team label;
- TLS-маршрут через labels общего Traefik;
- ограничение и ротация json-file логов.

На момент передачи этого плана кодовые изменения по нему ещё не выполнялись. В рабочем дереве уже есть пользовательские изменения: `.gitignore` изменён, `docker-compose-dev.yml` добавлен в индекс и дополнительно изменён. Их нельзя терять или перезаписывать без разбора.

## Архитектурная граница AI

Локальная Ollama уже является единственным рабочим AI-механизмом.

Удаляется старый незавершённый frontend-контур, который вызывает отсутствующий endpoint `/api/chat`. Вызов `${OLLAMA_URL}/api/chat` в backend сохраняется: это внутренний API самой Ollama.

Рабочий поток, который необходимо сохранить:

```text
CompanionChat -> /api/companion/* -> Express -> Ollama /api/chat
                                      |
                                      -> PostgreSQL (consent, history, retention)
```

## Необходимые входные данные

До окончательного заполнения Stack получить у ответственного за инфраструктуру:

1. Домен Schema Flo для dev/staging.
2. Значение `io.portainer.accesscontrol.teams`.
3. Подтверждённые пути registry images для frontend и backend.
4. Реквизиты корпоративной PostgreSQL: host, port, database, user и требуемый SSL-режим.
5. Подтверждение, на каком Swarm node/GPU должна работать Ollama, и допустимые CPU/RAM/GPU limits.
6. Правило хранения модели Ollama: local volume, external volume или заранее подготовленный node.
7. Нужен ли Google OAuth в dev Stack и какие redirect URI зарегистрированы.

Не подставлять выдуманные значения. Пока значения не подтверждены, использовать явно обозначенные `${...:?required}` placeholders.

## Этап 1. Удалить устаревший AI-контур

Удалить:

- `application/frontend/screens/SupportScreen.jsx`;
- `application/frontend/hooks/useAI.js`;
- `application/frontend/services/ai.js`;
- `AI_SESSIONS_KEY` и `dbAISessions` из `application/frontend/services/db.js`;
- комментарии и инструкции, утверждающие, что AI ещё не подключён или заморожен.

Сохранить:

- `CompanionChat` и `useCompanionChat`;
- `dbCompanionChat`;
- backend endpoints `/api/companion/*`;
- `callOllama()` и `${OLLAMA_URL}/api/chat`;
- consent, retention, crisis detection, optimistic locking, export и delete history;
- `companionSafety.js`, `legacyImportPolicy.js`, миграции 007/008 и их тесты.

Обновить:

- `README.md`: локальная Ollama уже подключена через компаньона;
- `CLAUDE.md`: удалить правила «AI заморожен» и старые ссылки на `useAI.js`/`services/ai.js`;
- `docs/agent-system.md`: рабочая AI-зона больше не считается замороженной, изменения в ней требуют backend/frontend тестов и security review.

Принять решение о старом `localStorage["ai_sessions"]`. Рекомендуемый вариант: однократно удалить этот недоступный остаток, поскольку он может содержать чувствительные сообщения. Не удалять другие localStorage-данные.

Критерии готовности:

```powershell
rg -n "SupportScreen|useAI|sendAIMessage|dbAISessions" application/frontend
rg -n "\/api\/chat" application/frontend
```

Оба поиска ничего не находят. Поиск `/api/chat` в backend всё ещё находит вызов Ollama.

## Этап 2. Подготовить runtime-конфигурацию backend

Добавить единый helper чтения конфигурации:

- сначала читать `<NAME>_FILE` как путь к Docker Secret;
- затем fallback на `<NAME>` для локального запуска;
- для обязательных секретов завершать запуск понятной ошибкой, не выводя значение;
- обрезать только завершающий перевод строки secret-файла.

Backend должен поддержать как минимум:

```text
DB_HOST_FILE
DB_PORT_FILE
DB_USER_FILE
DB_NAME_FILE
DB_PASSWORD_FILE
JWT_SECRET_FILE
GOOGLE_CLIENT_SECRET_FILE   # только если Google OAuth включён
```

`DATABASE_URL` собирать внутри backend из DB-параметров либо поддержать `DATABASE_URL_FILE`. Выбрать один контракт и использовать его последовательно в `db.js`, `server.js`, миграциях, `.env.example` и Stack.

Обычные несекретные настройки оставить environment variables:

```text
NODE_ENV
PORT
FRONTEND_URL
ALLOWED_ORIGINS
OLLAMA_URL
OLLAMA_MODEL
COMPANION_RETENTION_DAYS
COMPANION_CLEANUP_INTERVAL_HOURS
COMPANION_NUM_PREDICT
COMPANION_MAX_REPLY_LENGTH
GOOGLE_CLIENT_ID
GOOGLE_REDIRECT_URI
```

Добавить тесты helper-а: file priority, env fallback, отсутствующий required secret, newline trimming. Локальный `.env` должен продолжать работать.

## Этап 3. Подготовить registry images

### Backend image

- использовать точную версию Node;
- заменить `npm install --production` на `npm ci --omit=dev`;
- запускать процесс не от root;
- копировать только необходимые runtime-файлы;
- сохранить migrations внутри image;
- запускать миграции перед сервером либо отдельным one-shot service;
- добавить healthcheck-capable runtime без установки пакетов при старте.

### Frontend image

Image должен соответствовать корпоративному паттерну: содержать готовый `dist` и запускаться как one-shot copier в общий volume Caddy.

- multi-stage build;
- `npm ci` и `npm run build` на build stage;
- результат поместить в стабильный путь, например `/app/dist`;
- Stack-команда копирует `/app/dist/*` в `/target`;
- убрать Vite dev server, bind mount исходников, `frontend_node_modules` и `npm install` при старте;
- frontend должен обращаться к API по same-origin пути, без `http://localhost`.

Предварительные image names, требующие подтверждения инфраструктурой:

```text
registry.solutions.ooo/slns_schema_flo/application-frontend-dev:${IMAGE_TAG:-latest}
registry.solutions.ooo/slns_schema_flo/application-backend-dev:${IMAGE_TAG:-latest}
```

CI должен публиковать оба image. Для воспроизводимого релиза использовать immutable tag/Git SHA; `latest` допустим только как удобный alias.

## Этап 4. Переделать существующий docker-compose-dev.yml в корпоративный Stack

Не создавать отдельный production Stack-файл. Переделать существующий `docker-compose-dev.yml` по приложенному корпоративному образцу.

### Состав Stack

Оставить:

- `caddy`;
- `frontend` one-shot copier;
- `backend`;
- `ollama`;
- `ollama-init`, если модель не включена в image и pull при deploy соответствует инфраструктурной политике.

Удалить из dev Stack:

- собственный `traefik`;
- локальный `postgres`;
- `pgadmin`;
- host ports;
- `build:`;
- bind mounts исходного кода;
- локальные `restart:` как основной Swarm-механизм.

### Caddy

- image с версией/digest по корпоративному правилу;
- external config, например `schema_flo_caddy_config_v1`;
- shared volume `frontend-data`, смонтированный в каталог статических файлов;
- маршрут `/api/*` в `backend:3001` без потери пути;
- SPA fallback на `index.html`;
- сети `traefik_default` и внутренняя сеть приложения;
- Traefik labels только внутри `deploy.labels`;
- TLS entrypoint `websecure`, `tls=true`, корпоративный certresolver;
- team access label;
- update/rollback/restart/resources/logging по эталону.

### Frontend

- registry image;
- volume `frontend-data` -> `/target`;
- one-shot copy собранного `dist`;
- `restart_policy.condition: none`;
- team label, resource limit и logging.

Учитывать порядок обновления shared volume: Caddy не должен остаться с частично скопированным frontend. Предпочтительно копировать во временный каталог и затем атомарно заменять содержимое либо подтвердить приемлемость корпоративного copy-паттерна.

### Backend

- registry image;
- `NODE_ENV: production`;
- secrets через `*_FILE`;
- network `postgresql_network` и внутренняя сеть приложения;
- `OLLAMA_URL: http://ollama:11434`;
- домен в `FRONTEND_URL` и `ALLOWED_ORIGINS`;
- healthcheck;
- deploy/update/rollback/resources/restart/team label/logging.

### Ollama

- оставить локальный inference внутри Stack;
- не публиковать порт 11434;
- подключить только к внутренней сети;
- persistent volume для модели;
- добавить deploy resources и placement constraints по требованиям node/GPU;
- оценить, достаточно ли 3B-модели выделенной памяти;
- `ollama-init` сделать безопасно повторяемым;
- недоступность Ollama не должна делать недоступными дневник, auth и остальные API.

### Networks, volumes, configs и secrets

```yaml
networks:
  traefik_default:
    name: traefik_default
    external: true
  postgresql_network:
    name: postgresql_network
    external: true
  slns_schema_flo_internal:
    name: slns_schema_flo_internal
    driver: overlay
    attachable: true
```

Минимальные volumes:

```text
frontend-data
ollama-data
```

Минимальный external config:

```text
schema_flo_caddy_config_v1
```

Минимальные external versioned secrets:

```text
slns_schema_flo_db_host_secret_v1
slns_schema_flo_db_port_secret_v1
slns_schema_flo_db_user_secret_v1
slns_schema_flo_db_name_secret_v1
slns_schema_flo_db_password_secret_v1
slns_schema_flo_jwt_secret_v1
slns_schema_flo_google_client_secret_v1   # если OAuth включён
```

Имена Compose aliases и фактические `name:` Docker Secrets оформить по корпоративному шаблону и согласовать с Portainer.

Не добавлять `container_name`: в Swarm сервисы получают имена от Stack, а `container_name` не является надёжным механизмом адресации. Если корпоративный ревью требует его по шаблону, отдельно зафиксировать, что Swarm его игнорирует/не использует.

## Этап 5. Обновить Caddy Config и CI

Создать версионируемый исходник Caddy config в репозитории, но в Stack подключать заранее созданный external Portainer Config. Не хранить runtime autosave, сертификаты или private keys.

Исправить CI:

- реальные пути `application/backend` и `application/frontend`;
- `npm ci`, не `npm install`;
- backend tests;
- frontend contract test;
- frontend lint/build;
- сборка двух images;
- публикация в `registry.solutions.ooo`;
- Compose/Stack validation;
- security scans как минимум npm audit и image scan;
- никакого автоматического deploy без отдельного согласованного CD-механизма.

## Этап 6. Создать объекты в Portainer и развернуть dev Stack

До deploy создать:

1. Все external Secrets с подтверждёнными значениями.
2. External Config Caddy с версионным именем.
3. Проверить наличие `traefik_default` и `postgresql_network`.
4. Проверить registry credentials у Portainer.
5. Проверить наличие нужного Ollama node/storage.

Развернуть Stack с именем:

```text
slns_schema_flo
```

Проверки до deploy:

```text
docker stack config -c docker-compose-dev.yml
```

Также проверить, что в итоговой конфигурации нет `build:`, host bind mounts, plaintext secrets, собственного Traefik/PostgreSQL/pgAdmin и `localhost`.

Проверки после deploy:

1. Все services достигли ожидаемого состояния, `frontend` и `ollama-init` завершились успешно.
2. HTTPS-домен открывает приложение.
3. `/health` подтверждает PostgreSQL.
4. Миграции применены к целевой БД.
5. Регистрация/вход работают.
6. Дневник сохраняется и загружается после redeploy.
7. Companion consent/history/send/export/delete работают.
8. Ollama недоступна снаружи Stack.
9. Остановка Ollama даёт 503 только чату и не ломает остальное приложение.
10. Обновление image tag и rollback Stack проверены.
11. Секреты не попадают в логи, Stack editor и inspect environment.

## Этап 7. Закрыть security-блокеры до публичного production

Dev/staging deploy не равен разрешению хранить реальные пользовательские данные.

До публичного production:

- добавить Helmet, CSP, HSTS и безопасные proxy headers;
- добавить OAuth `state`, желательно PKCE;
- проверять `email_verified` от Google;
- реализовать подтверждение email либо удалить недоделанный контур;
- перейти с JWT в localStorage на HttpOnly + Secure + SameSite cookie;
- добавить отзыв сессий;
- включить корректную проверку TLS-сертификата внешнего PostgreSQL;
- обновить уязвимые зависимости;
- удалить неиспользуемый `nodemailer`, если email-функциональность не реализуется;
- ограничить размеры массивов и число записей import;
- внутреннюю ошибку БД из публичного `/health` больше не возвращать — выполнено;
- кризисный ответ Companion не должен блокироваться лимитом запросов к Ollama — выполнено;
- проверить user isolation интеграционными тестами.

## Этап 8. Сделать данные полностью отчуждаемыми

- единый экспорт всех данных пользователя;
- убрать лимит 500 из полного экспорта;
- включить diary, cycle, state, practices, companion history и consent metadata;
- добавить удаление аккаунта с подтверждением и каскадным удалением;
- определить срок хранения и резервного копирования;
- использовать корпоративный backup/restore процесс PostgreSQL;
- провести тестовое восстановление на staging;
- документировать формат экспорта и процедуру переноса.

Так как PostgreSQL внешний и корпоративный, не добавлять локальный `pg_dump` service в Stack без согласования с инфраструктурной командой.

## Этап 9. Улучшить поддерживаемость

Выполнено:

- `server.js` сокращён до bootstrap, Express собирается в `app.js`;
- HTTP-зоны вынесены в `routes/`, общие middleware и validation разделены;
- транзакционная логика Companion, Ollama и retention cleanup вынесена в `services/companion.js`;
- тяжёлый repository-слой намеренно не добавлен: для текущего размера проекта он не уменьшает сложность.

Остаётся:

- вынести единый frontend HTTP client;
- заменить полный PUT `/api/state` на частичное обновление;
- добавить схемную валидацию входных данных;
- добавить PostgreSQL integration tests;
- покрыть auth, OAuth, CRUD, import/export и удаление аккаунта;
- добавить E2E smoke test через dev-домен;
- полностью обновить README под фактическую структуру и способы запуска.

## Проверки каждого этапа

Минимальный локальный набор:

```powershell
Set-Location application/backend
npm test
node --check server.js
node --check app.js
Get-ChildItem routes,services,middleware,lib -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }

Set-Location ../frontend
node --test services/migrate.contract.test.js services/cleanupLegacyAISessions.contract.test.js
npm run lint
npm run build
```

Дополнительно после Docker/CI-изменений:

- build backend image;
- build frontend image;
- проверить содержимое frontend image (`dist` существует);
- проверить запуск backend с env fallback и с secret files;
- проверить Caddy routing;
- `docker stack config` на целевом Stack-файле;
- security audit зависимостей и images.

## Финальный Go/No-Go

### Для dev/staging Portainer

Deploy разрешён, когда:

1. Подтверждены домен, team label, registry paths, DB и Ollama placement.
2. Images опубликованы и доступны Portainer.
3. External networks/config/secrets существуют.
4. Stack validation проходит.
5. HTTPS, auth, diary, migrations и companion проходят smoke test.
6. Секреты не раскрываются.
7. Rollback проверен.

### Для публичного production

Дополнительно обязательны:

1. Закрыты security-блокеры этапа 7.
2. Полные export/delete account реализованы.
3. Backup восстановлен в новую БД.
4. Изоляция пользователей проверена интеграционными тестами.
5. Уязвимости зависимостей и images разобраны; непочиненные риски письменно приняты.
6. Есть runbook deploy, rollback, secret rotation и incident response.

## Рекомендуемый порядок работы оркестратора

1. Зафиксировать входные инфраструктурные значения.
2. Выполнить этап 1 отдельным небольшим изменением и проверить регрессии.
3. Выполнить этап 2 вместе с тестами конфигурации.
4. Выполнить этапы 3-5 как единый контракт image + Caddy + Stack + CI.
5. Создать Portainer objects и выполнить этап 6 на dev/staging.
6. Только после стабильного deploy переходить к этапам 7-8.
7. Этап 9 не должен задерживать deploy/security fixes.

Оркестратор не должен коммитить, push, merge или deploy без отдельного прямого запроса владельца проекта. Перед изменением файлов нужно проверить актуальный Git status и сохранить пользовательские изменения в `docker-compose-dev.yml` и `.gitignore`.
