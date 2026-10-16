# Обновление патча под новый исходник Fluxer

Патч сидит на снимке `1c36a59b2cede69f4ab875751d42cd907c5f079a` и на собранных файлах образа `ghcr.io/fluxerapp/*:v1`, снятых с этого снимка. Новый коммит Fluxer или новый `v1` меняет бандл API, имя клиентского чанка и иногда состав `ControllerRegistry`. Пока эти три вещи не перенесены, прод остаётся на старой связке.

`fluxer-src/` в git не входит и на сервере для запуска не нужен. Он нужен на машине, где патч переносят: туда кладётся новый снимок, из него читают изменившиеся файлы, в `fluxer-src/` ничего не правят. Движок `threads/src/thread-manager.ts`, `permissions.ts` и `types.ts` не переписывают. Новое поведение по-прежнему живёт копией в `threads/patch/` с тем же относительным путём, что у исходника. Отдельный сервис и скрипт, который переписывает файлы при старте контейнера, не заводят. DDL таблиц Fluxer не меняют и `ft_*` в его очередь миграций не кладут.

## Порядок

1. Зафиксировать старый и новый SHA. Выкачать снимок в `fluxer-src/` (`git fetch` и `checkout` нужного коммита). Каталог остаётся в `.gitignore`.
2. Снять с новых образов файлы, которые процесс реально читает. Исходники в репозитории Fluxer сами по себе в контейнер не попадают.
3. Перенести точки стыка из списка ниже. Свой код в `threads/patch/fluxer_api/src/api/threads/` переносится целиком, его из upstream нет.
4. Пересобрать `threads.cjs`, клиентский чанк и `event_atoms.beam`.
5. Обновить пути в `threads/docker-compose.threads.yml`, если сменился хэш чанка или путь внутри образа.
6. На стенде прогнать проверки из [prod.md](prod.md). На прод выкатывать уже собранные файлы тем же Compose.

Образ и файлы патча выкатываются вместе. `docker compose pull` при старых `dist/AppEntrypoint.js` и старом чанке оставляет API и клиент от прошлого снимка, а остальные файлы образа — от нового.

## API

Точка в исходнике — `fluxer_api/src/api/app/ControllerRegistry.ts`. В копии патча вызов `ThreadController(routes)` стоит сразу перед `ChannelController(routes)`, импорт `ThreadController` добавлен рядом с импортом канала. На новом снимке файл копируют заново и вставляют эти две строки в то же место. Маршруты тредов должны регистрироваться до роутера каналов: общий `PATCH` и `DELETE` канала иначе забирают id треда.

Точка воркера — `fluxer_api/src/WorkerEntrypoint.ts`. Перед `startWorkerMain()` стоит

```ts
setInterval(() => {
	sweepAll().catch(() => undefined);
}, 60_000);
```

и импорт `sweepAll` из `@app/api/threads/ThreadStore`.

Образ исполняет не эти `.ts`, а бандл. Из нового образа `fluxer-api` забирают `dist/AppEntrypoint.js` и `dist/WorkerEntrypoint.js` и заново вносят две правки.

В начало обоих файлов, сразу после строки лицензии:

```js
import {createRequire as __ftCreateRequire} from "node:module";
const __ftRequire = __ftCreateRequire(import.meta.url);
```

В `AppEntrypoint.js` внутри `registerControllers`, перед вызовом контроллера каналов (в бандле имя может быть `ChannelController2`):

```js
__ftRequire("./threads.cjs").mount(routes, LoginRequired);
```

Ориентир — комментарий `// src/api/app/ControllerRegistry.ts`. Вставка стоит до вызова каналов и после вложений.

В `WorkerEntrypoint.js` в `startWorkerMain`, до остальной инициализации:

```js
setInterval(() => { __ftRequire("./threads.cjs").sweepAll().catch(() => undefined); }, 60000);
```

Сборка модулей тредов, её кладут в `threads/patch/fluxer_api/dist/threads.cjs`:

```bash
docker run --rm -v "$PWD/threads:/threads" -w /threads node:22-alpine \
  sh -c "npx --yes esbuild patch/fluxer_api/src/api/threads/ThreadController.ts \
    --bundle --platform=node --format=cjs \
    --outfile=patch/fluxer_api/dist/threads.cjs \
    --external:pg --external:@nats-io/transport-node --loader:.sql=text \
    && node --check patch/fluxer_api/dist/threads.cjs"
```

Достать бандл из образа:

```bash
cid=$(docker create ghcr.io/fluxerapp/fluxer-api:v1)
docker cp "$cid:/usr/src/app/fluxer_api/dist/AppEntrypoint.js" /tmp/AppEntrypoint.js
docker cp "$cid:/usr/src/app/fluxer_api/dist/WorkerEntrypoint.js" /tmp/WorkerEntrypoint.js
docker rm "$cid"
```

После правки файлы возвращают в `threads/patch/fluxer_api/dist/` и пересоздают `api` и `worker`.

На что смотреть в диффе нового снимка, если маршруты тредов перестали попадать в процесс:

- сигнатура `registerControllers` и имя `LoginRequired`;
- порядок контроллеров: треды остаются перед каналами;
- разбор тела `POST /channels/:id/messages`. Патч читает тело через `ctx.req.text()`, чтобы Hono отдал тот же текст обработчику Fluxer. Клон сырого потока на этом стеке приходил пустым, и призыв `@ник` не добавлял участника.

## Клиент

Живой интерфейс — склейка `threads/patch/fluxer_app/static/threads-client.js` в конец чанка приложения. Сейчас это `assets/8585ec25ebdb8ec8.js`, в `index.html` у скрипта стоит `?ft=`. Файлы в `threads/patch/fluxer_app/src/features/threads/` образ не исполняет.

Новый `app-proxy` приносит другой хэш чанка. Старый том на новый файл не ляжет, а старый `index.html` будет ссылаться на хэш, которого в образе нет.

```bash
cid=$(docker create ghcr.io/fluxerapp/fluxer-app-proxy-self-hosted:v1)
docker cp "$cid:/srv/app/static/index.html" /tmp/index.html
docker rm "$cid"
```

В новом `index.html` находят скрипт приложения (в текущем снимке это самый большой чанк, в который дописан маркер `;globalThis.ftThreads`). Его забирают из образа тем же `docker cp`, в конец дописывают `threads-client.js` начиная с `;globalThis.ftThreads`, в `index.html` подставляют новое имя и увеличивают `?ft=`. Рядом лежат сжатые копии: `app-proxy` отдаёт их по `Accept-Encoding`.

```bash
docker run --rm -v /tmp/static:/static -w /static node:22-alpine node -e "
const fs=require('fs'); const zlib=require('zlib');
for (const file of ['index.html','assets/CHUNK.js']) {
  const data=fs.readFileSync(file);
  fs.writeFileSync(file+'.gz', zlib.gzipSync(data));
  fs.writeFileSync(file+'.br', zlib.brotliCompressSync(data));
}
"
```

`CHUNK.js` — новое имя. Те же шесть путей прописывают в `app-proxy.volumes` в `threads/docker-compose.threads.yml` и убирают старый хэш. Затем `docker compose up -d --force-recreate --no-deps app-proxy`.

Поведение, которое держит `threads-client.js` и которое легко потерять при переносе экранов:

- кнопка катушки в шапке сразу слева от колокольчика;
- в дереве каналов у ветки линия и название, без иконки катушки;
- панель «Ветки»: поиск, «Создать», «Участие в ветках», «Старые ветки» только у участников;
- старая ветка, скрытая по неактивности, снова открывается новым сообщением; ручной замок остаётся закрытым;
- участник добавляется призывом `@ник` в сообщении ветки;
- ПКМ по ветке открывает меню ветки и не открывает меню канала. Пока меню открыто, клик по другой строке его не переключает.

## Gateway

В `fluxer_gateway/src/utils/event_atoms.erl`, в `channel_event_map()`, сразу после `CHANNEL_CREATE` стоят:

```erlang
<<"THREAD_CREATE">> => thread_create,
<<"THREAD_UPDATE">> => thread_update,
<<"THREAD_DELETE">> => thread_delete,
<<"THREAD_LIST_SYNC">> => thread_list_sync,
<<"THREAD_MEMBER_UPDATE">> => thread_member_update,
<<"THREAD_MEMBERS_UPDATE">> => thread_members_update,
<<"THREAD_MESSAGE">> => thread_update,
```

Узел грузит `event_atoms.beam`, не `.erl`. На новом снимке файл копируют, атомы вставляют снова и собирают beam тем OTP, который стоит в образе `fluxer-gateway` этого тега. Готовый beam кладут в `threads/patch/fluxer_gateway/ebin/event_atoms.beam` и пересоздают `gateway`. Beam от другого OTP узел не загрузит.

## Админка

`threads/patch/fluxer_admin/src/templates/pages/messages_page.rs` добавляет кнопку «Browse Thread». Образ админки — готовый бинарник, том его не подменяет. После переноса шаблона на новый снимок образ `admin` пересобирают и только потом кнопка появляется в интерфейсе.

## Схема

`ensureSchema` в `ThreadStore.ts` выполняет `ft_0001_init.sql` при первом запросе и пишет `ft_0001_init` в `fluxer_threads.ft_schema_migration`. Файл идемпотентный (`CREATE … IF NOT EXISTS`).

Новая колонка или таблица тредов — отдельный SQL рядом, со своим id в `ft_schema_migration`, и вызов из `ensureSchema` после проверки, что этот id ещё не записан. Очередь миграций Fluxer для этого не используют. Существующие строки `ft_*` на проде не пересоздают: `CREATE TABLE IF NOT EXISTS` старую таблицу не меняет.

## Проверки перед выкладкой

Движок, без правок `ThreadManager`:

```bash
docker run --rm -v "$PWD/threads:/threads:ro" -w /threads node:22-alpine node --test test/*.test.mjs
```

На стенде с новым образом: `_health`, `401` на список тредов без сессии, создание ветки, сообщение, `@ник` добавляет участника, строка в дереве без иконки, кнопка катушки в шапке, схема `fluxer_threads` на месте и прежние треды читаются.
