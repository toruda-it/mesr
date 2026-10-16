var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// api/threads/ThreadController.ts
var ThreadController_exports = {};
__export(ThreadController_exports, {
  ThreadController: () => ThreadController,
  mount: () => mount,
  sweepAll: () => sweepAll
});
module.exports = __toCommonJS(ThreadController_exports);

// api/threads/permissions.ts
var ThreadPermissions = class {
  static canCreateThread(perms2) {
    return perms2.canViewChannel && perms2.canSendMessages && (perms2.canCreateThreads || perms2.isModerator);
  }
  static canSendInThread(perms2, threadState) {
    if (!perms2.canViewChannel) return false;
    if (threadState === "archived" && !perms2.canManageThreads) return false;
    if (threadState === "deleted") return false;
    return perms2.canSendMessages;
  }
  static canManageThread(perms2, threadCreatorId, currentUserId) {
    if (perms2.isModerator || perms2.canManageThreads) return true;
    return threadCreatorId === currentUserId;
  }
};

// api/threads/ThreadStore.ts
var import_pg = __toESM(require("pg"));

// api/threads/thread-manager.ts
var ThreadManager = class {
  threads = /* @__PURE__ */ new Map();
  members = /* @__PURE__ */ new Map();
  // threadId -> Set<userId>
  createThread(input) {
    const threadId = `th_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();
    const thread = {
      id: threadId,
      channelId: input.channelId,
      parentMessageId: input.parentMessageId || null,
      name: input.name,
      creatorId: input.creatorId,
      creatorUsername: input.creatorUsername,
      state: "active",
      createdAt: now,
      autoArchiveDurationMinutes: input.autoArchiveDurationMinutes || 10080,
      messageCount: input.parentMessageId ? 1 : 0,
      memberCount: 1,
      lastMessageTimestamp: now
    };
    this.threads.set(threadId, thread);
    this.members.set(threadId, /* @__PURE__ */ new Set([input.creatorId]));
    return thread;
  }
  getThread(threadId) {
    return this.threads.get(threadId) || null;
  }
  joinThread(threadId, userId) {
    const thread = this.threads.get(threadId);
    if (!thread || thread.state === "deleted") return false;
    const set = this.members.get(threadId) || /* @__PURE__ */ new Set();
    if (!set.has(userId)) {
      set.add(userId);
      this.members.set(threadId, set);
      thread.memberCount = set.size;
      return true;
    }
    return false;
  }
  leaveThread(threadId, userId) {
    const thread = this.threads.get(threadId);
    if (!thread) return false;
    const set = this.members.get(threadId);
    if (set && set.has(userId)) {
      set.delete(userId);
      thread.memberCount = set.size;
      return true;
    }
    return false;
  }
  closeThread(threadId) {
    const thread = this.threads.get(threadId);
    if (!thread || thread.state !== "active") return false;
    thread.state = "closed";
    return true;
  }
  reopenThread(threadId) {
    const thread = this.threads.get(threadId);
    if (!thread || thread.state !== "closed") return false;
    thread.state = "active";
    return true;
  }
  archiveThread(threadId, operatorId) {
    const thread = this.threads.get(threadId);
    if (!thread || thread.state === "deleted") return false;
    thread.state = "archived";
    thread.archivedAt = Date.now();
    thread.archivedBy = operatorId || null;
    return true;
  }
  unarchiveThread(threadId) {
    const thread = this.threads.get(threadId);
    if (!thread || thread.state !== "archived") return false;
    thread.state = "active";
    thread.archivedAt = null;
    thread.archivedBy = null;
    return true;
  }
  listThreadsInChannel(channelId) {
    return Array.from(this.threads.values()).filter(
      (t) => t.channelId === channelId && t.state !== "deleted"
    );
  }
};

// api/threads/ft_0001_init.sql
var ft_0001_init_default = "CREATE SCHEMA IF NOT EXISTS fluxer_threads;\n\nCREATE TABLE IF NOT EXISTS fluxer_threads.ft_schema_migration (\n  id text PRIMARY KEY,\n  applied_at timestamptz NOT NULL DEFAULT now()\n);\n\nCREATE TABLE IF NOT EXISTS fluxer_threads.ft_thread (\n  thread_id text PRIMARY KEY,\n  engine_id text NOT NULL UNIQUE,\n  channel_id text NOT NULL,\n  guild_id text,\n  parent_message_id text,\n  name text NOT NULL,\n  creator_id text NOT NULL,\n  creator_username text NOT NULL,\n  state text NOT NULL,\n  created_at bigint NOT NULL,\n  auto_archive_duration_minutes integer NOT NULL,\n  archived_at bigint,\n  archived_by text,\n  last_message_timestamp bigint,\n  last_message_sender_id text,\n  last_message_sender_username text,\n  last_message_preview text,\n  message_count integer NOT NULL DEFAULT 0,\n  member_count integer NOT NULL DEFAULT 1,\n  is_private boolean NOT NULL DEFAULT false,\n  locked boolean NOT NULL DEFAULT false,\n  invitable boolean NOT NULL DEFAULT true,\n  slowmode_seconds integer,\n  kind text NOT NULL DEFAULT 'public',\n  forum_tag_ids text[] NOT NULL DEFAULT '{}',\n  deleted boolean NOT NULL DEFAULT false\n);\n\nCREATE UNIQUE INDEX IF NOT EXISTS ft_thread_one_parent_message\n  ON fluxer_threads.ft_thread (parent_message_id)\n  WHERE parent_message_id IS NOT NULL AND deleted = false;\n\nCREATE INDEX IF NOT EXISTS ft_thread_channel ON fluxer_threads.ft_thread (channel_id);\n\nCREATE TABLE IF NOT EXISTS fluxer_threads.ft_thread_member (\n  thread_id text NOT NULL REFERENCES fluxer_threads.ft_thread (thread_id) ON DELETE CASCADE,\n  user_id text NOT NULL,\n  joined_at bigint NOT NULL,\n  notification_level text,\n  PRIMARY KEY (thread_id, user_id)\n);\n\nCREATE TABLE IF NOT EXISTS fluxer_threads.ft_thread_message (\n  message_id text PRIMARY KEY,\n  thread_id text NOT NULL,\n  thread_name text NOT NULL,\n  channel_id text NOT NULL,\n  guild_id text,\n  author_id text,\n  author_username text,\n  content text,\n  created_at bigint NOT NULL\n);\n\nCREATE INDEX IF NOT EXISTS ft_thread_message_thread ON fluxer_threads.ft_thread_message (thread_id, created_at);\n\nCREATE TABLE IF NOT EXISTS fluxer_threads.ft_audit (\n  id bigserial PRIMARY KEY,\n  guild_id text,\n  thread_id text,\n  action text NOT NULL,\n  actor_id text,\n  payload jsonb,\n  created_at timestamptz NOT NULL DEFAULT now()\n);\n\nCREATE TABLE IF NOT EXISTS fluxer_threads.ft_event (\n  id bigserial PRIMARY KEY,\n  event_name text NOT NULL,\n  payload jsonb NOT NULL,\n  created_at timestamptz NOT NULL DEFAULT now()\n);\n\nCREATE TABLE IF NOT EXISTS fluxer_threads.ft_forum (\n  channel_id text PRIMARY KEY,\n  guild_id text,\n  layout text NOT NULL DEFAULT 'list',\n  sort_order text NOT NULL DEFAULT 'latest',\n  guidelines text,\n  require_tag boolean NOT NULL DEFAULT false,\n  default_reaction text,\n  tags jsonb NOT NULL DEFAULT '[]',\n  kind text NOT NULL DEFAULT 'forum'\n);\n\nCREATE TABLE IF NOT EXISTS fluxer_threads.ft_read_state (\n  thread_id text NOT NULL,\n  user_id text NOT NULL,\n  last_read bigint NOT NULL,\n  PRIMARY KEY (thread_id, user_id)\n);\n\nCREATE TABLE IF NOT EXISTS fluxer_threads.ft_rollout (\n  guild_id text NOT NULL,\n  user_id text NOT NULL,\n  dismissed boolean NOT NULL DEFAULT false,\n  PRIMARY KEY (guild_id, user_id)\n);\n\nCREATE TABLE IF NOT EXISTS fluxer_threads.ft_webhook (\n  webhook_id text PRIMARY KEY,\n  thread_id text NOT NULL,\n  token text NOT NULL\n);\n";

// api/threads/ThreadStore.ts
var pool = new import_pg.default.Pool({
  host: process.env.FLUXER_POSTGRES_HOST ?? "postgres",
  port: Number(process.env.FLUXER_POSTGRES_PORT ?? 5432),
  database: process.env.FLUXER_POSTGRES_DATABASE ?? "fluxer",
  user: process.env.FLUXER_POSTGRES_USERNAME ?? "fluxer",
  password: process.env.FLUXER_POSTGRES_PASSWORD
});
var EPOCH = 1700000000000n;
var snowSeq = 0n;
var ready = null;
function nextSnowflake() {
  snowSeq = snowSeq + 1n & 4095n;
  const ts = BigInt(Date.now()) - EPOCH;
  return (ts << 22n | snowSeq).toString();
}
async function query(text, values = []) {
  await ensureSchema();
  const result = await pool.query(text, values);
  return result.rows;
}
async function ensureSchema() {
  if (!ready) {
    ready = (async () => {
      await pool.query(ft_0001_init_default);
      await pool.query(
        `INSERT INTO fluxer_threads.ft_schema_migration (id) VALUES ('ft_0001_init') ON CONFLICT (id) DO NOTHING`
      );
    })().catch((error) => {
      ready = null;
      throw error;
    });
  }
  await ready;
}
function rowToThread(row) {
  return {
    id: row.engine_id,
    channelId: row.channel_id,
    communityId: row.guild_id,
    parentMessageId: row.parent_message_id,
    name: row.name,
    creatorId: row.creator_id,
    creatorUsername: row.creator_username,
    state: row.state,
    createdAt: Number(row.created_at),
    autoArchiveDurationMinutes: row.auto_archive_duration_minutes,
    archivedAt: row.archived_at == null ? null : Number(row.archived_at),
    archivedBy: row.archived_by,
    lastMessageTimestamp: row.last_message_timestamp == null ? null : Number(row.last_message_timestamp),
    lastMessageSenderId: row.last_message_sender_id,
    lastMessageSenderUsername: row.last_message_sender_username,
    messageCount: row.message_count,
    memberCount: row.member_count
  };
}
function restore(row, memberIds) {
  const manager = new ThreadManager();
  const thread = rowToThread(row);
  const maps = manager;
  maps.threads.set(thread.id, thread);
  maps.members.set(thread.id, new Set(memberIds));
  return manager;
}
async function membersOf(threadId) {
  const rows = await query(`SELECT user_id FROM fluxer_threads.ft_thread_member WHERE thread_id = $1`, [threadId]);
  return rows.map((row) => String(row.user_id));
}
async function save(row, thread) {
  await query(
    `UPDATE fluxer_threads.ft_thread SET
			name = $2, state = $3, archived_at = $4, archived_by = $5,
			last_message_timestamp = $6, last_message_sender_id = $7, last_message_sender_username = $8,
			message_count = $9, member_count = $10, locked = $11, deleted = $12
		 WHERE thread_id = $1`,
    [
      row.thread_id,
      thread.name,
      thread.state,
      thread.archivedAt ?? null,
      thread.archivedBy ?? null,
      thread.lastMessageTimestamp ?? null,
      thread.lastMessageSenderId ?? null,
      thread.lastMessageSenderUsername ?? null,
      thread.messageCount,
      thread.memberCount,
      thread.state === "archived",
      thread.state === "deleted"
    ]
  );
}
var natsConnection = null;
async function dispatchGuild(eventName, data) {
  const guildId = data.guild_id;
  if (!guildId) return;
  try {
    if (!natsConnection) {
      const nats = await import("@nats-io/transport-node");
      natsConnection = await nats.connect({ servers: process.env.FLUXER_NATS_URL || "nats://nats:4222" });
    }
    await natsConnection.request(
      "rpc.gateway.guild.dispatch",
      JSON.stringify({ guild_id: String(guildId), event: eventName, data }),
      { timeout: 2e3 }
    );
  } catch {
    natsConnection = null;
  }
}
async function recordEvent(eventName, payload) {
  await query(`INSERT INTO fluxer_threads.ft_event (event_name, payload) VALUES ($1, $2::jsonb)`, [
    eventName,
    JSON.stringify(payload)
  ]);
  await query(`INSERT INTO fluxer_threads.ft_audit (guild_id, thread_id, action, actor_id, payload) VALUES ($1, $2, $3, $4, $5::jsonb)`, [
    payload.guild_id ?? null,
    payload.id ?? payload.thread_id ?? null,
    eventName,
    payload.actor_id ?? null,
    JSON.stringify(payload)
  ]);
  const threadId = payload.id ?? payload.thread_id;
  let data = payload;
  if (threadId) {
    const row = await getThreadRow(String(threadId));
    if (row) data = { ...toApiThread(row), ...payload };
  }
  await dispatchGuild(eventName, data);
}
function toApiThread(row) {
  return {
    id: row.thread_id,
    parent_id: row.channel_id,
    guild_id: row.guild_id,
    owner_id: row.creator_id,
    name: row.name,
    type: row.is_private ? 12 : 11,
    message_count: row.message_count,
    member_count: row.member_count,
    has_thread: Boolean(row.parent_message_id),
    parent_message_id: row.parent_message_id,
    last_message_preview: row.last_message_preview,
    last_message_sender_username: row.last_message_sender_username,
    thread_metadata: {
      archived: row.state === "closed" || row.state === "archived",
      archive_timestamp: row.archived_at,
      auto_archive_duration: row.auto_archive_duration_minutes,
      locked: row.state === "archived",
      invitable: row.invitable,
      create_timestamp: row.created_at,
      state: row.state
    },
    private: row.is_private,
    kind: row.kind,
    joined: Boolean(row.joined)
  };
}
async function getThreadRow(threadId) {
  const rows = await query(`SELECT * FROM fluxer_threads.ft_thread WHERE thread_id = $1 AND deleted = false`, [threadId]);
  return rows[0] ?? null;
}
async function listChannelThreads(channelId, bucket, userId) {
  await sweepChannel(channelId);
  const stateSql = bucket === "active" ? `state = 'active'` : bucket === "archived" ? `state IN ('closed', 'archived')` : `state <> 'deleted'`;
  const rows = await query(
    `SELECT * FROM fluxer_threads.ft_thread WHERE channel_id = $1 AND deleted = false AND ${stateSql} ORDER BY last_message_timestamp DESC NULLS LAST`,
    [channelId]
  );
  if (!userId) return rows;
  const memberships = await query(`SELECT thread_id FROM fluxer_threads.ft_thread_member WHERE user_id = $1`, [userId]);
  const joined = new Set(memberships.map((member) => String(member.thread_id)));
  return rows.map((row) => ({ ...row, joined: joined.has(String(row.thread_id)) }));
}
async function sweepChannel(channelId) {
  const rows = await query(
    `SELECT * FROM fluxer_threads.ft_thread WHERE channel_id = $1 AND state = 'active' AND deleted = false`,
    [channelId]
  );
  const now = Date.now();
  for (const row of rows) {
    const last = Number(row.last_message_timestamp ?? row.created_at);
    const limit = Number(row.auto_archive_duration_minutes) * 60 * 1e3;
    if (now - last < limit) continue;
    const manager = restore(row, await membersOf(row.thread_id));
    if (manager.archiveThread(row.engine_id, "system")) {
      const thread = manager.getThread(row.engine_id);
      if (thread) await save(row, thread);
      await recordEvent("THREAD_UPDATE", { id: row.thread_id, state: "archived", actor_id: "system" });
    }
  }
}
async function createStoredThread(input) {
  if (input.parentMessageId) {
    const existing = await query(
      `SELECT thread_id FROM fluxer_threads.ft_thread WHERE parent_message_id = $1 AND deleted = false`,
      [input.parentMessageId]
    );
    if (existing[0]) {
      const row2 = await getThreadRow(String(existing[0].thread_id));
      if (row2) return row2;
    }
  }
  const manager = new ThreadManager();
  const thread = manager.createThread({
    channelId: input.channelId,
    parentMessageId: input.parentMessageId,
    name: input.name,
    creatorId: input.creatorId,
    creatorUsername: input.creatorUsername,
    autoArchiveDurationMinutes: input.autoArchiveDurationMinutes
  });
  const threadId = nextSnowflake();
  await query(
    `INSERT INTO fluxer_threads.ft_thread (
			thread_id, engine_id, channel_id, guild_id, parent_message_id, name, creator_id, creator_username,
			state, created_at, auto_archive_duration_minutes, last_message_timestamp, message_count, member_count,
			is_private, kind
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [
      threadId,
      thread.id,
      input.channelId,
      input.guildId ?? null,
      input.parentMessageId ?? null,
      thread.name,
      thread.creatorId,
      thread.creatorUsername,
      thread.state,
      thread.createdAt,
      thread.autoArchiveDurationMinutes,
      thread.lastMessageTimestamp,
      thread.messageCount,
      thread.memberCount,
      Boolean(input.isPrivate),
      input.kind ?? (input.isPrivate ? "private" : "public")
    ]
  );
  await query(`INSERT INTO fluxer_threads.ft_thread_member (thread_id, user_id, joined_at) VALUES ($1, $2, $3)`, [
    threadId,
    input.creatorId,
    thread.createdAt
  ]);
  const row = await getThreadRow(threadId);
  if (!row) throw new Error("thread insert failed");
  await recordEvent("THREAD_CREATE", { id: threadId, channel_id: input.channelId, guild_id: input.guildId, actor_id: input.creatorId });
  return row;
}
async function mutate(threadId, actorId, eventName, run) {
  const row = await getThreadRow(threadId);
  if (!row) return null;
  const manager = restore(row, await membersOf(threadId));
  if (!run(manager, row)) return row;
  const thread = manager.getThread(row.engine_id);
  if (thread) await save(row, thread);
  await recordEvent(eventName, { id: threadId, guild_id: row.guild_id, actor_id: actorId, state: thread?.state });
  return getThreadRow(threadId);
}
function joinStored(threadId, userId) {
  return mutate(threadId, userId, "THREAD_MEMBER_UPDATE", (manager, row) => manager.joinThread(row.engine_id, userId)).then(async (updated) => {
    if (updated) {
      await query(
        `INSERT INTO fluxer_threads.ft_thread_member (thread_id, user_id, joined_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [threadId, userId, Date.now()]
      );
    }
    return updated;
  });
}
function leaveStored(threadId, userId) {
  return mutate(threadId, userId, "THREAD_MEMBER_UPDATE", (manager, row) => {
    if (row.state === "archived") return false;
    return manager.leaveThread(row.engine_id, userId);
  }).then(async (updated) => {
    await query(`DELETE FROM fluxer_threads.ft_thread_member WHERE thread_id = $1 AND user_id = $2`, [threadId, userId]);
    return updated;
  });
}
function closeStored(threadId, actorId) {
  return mutate(threadId, actorId, "THREAD_UPDATE", (manager, row) => manager.closeThread(row.engine_id));
}
function reopenStored(threadId, actorId) {
  return mutate(threadId, actorId, "THREAD_UPDATE", (manager, row) => manager.reopenThread(row.engine_id));
}
function archiveStored(threadId, actorId) {
  return mutate(threadId, actorId, "THREAD_UPDATE", (manager, row) => manager.archiveThread(row.engine_id, actorId));
}
function unarchiveStored(threadId, actorId) {
  return mutate(threadId, actorId, "THREAD_UPDATE", (manager, row) => manager.unarchiveThread(row.engine_id));
}
function deleteStored(threadId, actorId) {
  return mutate(threadId, actorId, "THREAD_DELETE", (manager, row) => {
    const thread = manager.getThread(row.engine_id);
    if (!thread || thread.state === "deleted") return false;
    thread.state = "deleted";
    return true;
  });
}
async function renameStored(threadId, name, actorId, extra) {
  const row = await getThreadRow(threadId);
  if (!row) return null;
  const manager = restore(row, await membersOf(threadId));
  const thread = manager.getThread(row.engine_id);
  if (!thread) return null;
  thread.name = name;
  await save(row, thread);
  await query(
    `UPDATE fluxer_threads.ft_thread SET slowmode_seconds = COALESCE($2, slowmode_seconds), auto_archive_duration_minutes = COALESCE($3, auto_archive_duration_minutes), invitable = COALESCE($4, invitable) WHERE thread_id = $1`,
    [threadId, extra.slowmode ?? null, extra.autoArchive ?? null, extra.invitable ?? null]
  );
  await recordEvent("THREAD_UPDATE", { id: threadId, actor_id: actorId, name });
  return getThreadRow(threadId);
}
async function listGuildThreads(guildId, userId) {
  const rows = await query(
    `SELECT * FROM fluxer_threads.ft_thread WHERE guild_id = $1 AND state = 'active' AND deleted = false ORDER BY created_at ASC`,
    [guildId]
  );
  if (!userId) return rows;
  const memberships = await query(`SELECT thread_id FROM fluxer_threads.ft_thread_member WHERE user_id = $1`, [userId]);
  const joined = new Set(memberships.map((member) => String(member.thread_id)));
  return rows.map((row) => ({ ...row, joined: joined.has(String(row.thread_id)) }));
}
async function listThreadMessages(threadId) {
  return query(
    `SELECT message_id, thread_id, author_id, author_username, content, created_at FROM fluxer_threads.ft_thread_message WHERE thread_id = $1 ORDER BY created_at ASC`,
    [threadId]
  );
}
async function addThreadMessage(input) {
  const row = await getThreadRow(input.threadId);
  if (!row) throw new Error("UNKNOWN_THREAD");
  const messageId = (BigInt(Date.now()) << 22n | BigInt(Math.floor(Math.random() * 1024))).toString();
  const createdAt = Date.now();
  await query(
    `INSERT INTO fluxer_threads.ft_thread_message (message_id, thread_id, thread_name, channel_id, guild_id, author_id, author_username, content, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [messageId, input.threadId, row.name, row.channel_id, row.guild_id, input.authorId, input.authorUsername, input.content, createdAt]
  );
  await query(
    `UPDATE fluxer_threads.ft_thread SET message_count = message_count + 1, last_message_timestamp = $2, last_message_sender_id = $3, last_message_sender_username = $4, last_message_preview = $5 WHERE thread_id = $1`,
    [input.threadId, createdAt, input.authorId, input.authorUsername, input.content.slice(0, 180)]
  );
  return { id: messageId, channel_id: input.threadId, author_id: input.authorId, author_username: input.authorUsername, content: input.content, created_at: createdAt };
}
async function listMembers(threadId) {
  return query(`SELECT user_id, joined_at, notification_level FROM fluxer_threads.ft_thread_member WHERE thread_id = $1`, [threadId]);
}
async function sweepAll() {
  const rows = await query(`SELECT DISTINCT channel_id FROM fluxer_threads.ft_thread WHERE state = 'active' AND deleted = false`);
  for (const row of rows) await sweepChannel(String(row.channel_id));
}

// api/threads/ThreadController.ts
var createBuckets = /* @__PURE__ */ new Map();
function perms(manage) {
  return {
    canViewChannel: true,
    canSendMessages: true,
    canCreateThreads: true,
    canManageThreads: manage,
    isModerator: manage
  };
}
function userOf(ctx) {
  const user = ctx.get("user");
  return { id: String(user.id), username: user.username || user.global_name || "user" };
}
function limited(userId) {
  const now = Date.now();
  const hits = (createBuckets.get(userId) ?? []).filter((stamp) => now - stamp < 1e4);
  if (hits.length >= 5) return true;
  hits.push(now);
  createBuckets.set(userId, hits);
  return false;
}
async function bodyOf(ctx) {
  try {
    const value = await ctx.req.json();
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}
function mount(app, loginRequired) {
  ThreadController(app, loginRequired);
}
function ThreadController(app, loginRequired) {
  app.post("/channels/:channel_id/messages/:message_id/threads", loginRequired, async (ctx) => {
    const user = userOf(ctx);
    if (!ThreadPermissions.canCreateThread(perms(false))) return ctx.json({ code: "MISSING_PERMISSIONS" }, 403);
    if (limited(user.id)) return ctx.json({ code: "RATE_LIMITED" }, 429);
    const body = await bodyOf(ctx);
    const row = await createStoredThread({
      channelId: ctx.req.param("channel_id"),
      guildId: typeof body.guild_id === "string" ? body.guild_id : null,
      parentMessageId: ctx.req.param("message_id"),
      name: String(body.name || "\u041D\u043E\u0432\u0430\u044F \u0432\u0435\u0442\u043A\u0430"),
      creatorId: user.id,
      creatorUsername: user.username,
      autoArchiveDurationMinutes: Number(body.auto_archive_duration || 10080),
      isPrivate: Boolean(body.private)
    });
    return ctx.json(toApiThread(row), 201);
  });
  app.post("/channels/:channel_id/threads", loginRequired, async (ctx) => {
    const user = userOf(ctx);
    if (!ThreadPermissions.canCreateThread(perms(false))) return ctx.json({ code: "MISSING_PERMISSIONS" }, 403);
    if (limited(user.id)) return ctx.json({ code: "RATE_LIMITED" }, 429);
    const body = await bodyOf(ctx);
    const row = await createStoredThread({
      channelId: ctx.req.param("channel_id"),
      guildId: typeof body.guild_id === "string" ? body.guild_id : null,
      name: String(body.name || "\u041D\u043E\u0432\u0430\u044F \u0432\u0435\u0442\u043A\u0430"),
      creatorId: user.id,
      creatorUsername: user.username,
      autoArchiveDurationMinutes: Number(body.auto_archive_duration || 10080),
      isPrivate: Boolean(body.private),
      kind: typeof body.kind === "string" ? body.kind : void 0
    });
    if (typeof body.message === "string" && body.message) {
      await recordEvent("THREAD_MESSAGE", { id: row.thread_id, content: body.message, actor_id: user.id });
    }
    return ctx.json(toApiThread(row), 201);
  });
  app.get("/channels/:channel_id/threads/active", loginRequired, async (ctx) => {
    const rows = await listChannelThreads(ctx.req.param("channel_id"), "active", userOf(ctx).id);
    return ctx.json({ threads: rows.map(toApiThread) });
  });
  app.get("/channels/:channel_id/threads/archived/public", loginRequired, async (ctx) => {
    const rows = (await listChannelThreads(ctx.req.param("channel_id"), "archived", userOf(ctx).id)).filter((row) => !row.is_private);
    return ctx.json({ threads: rows.map(toApiThread) });
  });
  app.get("/channels/:channel_id/threads/archived/private", loginRequired, async (ctx) => {
    const user = userOf(ctx);
    const rows = (await listChannelThreads(ctx.req.param("channel_id"), "archived", userOf(ctx).id)).filter((row) => row.is_private);
    const visible = [];
    for (const row of rows) {
      const members = await listMembers(String(row.thread_id));
      if (members.some((member) => member.user_id === user.id) || row.creator_id === user.id) visible.push(row);
    }
    return ctx.json({ threads: visible.map(toApiThread) });
  });
  app.get("/guilds/:guild_id/threads/active", loginRequired, async (ctx) => {
    const rows = await listGuildThreads(ctx.req.param("guild_id"), userOf(ctx).id);
    return ctx.json({ threads: rows.map(toApiThread) });
  });
  app.get("/channels/:thread_id/messages", loginRequired, async (ctx, next) => {
    const row = await getThreadRow(ctx.req.param("thread_id"));
    if (!row) return next();
    const messages = await listThreadMessages(row.thread_id);
    return ctx.json(messages);
  });
  app.get("/channels/:thread_id/thread-members", loginRequired, async (ctx) => {
    const members = await listMembers(ctx.req.param("thread_id"));
    return ctx.json(members);
  });
  app.put("/channels/:thread_id/thread-members/@me", loginRequired, async (ctx) => {
    const user = userOf(ctx);
    const row = await joinStored(ctx.req.param("thread_id"), user.id);
    if (!row) return ctx.json({ code: "UNKNOWN_THREAD" }, 404);
    return ctx.json(toApiThread(row));
  });
  app.delete("/channels/:thread_id/thread-members/@me", loginRequired, async (ctx) => {
    const user = userOf(ctx);
    const row = await getThreadRow(ctx.req.param("thread_id"));
    if (!row) return ctx.json({ code: "UNKNOWN_THREAD" }, 404);
    if (row.state === "archived") return ctx.json({ code: "THREAD_ARCHIVED" }, 400);
    await leaveStored(ctx.req.param("thread_id"), user.id);
    return ctx.body(null, 204);
  });
  app.put("/channels/:thread_id/thread-members/:user_id", loginRequired, async (ctx) => {
    const actor = userOf(ctx);
    const row = await getThreadRow(ctx.req.param("thread_id"));
    if (!row) return ctx.json({ code: "UNKNOWN_THREAD" }, 404);
    const manage = ThreadPermissions.canManageThread(perms(false), String(row.creator_id), actor.id) || row.invitable;
    if (!manage) return ctx.json({ code: "MISSING_PERMISSIONS" }, 403);
    const updated = await joinStored(ctx.req.param("thread_id"), ctx.req.param("user_id"));
    return ctx.json(updated ? toApiThread(updated) : {});
  });
  app.delete("/channels/:thread_id/thread-members/:user_id", loginRequired, async (ctx) => {
    const actor = userOf(ctx);
    const row = await getThreadRow(ctx.req.param("thread_id"));
    if (!row) return ctx.json({ code: "UNKNOWN_THREAD" }, 404);
    if (!ThreadPermissions.canManageThread(perms(false), String(row.creator_id), actor.id)) {
      return ctx.json({ code: "MISSING_PERMISSIONS" }, 403);
    }
    await leaveStored(ctx.req.param("thread_id"), ctx.req.param("user_id"));
    return ctx.body(null, 204);
  });
  app.patch("/channels/:thread_id", loginRequired, async (ctx) => {
    const actor = userOf(ctx);
    const current = await getThreadRow(ctx.req.param("thread_id"));
    if (!current) return ctx.json({ code: "UNKNOWN_THREAD" }, 404);
    const body = await bodyOf(ctx);
    const manage = ThreadPermissions.canManageThread(perms(Boolean(body.manage)), String(current.creator_id), actor.id);
    if (body.archived === true && body.locked === true) {
      if (!manage) return ctx.json({ code: "MISSING_PERMISSIONS" }, 403);
      const row2 = await archiveStored(ctx.req.param("thread_id"), actor.id);
      return ctx.json(row2 ? toApiThread(row2) : {});
    }
    if (body.archived === true) {
      const row2 = await closeStored(ctx.req.param("thread_id"), actor.id);
      return ctx.json(row2 ? toApiThread(row2) : {});
    }
    if (body.archived === false && current.state === "archived" && !manage) return ctx.json({ code: "MISSING_PERMISSIONS" }, 403);
    if (body.archived === false && current.state === "archived") {
      const row2 = await unarchiveStored(ctx.req.param("thread_id"), actor.id);
      return ctx.json(row2 ? toApiThread(row2) : {});
    }
    if (body.archived === false) {
      const row2 = await reopenStored(ctx.req.param("thread_id"), actor.id);
      return ctx.json(row2 ? toApiThread(row2) : {});
    }
    const row = await renameStored(ctx.req.param("thread_id"), String(body.name || current.name), actor.id, {
      slowmode: body.rate_limit_per_user == null ? null : Number(body.rate_limit_per_user),
      autoArchive: body.auto_archive_duration == null ? null : Number(body.auto_archive_duration),
      invitable: typeof body.invitable === "boolean" ? body.invitable : null
    });
    return ctx.json(row ? toApiThread(row) : {});
  });
  app.delete("/channels/:thread_id", loginRequired, async (ctx) => {
    const actor = userOf(ctx);
    const current = await getThreadRow(ctx.req.param("thread_id"));
    if (!current) return ctx.json({ code: "UNKNOWN_THREAD" }, 404);
    if (!ThreadPermissions.canManageThread(perms(false), String(current.creator_id), actor.id)) {
      return ctx.json({ code: "MISSING_PERMISSIONS" }, 403);
    }
    await deleteStored(ctx.req.param("thread_id"), actor.id);
    return ctx.body(null, 204);
  });
  app.post("/channels/:thread_id/messages", loginRequired, async (ctx, next) => {
    const actor = userOf(ctx);
    const current = await getThreadRow(ctx.req.param("thread_id"));
    if (!current) return next();
    if (!ThreadPermissions.canSendInThread(perms(false), String(current.state))) {
      return ctx.json({ code: "MISSING_PERMISSIONS" }, 403);
    }
    if (current.state === "closed") await reopenStored(ctx.req.param("thread_id"), actor.id);
    const body = await bodyOf(ctx);
    await joinStored(ctx.req.param("thread_id"), actor.id);
    const message = await addThreadMessage({
      threadId: current.thread_id,
      authorId: actor.id,
      authorUsername: actor.username,
      content: String(body.content ?? "")
    });
    await recordEvent("THREAD_MESSAGE", { id: current.thread_id, content: body.content, actor_id: actor.id, guild_id: current.guild_id });
    return ctx.json(message, 201);
  });
  app.post("/webhooks/:webhook_id/:token", async (ctx, next) => {
    const threadId = String(ctx.req.query("thread_id") || "");
    if (!threadId) return next();
    const body = await bodyOf(ctx);
    const row = await getThreadRow(threadId);
    if (!row) return ctx.json({ code: "UNKNOWN_THREAD" }, 404);
    await recordEvent("THREAD_MESSAGE", { id: threadId, webhook_id: ctx.req.param("webhook_id"), content: body.content });
    return ctx.json({ id: threadId }, 200);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ThreadController,
  mount,
  sweepAll
});
