import pg from 'pg';
import {ThreadManager} from './thread-manager';
import type {Thread} from './types';
import schemaSql from './ft_0001_init.sql';

const pool = new pg.Pool({
	host: process.env.FLUXER_POSTGRES_HOST ?? 'postgres',
	port: Number(process.env.FLUXER_POSTGRES_PORT ?? 5432),
	database: process.env.FLUXER_POSTGRES_DATABASE ?? 'fluxer',
	user: process.env.FLUXER_POSTGRES_USERNAME ?? 'fluxer',
	password: process.env.FLUXER_POSTGRES_PASSWORD,
});

const EPOCH = 1700000000000n;
let snowSeq = 0n;
let ready: Promise<void> | null = null;

type Row = Record<string, any>;

export function nextSnowflake(): string {
	snowSeq = (snowSeq + 1n) & 4095n;
	const ts = BigInt(Date.now()) - EPOCH;
	return ((ts << 22n) | snowSeq).toString();
}

async function query(text: string, values: Array<unknown> = []): Promise<Array<Row>> {
	await ensureSchema();
	const result = await pool.query(text, values);
	return result.rows as Array<Row>;
}

export async function ensureSchema(): Promise<void> {
	if (!ready) {
		ready = (async () => {
			await pool.query(schemaSql);
			await pool.query(
				`INSERT INTO fluxer_threads.ft_schema_migration (id) VALUES ('ft_0001_init') ON CONFLICT (id) DO NOTHING`,
			);
		})().catch((error) => {
			ready = null;
			throw error;
		});
	}
	await ready;
}

function rowToThread(row: Row): Thread {
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
		memberCount: row.member_count,
	};
}

function restore(row: Row, memberIds: Array<string>): ThreadManager {
	const manager = new ThreadManager();
	const thread = rowToThread(row);
	const maps = manager as unknown as {threads: Map<string, Thread>; members: Map<string, Set<string>>};
	maps.threads.set(thread.id, thread);
	maps.members.set(thread.id, new Set(memberIds));
	return manager;
}

async function membersOf(threadId: string): Promise<Array<string>> {
	const rows = await query(`SELECT user_id FROM fluxer_threads.ft_thread_member WHERE thread_id = $1`, [threadId]);
	return rows.map((row) => String(row.user_id));
}

async function save(row: Row, thread: Thread): Promise<void> {
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
			thread.state === 'archived',
			thread.state === 'deleted',
		],
	);
}

let natsConnection: {request: (subject: string, data: string, opts: {timeout: number}) => Promise<unknown>} | null = null;

async function dispatchGuild(eventName: string, data: Record<string, unknown>): Promise<void> {
	const guildId = data.guild_id;
	if (!guildId) return;
	try {
		if (!natsConnection) {
			const nats = await import('@nats-io/transport-node');
			natsConnection = await nats.connect({servers: process.env.FLUXER_NATS_URL || 'nats://nats:4222'});
		}
		await natsConnection.request(
			'rpc.gateway.guild.dispatch',
			JSON.stringify({guild_id: String(guildId), event: eventName, data}),
			{timeout: 2000},
		);
	} catch {
		natsConnection = null;
	}
}

export async function recordEvent(eventName: string, payload: Record<string, unknown>): Promise<void> {
	await query(`INSERT INTO fluxer_threads.ft_event (event_name, payload) VALUES ($1, $2::jsonb)`, [
		eventName,
		JSON.stringify(payload),
	]);
	await query(`INSERT INTO fluxer_threads.ft_audit (guild_id, thread_id, action, actor_id, payload) VALUES ($1, $2, $3, $4, $5::jsonb)`, [
		payload.guild_id ?? null,
		payload.id ?? payload.thread_id ?? null,
		eventName,
		payload.actor_id ?? null,
		JSON.stringify(payload),
	]);
	const threadId = payload.id ?? payload.thread_id;
	let data = payload;
	if (threadId) {
		const row = await getThreadRow(String(threadId));
		if (row) data = {...toApiThread(row), ...payload};
	}
	await dispatchGuild(eventName, data);
}

export function toApiThread(row: Row) {
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
			archived: row.state === 'closed' || row.state === 'archived',
			archive_timestamp: row.archived_at,
			auto_archive_duration: row.auto_archive_duration_minutes,
			locked: row.state === 'archived',
			invitable: row.invitable,
			create_timestamp: row.created_at,
			state: row.state,
		},
		private: row.is_private,
		kind: row.kind,
		joined: Boolean(row.joined),
		member_ids: Array.isArray(row.member_ids) ? row.member_ids.map((id: unknown) => String(id)) : [],
		fluxer_channel_id: row.fluxer_channel_id ?? null,
		spoiler: Boolean(row.spoiler),
		last_message_timestamp: row.last_message_timestamp ?? null,
	};
}

export async function getThreadRow(threadId: string): Promise<Row | null> {
	const rows = await query(`SELECT * FROM fluxer_threads.ft_thread WHERE thread_id = $1 AND deleted = false`, [threadId]);
	return rows[0] ?? null;
}

export async function getThreadByFluxerChannel(channelId: string): Promise<Row | null> {
	const rows = await query(
		`SELECT * FROM fluxer_threads.ft_thread WHERE fluxer_channel_id = $1 AND deleted = false AND state <> 'deleted' LIMIT 1`,
		[channelId],
	);
	return rows[0] ?? null;
}

export function hiddenByInactivity(row: Row): boolean {
	if (row.state === 'closed') return true;
	if (row.state !== 'archived') return false;
	const by = row.archived_by == null ? '' : String(row.archived_by);
	return by === '' || by === 'system';
}

export async function noteFluxerChannelMessage(channelId: string, actor: {id: string; username: string}): Promise<void> {
	const row = await getThreadByFluxerChannel(channelId);
	if (!row || row.state === 'deleted') return;
	if (row.state !== 'active' && !hiddenByInactivity(row)) return;
	const manager = restore(row, await membersOf(String(row.thread_id)));
	if (row.state === 'closed') manager.reopenThread(row.engine_id);
	else if (row.state === 'archived') manager.unarchiveThread(row.engine_id);
	const thread = manager.getThread(row.engine_id);
	if (!thread || thread.state !== 'active') return;
	thread.lastMessageTimestamp = Date.now();
	thread.lastMessageSenderId = actor.id;
	thread.lastMessageSenderUsername = actor.username;
	await save(row, thread);
	if (row.state !== 'active') {
		await recordEvent('THREAD_UPDATE', {id: row.thread_id, state: 'active', actor_id: actor.id, guild_id: row.guild_id});
	}
}

export async function listChannelThreads(channelId: string, bucket: 'active' | 'archived' | 'all', userId?: string): Promise<Array<Row>> {
	await sweepChannel(channelId);
	const stateSql =
		bucket === 'active'
			? `state = 'active'`
			: bucket === 'archived'
				? `state IN ('closed', 'archived')`
				: `state <> 'deleted'`;
	const rows = await query(
		`SELECT * FROM fluxer_threads.ft_thread WHERE channel_id = $1 AND deleted = false AND ${stateSql} ORDER BY last_message_timestamp DESC NULLS LAST`,
		[channelId],
	);
	return withMembers(await withJoined(rows, userId));
}

async function withMembers(rows: Array<Row>): Promise<Array<Row>> {
	if (!rows.length) return rows;
	const members = await query(
		`SELECT thread_id, user_id FROM fluxer_threads.ft_thread_member WHERE thread_id = ANY($1::text[]) ORDER BY joined_at ASC`,
		[rows.map((row) => String(row.thread_id))],
	);
	const byThread = new Map<string, Array<string>>();
	for (const member of members) {
		const key = String(member.thread_id);
		const list = byThread.get(key) ?? [];
		list.push(String(member.user_id));
		byThread.set(key, list);
	}
	return rows.map((row) => ({...row, member_ids: byThread.get(String(row.thread_id)) ?? []}));
}

function withJoined(rows: Array<Row>, userId?: string): Promise<Array<Row>> {
	if (!userId) return Promise.resolve(rows);
	return query(`SELECT thread_id FROM fluxer_threads.ft_thread_member WHERE user_id = $1`, [userId]).then((memberships) => {
		const joined = new Set(memberships.map((member) => String(member.thread_id)));
		return rows.map((row) => ({
			...row,
			joined: joined.has(String(row.thread_id)),
		}));
	});
}

async function sweepChannel(channelId: string): Promise<void> {
	const rows = await query(
		`SELECT * FROM fluxer_threads.ft_thread WHERE channel_id = $1 AND state = 'active' AND deleted = false`,
		[channelId],
	);
	const now = Date.now();
	for (const row of rows) {
		const last = Number(row.last_message_timestamp ?? row.created_at);
		const limit = Number(row.auto_archive_duration_minutes) * 60 * 1000;
		if (now - last < limit) continue;
		const manager = restore(row, await membersOf(row.thread_id));
		if (manager.archiveThread(row.engine_id, 'system')) {
			const thread = manager.getThread(row.engine_id);
			if (thread) await save(row, thread);
			await recordEvent('THREAD_UPDATE', {id: row.thread_id, state: 'archived', actor_id: 'system'});
		}
	}
}

export async function createStoredThread(input: {
	channelId: string;
	guildId?: string | null;
	parentMessageId?: string | null;
	name: string;
	creatorId: string;
	creatorUsername: string;
	autoArchiveDurationMinutes?: number;
	isPrivate?: boolean;
	kind?: string;
	fluxerChannelId?: string | null;
}): Promise<Row> {
	if (input.parentMessageId) {
		const existing = await query(
			`SELECT thread_id FROM fluxer_threads.ft_thread WHERE parent_message_id = $1 AND deleted = false`,
			[input.parentMessageId],
		);
		if (existing[0]) {
			const row = await getThreadRow(String(existing[0].thread_id));
			if (row) return row;
		}
	}
	const manager = new ThreadManager();
	const thread = manager.createThread({
		channelId: input.channelId,
		parentMessageId: input.parentMessageId,
		name: input.name,
		creatorId: input.creatorId,
		creatorUsername: input.creatorUsername,
		autoArchiveDurationMinutes: input.autoArchiveDurationMinutes,
	});
	const threadId = nextSnowflake();
	await query(
		`INSERT INTO fluxer_threads.ft_thread (
			thread_id, engine_id, channel_id, guild_id, parent_message_id, name, creator_id, creator_username,
			state, created_at, auto_archive_duration_minutes, last_message_timestamp, message_count, member_count,
			is_private, kind, fluxer_channel_id
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
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
			input.kind ?? (input.isPrivate ? 'private' : 'public'),
			input.fluxerChannelId ?? null,
		],
	);
	await query(`INSERT INTO fluxer_threads.ft_thread_member (thread_id, user_id, joined_at) VALUES ($1, $2, $3)`, [
		threadId,
		input.creatorId,
		thread.createdAt,
	]);
	const row = await getThreadRow(threadId);
	if (!row) throw new Error('thread insert failed');
	await recordEvent('THREAD_CREATE', {id: threadId, channel_id: input.channelId, guild_id: input.guildId, actor_id: input.creatorId});
	return row;
}

async function mutate(threadId: string, actorId: string, eventName: string, run: (manager: ThreadManager, row: Row) => boolean): Promise<Row | null> {
	const row = await getThreadRow(threadId);
	if (!row) return null;
	const manager = restore(row, await membersOf(threadId));
	if (!run(manager, row)) return row;
	const thread = manager.getThread(row.engine_id);
	if (thread) await save(row, thread);
	await recordEvent(eventName, {id: threadId, guild_id: row.guild_id, actor_id: actorId, state: thread?.state});
	return getThreadRow(threadId);
}

export function joinStored(threadId: string, userId: string): Promise<Row | null> {
	return mutate(threadId, userId, 'THREAD_MEMBER_UPDATE', (manager, row) => manager.joinThread(row.engine_id, userId)).then(async (updated) => {
		if (updated) {
			await query(
				`INSERT INTO fluxer_threads.ft_thread_member (thread_id, user_id, joined_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
				[threadId, userId, Date.now()],
			);
		}
		return updated;
	});
}

export function leaveStored(threadId: string, userId: string): Promise<Row | null> {
	return mutate(threadId, userId, 'THREAD_MEMBER_UPDATE', (manager, row) => {
		if (row.state === 'archived') return false;
		return manager.leaveThread(row.engine_id, userId);
	}).then(async (updated) => {
		await query(`DELETE FROM fluxer_threads.ft_thread_member WHERE thread_id = $1 AND user_id = $2`, [threadId, userId]);
		return updated;
	});
}

export function closeStored(threadId: string, actorId: string): Promise<Row | null> {
	return mutate(threadId, actorId, 'THREAD_UPDATE', (manager, row) => manager.closeThread(row.engine_id));
}

export function reopenStored(threadId: string, actorId: string): Promise<Row | null> {
	return mutate(threadId, actorId, 'THREAD_UPDATE', (manager, row) => manager.reopenThread(row.engine_id));
}

export function archiveStored(threadId: string, actorId: string): Promise<Row | null> {
	return mutate(threadId, actorId, 'THREAD_UPDATE', (manager, row) => manager.archiveThread(row.engine_id, actorId));
}

export function unarchiveStored(threadId: string, actorId: string): Promise<Row | null> {
	return mutate(threadId, actorId, 'THREAD_UPDATE', (manager, row) => manager.unarchiveThread(row.engine_id));
}

export function deleteStored(threadId: string, actorId: string): Promise<Row | null> {
	return mutate(threadId, actorId, 'THREAD_DELETE', (manager, row) => {
		const thread = manager.getThread(row.engine_id);
		if (!thread || thread.state === 'deleted') return false;
		thread.state = 'deleted';
		return true;
	});
}

export async function renameStored(threadId: string, name: string, actorId: string, extra: {slowmode?: number | null; autoArchive?: number | null; invitable?: boolean | null}): Promise<Row | null> {
	const row = await getThreadRow(threadId);
	if (!row) return null;
	const manager = restore(row, await membersOf(threadId));
	const thread = manager.getThread(row.engine_id);
	if (!thread) return null;
	thread.name = name;
	await save(row, thread);
	await query(
		`UPDATE fluxer_threads.ft_thread SET slowmode_seconds = COALESCE($2, slowmode_seconds), auto_archive_duration_minutes = COALESCE($3, auto_archive_duration_minutes), invitable = COALESCE($4, invitable) WHERE thread_id = $1`,
		[threadId, extra.slowmode ?? null, extra.autoArchive ?? null, extra.invitable ?? null],
	);
	await recordEvent('THREAD_UPDATE', {id: threadId, actor_id: actorId, name});
	return getThreadRow(threadId);
}

export async function setSpoiler(threadId: string, spoiler: boolean): Promise<Row | null> {
	await query(`UPDATE fluxer_threads.ft_thread SET spoiler = $2 WHERE thread_id = $1 AND deleted = false`, [threadId, spoiler]);
	return getThreadRow(threadId);
}

export async function setFluxerChannel(threadId: string, fluxerChannelId: string): Promise<Row | null> {
	await query(`UPDATE fluxer_threads.ft_thread SET fluxer_channel_id = $2 WHERE thread_id = $1 AND deleted = false`, [
		threadId,
		fluxerChannelId,
	]);
	return getThreadRow(threadId);
}

export async function listGuildThreads(guildId: string, userId?: string): Promise<Array<Row>> {
	const rows = await query(
		`SELECT * FROM fluxer_threads.ft_thread WHERE guild_id = $1 AND deleted = false AND state <> 'deleted' ORDER BY created_at ASC`,
		[guildId],
	);
	return withMembers(await withJoined(rows, userId));
}

export async function listThreadMessages(threadId: string): Promise<Array<Row>> {
	return query(
		`SELECT message_id, thread_id, author_id, author_username, content, created_at FROM fluxer_threads.ft_thread_message WHERE thread_id = $1 ORDER BY created_at ASC`,
		[threadId],
	);
}

export async function addThreadMessage(input: {threadId: string; authorId: string; authorUsername: string; content: string}): Promise<Row> {
	const row = await getThreadRow(input.threadId);
	if (!row) throw new Error('UNKNOWN_THREAD');
	const messageId = (BigInt(Date.now()) << 22n | BigInt(Math.floor(Math.random() * 1024))).toString();
	const createdAt = Date.now();
	await query(
		`INSERT INTO fluxer_threads.ft_thread_message (message_id, thread_id, thread_name, channel_id, guild_id, author_id, author_username, content, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		[messageId, input.threadId, row.name, row.channel_id, row.guild_id, input.authorId, input.authorUsername, input.content, createdAt],
	);
	await query(
		`UPDATE fluxer_threads.ft_thread SET message_count = message_count + 1, last_message_timestamp = $2, last_message_sender_id = $3, last_message_sender_username = $4, last_message_preview = $5 WHERE thread_id = $1`,
		[input.threadId, createdAt, input.authorId, input.authorUsername, input.content.slice(0, 180)],
	);
	return {id: messageId, channel_id: input.threadId, author_id: input.authorId, author_username: input.authorUsername, content: input.content, created_at: createdAt};
}

export async function listMembers(threadId: string): Promise<Array<Row>> {
	return query(`SELECT user_id, joined_at, notification_level FROM fluxer_threads.ft_thread_member WHERE thread_id = $1`, [threadId]);
}

export async function sweepAll(): Promise<void> {
	const rows = await query(`SELECT DISTINCT channel_id FROM fluxer_threads.ft_thread WHERE state = 'active' AND deleted = false`);
	for (const row of rows) await sweepChannel(String(row.channel_id));
}
