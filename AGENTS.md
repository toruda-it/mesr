# Fluxer Threads

Локальный стек Fluxer с тредами. Снимок `fluxer-src/` не правится. Доработки — копии файлов в `threads/patch/` с теми же относительными путями, что у исходников. При запуске эти копии накрывают файлы в уже существующих контейнерах. Отдельного сервиса Threads нет.

## Раскладка

- `fluxer-src/` — снимок [fluxerapp/fluxer](https://github.com/fluxerapp/fluxer) `1c36a59b2cede69f4ab875751d42cd907c5f079a`. Файлы внутри не изменять.
- `threads/src/` — движок из [jackmercy/fluxer-meta@6265928](https://github.com/jackmercy/fluxer-meta/commit/6265928c2f2fd8a2181d62b8d4b2ae6121ddc328): `thread-manager.ts`, `permissions.ts`, `types.ts`. Эти файлы не переписывать. Переходы состояний идут только через методы `ThreadManager` и проверки `ThreadPermissions`.
- `threads/patch/` — копии файлов Fluxer и новые файлы по путям дерева исходников (`fluxer_api`, `fluxer_app`, `fluxer_admin`, `fluxer_gateway`).
- `threads/migrations/ft_0001_init.sql` — схема `fluxer_threads`, таблицы `ft_*`. В очередь миграций Fluxer она не входит. Применённые файлы пишутся в `ft_schema_migration`.
- `threads/docker-compose.threads.yml` — тома поверх `api`, `worker`, `app-proxy` и `gateway`. Сервиса `threads` нет.

## Как патч попадает в процесс

Официальные образы исполняют уже собранные файлы, а не TypeScript и не `.erl`. Поэтому рядом с копиями исходников лежат те же файлы в том виде, в котором их читает процесс:

- `api` — `dist/AppEntrypoint.js` вызывает `dist/threads.cjs` (сборка `threads/patch/fluxer_api/src/api/threads`). Маршруты тредов регистрируются тем же `LoginRequired`, что и каналы, до роутера каналов. Схема `fluxer_threads` применяется при первом запросе.
- `worker` — `dist/WorkerEntrypoint.js` раз в минуту вызывает `sweepAll`: тред без сообщений дольше `autoArchiveDurationMinutes` уходит в `archived` через `archiveThread`.
- `gateway` — `event_atoms.beam` знает `THREAD_CREATE`, `THREAD_UPDATE`, `THREAD_DELETE`, `THREAD_LIST_SYNC`, `THREAD_MEMBER_UPDATE`, `THREAD_MEMBERS_UPDATE`. API публикует их в `rpc.gateway.guild.dispatch`.
- `app-proxy` — статический бандл клиента с панелью «Ветки», колонкой «Новая ветка», деревом в сайдбаре, меню и обзором. Исходник экранов: `threads/patch/fluxer_app/src/features/threads/` и `threads/patch/fluxer_app/static/threads-client.js`.
- `admin` — копия `messages_page.rs` добавляет кнопку «Browse Thread». Образ админки — готовый бинарник, шаблон попадает в интерфейс после пересборки образа.

Состояние не живёт в памяти процесса. Каждый вызов читает строку `ft_thread`, вызывает метод движка и записывает результат. Удаление выставляет `state = 'deleted'` на объекте, который движок уже держит. Уникальный индекс `ft_thread_one_parent_message` не даёт двум живым тредам висеть на одном сообщении.

## Продукт

Спека: [fluxerapp/fluxer-meta#5](https://github.com/fluxerapp/fluxer-meta/issues/5) и набор Discord Threads. Публичный id треда — snowflake. Внутренний `th_…` хранится в `engine_id` и не подменяет публичный id. `closed` — архив без замка (`closeThread` / `reopenThread`). `archived` — замок (`archiveThread` / `unarchiveThread`). Бот ходит в те же маршруты с бот-токеном. Вебхук с `?thread_id=` пишет в тред.

## Запуск

Публичный адрес: `https://192.168.1.165:19080`. Проект Compose: `fluxer-threads`. LiveKit на хосте: TCP `17881`, UDP `17882`. Секреты только в `.env`.

## Правила правок

- Не менять файлы в `fluxer-src/`.
- Не переписывать `ThreadManager`, `permissions.ts` и `types.ts`.
- Новое поведение добавлять копией в `threads/patch/` с путём исходника. Не заводить отдельный сервис и скрипт, который переписывает файлы на старте контейнера.
- Не менять DDL таблиц Fluxer и не вставлять `ft_*` в его очередь миграций.
- `docker-compose.yml` в корне — обвязка запуска. Имя проекта `fluxer-threads`, чтобы тома не пересекались со стеком `~/fluxer`.
