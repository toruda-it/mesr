CREATE SCHEMA IF NOT EXISTS fluxer_threads;

CREATE TABLE IF NOT EXISTS fluxer_threads.ft_schema_migration (
  id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fluxer_threads.ft_thread (
  thread_id text PRIMARY KEY,
  engine_id text NOT NULL UNIQUE,
  channel_id text NOT NULL,
  guild_id text,
  parent_message_id text,
  name text NOT NULL,
  creator_id text NOT NULL,
  creator_username text NOT NULL,
  state text NOT NULL,
  created_at bigint NOT NULL,
  auto_archive_duration_minutes integer NOT NULL,
  archived_at bigint,
  archived_by text,
  last_message_timestamp bigint,
  last_message_sender_id text,
  last_message_sender_username text,
  last_message_preview text,
  message_count integer NOT NULL DEFAULT 0,
  member_count integer NOT NULL DEFAULT 1,
  is_private boolean NOT NULL DEFAULT false,
  locked boolean NOT NULL DEFAULT false,
  invitable boolean NOT NULL DEFAULT true,
  slowmode_seconds integer,
  kind text NOT NULL DEFAULT 'public',
  forum_tag_ids text[] NOT NULL DEFAULT '{}',
  deleted boolean NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX IF NOT EXISTS ft_thread_one_parent_message
  ON fluxer_threads.ft_thread (parent_message_id)
  WHERE parent_message_id IS NOT NULL AND deleted = false;

CREATE INDEX IF NOT EXISTS ft_thread_channel ON fluxer_threads.ft_thread (channel_id);

ALTER TABLE fluxer_threads.ft_thread ADD COLUMN IF NOT EXISTS fluxer_channel_id text;
ALTER TABLE fluxer_threads.ft_thread ADD COLUMN IF NOT EXISTS spoiler boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS ft_thread_fluxer_channel
  ON fluxer_threads.ft_thread (fluxer_channel_id)
  WHERE fluxer_channel_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS fluxer_threads.ft_thread_member (
  thread_id text NOT NULL REFERENCES fluxer_threads.ft_thread (thread_id) ON DELETE CASCADE,
  user_id text NOT NULL,
  joined_at bigint NOT NULL,
  notification_level text,
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS fluxer_threads.ft_thread_message (
  message_id text PRIMARY KEY,
  thread_id text NOT NULL,
  thread_name text NOT NULL,
  channel_id text NOT NULL,
  guild_id text,
  author_id text,
  author_username text,
  content text,
  created_at bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS ft_thread_message_thread ON fluxer_threads.ft_thread_message (thread_id, created_at);

CREATE TABLE IF NOT EXISTS fluxer_threads.ft_audit (
  id bigserial PRIMARY KEY,
  guild_id text,
  thread_id text,
  action text NOT NULL,
  actor_id text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fluxer_threads.ft_event (
  id bigserial PRIMARY KEY,
  event_name text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fluxer_threads.ft_forum (
  channel_id text PRIMARY KEY,
  guild_id text,
  layout text NOT NULL DEFAULT 'list',
  sort_order text NOT NULL DEFAULT 'latest',
  guidelines text,
  require_tag boolean NOT NULL DEFAULT false,
  default_reaction text,
  tags jsonb NOT NULL DEFAULT '[]',
  kind text NOT NULL DEFAULT 'forum'
);

CREATE TABLE IF NOT EXISTS fluxer_threads.ft_read_state (
  thread_id text NOT NULL,
  user_id text NOT NULL,
  last_read bigint NOT NULL,
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS fluxer_threads.ft_rollout (
  guild_id text NOT NULL,
  user_id text NOT NULL,
  dismissed boolean NOT NULL DEFAULT false,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS fluxer_threads.ft_webhook (
  webhook_id text PRIMARY KEY,
  thread_id text NOT NULL,
  token text NOT NULL
);
