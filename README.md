# Fluxer Threads

Self-hosted Fluxer с тредами. Интерфейс стенда: [https://192.168.1.165:19080](https://192.168.1.165:19080).

Прод и сборка из git: [docs/prod.md](docs/prod.md). Шаблоны, которых нет в git: `.env.example`, `Caddyfile.example`, `Caddyfile.lan.example`. Перенос патча на новый снимок Fluxer: [docs/upgrade.md](docs/upgrade.md).

Образец запуска — `~/fluxer` (тот же Compose, Caddy и LAN-сертификат). Отличие этого каталога: порт **19080**, проект Compose `fluxer-threads`, LiveKit на `17881/17882`. Образы остаются `ghcr.io/fluxerapp/*:v1`. Патч — файлы из `threads/patch/`, которые при запуске накрывают те же пути в `api`, `worker`, `app-proxy` и `gateway`. Отдельного сервиса нет. `fluxer-src/` не меняется.

Движок — `ThreadManager` из коммита `6265928` (`threads/src/`). Состояние лежит в схеме Postgres `fluxer_threads` (таблицы `ft_*`), не в таблицах Fluxer.

## Перед запуском

На этой машине 5 ГиБ RAM. Рядом со стеком из `~/fluxer` второй полный набор контейнеров не помещается. Остановите его без удаления томов:

```bash
docker compose -p fluxer --project-directory ~/fluxer down
```

## Запуск

Секреты лежат в локальном `.env` (файл в `.gitignore`). Если файла нет, скопируйте ключи из `~/fluxer/.env.example`, задайте значения ниже и сгенерируйте секреты (`openssl rand -base64 32`, `openssl rand -hex 32`). Пара `FLUXER_VAPID_PUBLIC_KEY` / `FLUXER_VAPID_PRIVATE_KEY` должна быть согласованной: публичный ключ — uncompressed P-256 (65 байт, base64url), приватный — скаляр P-256 (32 байта, base64url).

Обязательные публичные настройки:

```
FLUXER_DOMAIN=192.168.1.165
FLUXER_PUBLIC_SCHEME=https
FLUXER_PUBLIC_PORT=19080
FLUXER_PUBLIC_ORIGIN=https://192.168.1.165:19080
FLUXER_PASSKEY_ADDITIONAL_ALLOWED_ORIGINS=https://192.168.1.165:19080
FLUXER_LIVEKIT_URL=wss://192.168.1.165:19080/livekit
FLUXER_LIVEKIT_USE_EXTERNAL_IP=false
FLUXER_LIVEKIT_NODE_IP=192.168.1.165
FLUXER_LIVEKIT_TCP_PORT=17881
FLUXER_LIVEKIT_UDP_PORT=17882
FLUXER_EDGE_BIND=0.0.0.0:19080
COMPOSE_PROJECT_NAME=fluxer-threads
COMPOSE_FILE=docker-compose.yml:docker-compose.proxy.yml:docker-compose.lan-tls.yml:threads/docker-compose.threads.yml
```

Сертификат Caddy — `certs/lan.crt` и `certs/lan.key` (имя `192.168.1.165`). Caddy внутри контейнера слушает `:8080` с TLS, хост публикует `19080:8080`.

```bash
docker compose up -d
```

Проверка:

```bash
curl -kfsS https://192.168.1.165:19080/_health
```

Без сессии `GET /api/channels/{id}/threads/active` отвечает `401`. Схема `fluxer_threads` появляется после первого запроса к API. Бэкап Postgres должен включать эту схему.

Тесты движка (сценарии коммита `6265928`, без правок):

```bash
docker run --rm -v "$PWD/threads:/threads:ro" -w /threads node:22-alpine node --test test/*.test.mjs
```

Остановка этого стека, тома сохраняются:

```bash
docker compose down
```

## Что видно в клиенте

В шапке текстового канала кнопка катушки открывает панель «Ветки»: поиск, «Создать», пустое состояние, секции «Участие в ветках» и «Старые ветки». «Создать» открывает правую колонку «Новая ветка» (название, «Приватная ветка», композер). Ветки, в которых пользователь участвует, висят под каналом в сайдбаре. ПКМ по строке: прочитано, покинуть, закрыть, редактировать, ссылка, заглушить, уведомления, id. Старт с сообщения — кнопка между ответом и пересылкой: «Start new thread», а если тред уже есть — «Join thread».
