# Запуск патча на продакшене

Патч — это официальные образы `ghcr.io/fluxerapp/*` и файлы из `threads/patch/`, которые Compose монтирует поверх `api`, `worker`, `app-proxy` и `gateway`. Отдельного сервиса Threads нет. Каталог `fluxer-src/` на сервере не нужен: процесс читает уже собранные файлы из репозитория.

Связка, под которую собран текущий патч:

- снимок [fluxerapp/fluxer](https://github.com/fluxerapp/fluxer) `1c36a59b2cede69f4ab875751d42cd907c5f079a`;
- тег образов `v1`, снятый вместе с этим снимком;
- движок тредов [jackmercy/fluxer-meta@6265928](https://github.com/jackmercy/fluxer-meta/commit/6265928c2f2fd8a2181d62b8d4b2ae6121ddc328).

Тег `v1` плавающий. `docker compose pull` без [upgrade.md](upgrade.md) подменяет библиотеки образа и оставляет старые `AppEntrypoint.js`, `WorkerEntrypoint.js` и клиентский чанк. Стек после этого расходится. Обновление образа идёт только по той инструкции.

Команды ниже запускаются из корня репозитория. Пути томов в `threads/docker-compose.threads.yml` считаются от этого корня.

## Что нужно на хосте

- Docker и Compose v2.
- Память около 16 ГиБ под лимиты по умолчанию в `docker-compose.yml`. На меньшем хосте потолки задаются в `.env`.
- DNS имени `FLUXER_DOMAIN` на этот хост.
- Снаружи открыты TCP 80 и 443. Голос дополнительно публикует TCP `7881` и UDP `7882`.
- Диск под том Postgres и том SeaweedFS.

Состояние тредов лежит в Postgres, схема `fluxer_threads`, таблицы `ft_*`. В очередь миграций Fluxer она не входит и таблицы Fluxer не меняет. Схема создаётся при первом запросе к API. Бэкап Postgres должен включать эту схему.

## Сборка из git

В клоне уже лежат собранные файлы, которые читает процесс: `threads/patch/fluxer_api/dist/`, клиентский чанк в `threads/patch/fluxer_app/static/` и `threads/patch/fluxer_gateway/ebin/event_atoms.beam`. Node и Erlang на хосте для запуска не нужны.

Файлы, которые git не хранит, берутся из шаблонов:

```bash
cp .env.example .env
cp Caddyfile.example Caddyfile
```

`Caddyfile.example` — край с автоматическим сертификатом на `FLUXER_DOMAIN`. `Caddyfile.lan.example` — тот же край с файлами `certs/lan.crt` и `certs/lan.key`, для стенда по IP.

Секреты в `.env` генерируются заново и больше не меняются: смена ключа инвалидирует уже выданные сессии, пароли админки, подписи медиа и push-подписки.

```bash
openssl rand -base64 32   # POSTGRES_PASSWORD, MEILI_MASTER_KEY, FLUXER_S3_SECRET_KEY
openssl rand -hex 32      # FLUXER_SUDO_MODE_SECRET, FLUXER_CONNECTION_INITIATION_SECRET,
                          # FLUXER_GATEWAY_RPC_AUTH_TOKEN, FLUXER_ERLANG_COOKIE,
                          # FLUXER_MEDIA_PROXY_SECRET_KEY, FLUXER_ADMIN_SECRET_KEY_BASE,
                          # FLUXER_ADMIN_OAUTH_CLIENT_SECRET, LIVEKIT_API_SECRET
openssl rand -base64 32   # FLUXER_MEDIA_PROXY_UPLOAD_RELAY_SECRET_BASE64
```

Пара VAPID должна быть согласованной. Публичный ключ — несжатая точка P-256, 65 байт, base64url. Приватный — скаляр P-256, 32 байта, base64url.

В `.env` для продакшена оставьте:

```
FLUXER_DOMAIN=chat.example.com
FLUXER_PUBLIC_SCHEME=https
FLUXER_PUBLIC_PORT=443
COMPOSE_PROJECT_NAME=fluxer-threads
COMPOSE_FILE=docker-compose.yml:threads/docker-compose.threads.yml
FLUXER_IMAGE_TAG=v1
```

`COMPOSE_PROJECT_NAME` входит в имена томов. Другой проект Compose на том же хосте эти тома не видит. Если на машине уже есть стек Fluxer и треды должны сесть на его Postgres, имя проекта оставьте прежним и добавьте в `COMPOSE_FILE` только `threads/docker-compose.threads.yml`. Перед этим снимите дамп.

Голос по умолчанию: `FLUXER_LIVEKIT_TCP_PORT=7881`, `FLUXER_LIVEKIT_UDP_PORT=7882`. Эти порты проброшены на хост и их же LiveKit объявляет клиентам.

## Старт

```bash
docker compose up -d
curl -fsS https://chat.example.com/_health
```

Ответ `_health` — `OK`. Без сессии `GET /api/channels/{id}/threads/active` отвечает `401`. После первого запроса к API в Postgres есть схема `fluxer_threads` и строка `ft_0001_init` в `ft_schema_migration`.

Остановка сохраняет тома:

```bash
docker compose down
```

## Что смонтировано

| Сервис | Файл в репозитории | Куда в контейнере |
| --- | --- | --- |
| api | `threads/patch/fluxer_api/dist/AppEntrypoint.js` | `dist/AppEntrypoint.js` |
| api, worker | `threads/patch/fluxer_api/dist/threads.cjs` | рядом с entrypoint |
| worker | `threads/patch/fluxer_api/dist/WorkerEntrypoint.js` | `dist/WorkerEntrypoint.js` |
| app-proxy | `index.html`, `.gz`, `.br` и чанк `8585ec25ebdb8ec8.js` с теми же сжатыми копиями | `/srv/app/static/` |
| gateway | `event_atoms.beam` | `ebin/event_atoms.beam` |

`api` регистрирует маршруты тредов тем же `LoginRequired`, что и каналы, до роутера каналов. `worker` раз в минуту вызывает `sweepAll`. `gateway` знает события `THREAD_CREATE`, `THREAD_UPDATE`, `THREAD_DELETE`, `THREAD_LIST_SYNC`, `THREAD_MEMBER_UPDATE`, `THREAD_MEMBERS_UPDATE`. Клиент — статический бандл: кнопка «Ветки» в шапке, панель, колонка создания, строки под каналом, меню. Исходник экранов, который попадает в бандл, — `threads/patch/fluxer_app/static/threads-client.js`.

Копия `messages_page.rs` в админку живого образа не монтируется. Кнопка «Browse Thread» появляется после пересборки образа `admin`.

После замены `index.html` или чанка пересоздайте `app-proxy`: процесс читает страницу при старте.

```bash
docker compose up -d --force-recreate --no-deps app-proxy
```

После замены `threads.cjs` или `AppEntrypoint.js` так же пересоздайте `api`. После `WorkerEntrypoint.js` — `worker`. После `event_atoms.beam` — `gateway`.

## Бэкап

Дамп схемы тредов:

```bash
docker exec fluxer-threads-postgres-1 pg_dump -U fluxer -d fluxer -n fluxer_threads
```

Имя контейнера зависит от `COMPOSE_PROJECT_NAME`. Полный инстанс — это том Postgres и том SeaweedFS. Настройки уведомлений канала хранит сам Fluxer, не таблицы `ft_*`.

## Проверка после выкладки

- `https://$FLUXER_DOMAIN/_health` отвечает `OK`.
- В шапке текстового канала есть кнопка катушки и панель «Ветки».
- В дереве каналов у строки ветки есть линия и название, без иконки катушки.
- Создание ветки, сообщение в ней и `@ник` добавляют упомянутого участника в список ветки.
- `ft_schema_migration` содержит `ft_0001_init`.
