import type {HonoApp} from '@app/api/types/HonoEnv';

type LoginMiddleware = (ctx: any, next: () => Promise<void>) => Promise<unknown>;
import {ThreadPermissions, type ChannelPermissions} from './permissions';
import {
	archiveStored,
	closeStored,
	createStoredThread,
	deleteStored,
	getThreadRow,
	getThreadByFluxerChannel,
	hiddenByInactivity,
	noteFluxerChannelMessage,
	joinStored,
	leaveStored,
	listChannelThreads,
	addThreadMessage,
	listGuildThreads,
	setFluxerChannel,
	setSpoiler,
	listThreadMessages,
	listMembers,
	recordEvent,
	renameStored,
	reopenStored,
	toApiThread,
	unarchiveStored,
	sweepAll,
} from './ThreadStore';

export {sweepAll};

const createBuckets = new Map<string, Array<number>>();

function perms(manage: boolean): ChannelPermissions {
	return {
		canViewChannel: true,
		canSendMessages: true,
		canCreateThreads: true,
		canManageThreads: manage,
		isModerator: manage,
	};
}

function userOf(ctx: {get: (key: 'user') => {id: string; username?: string; global_name?: string}}) {
	const user = ctx.get('user');
	return {id: String(user.id), username: user.username || user.global_name || 'user'};
}

function limited(userId: string): boolean {
	const now = Date.now();
	const hits = (createBuckets.get(userId) ?? []).filter((stamp) => now - stamp < 10_000);
	if (hits.length >= 5) return true;
	hits.push(now);
	createBuckets.set(userId, hits);
	return false;
}

function mentionIds(content: string): Array<string> {
	return [...new Set([...content.matchAll(/<@!?(\d{5,})>/g)].map((match) => match[1]))];
}

async function inviteMentioned(row: Record<string, unknown>, actorId: string, content: string): Promise<void> {
	const allowed = ThreadPermissions.canManageThread(perms(false), String(row.creator_id), actorId) || row.invitable !== false;
	if (!allowed || row.state === 'deleted') return;
	for (const userId of mentionIds(content)) {
		if (userId === actorId) continue;
		await joinStored(String(row.thread_id), userId);
	}
}

async function peekText(ctx: {req: {text: () => Promise<string>}}): Promise<string> {
	try {
		return await ctx.req.text();
	} catch {
		return '';
	}
}

async function bodyOf(ctx: {req: {json: () => Promise<unknown>}}): Promise<Record<string, unknown>> {
	try {
		const value = await ctx.req.json();
		return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
	} catch {
		return {};
	}
}

async function storeStarter(row: Record<string, unknown>, user: {id: string; username: string}, message: unknown) {
	if (typeof message !== 'string' || !message.trim()) return row;
	const content = message.trim();
	await addThreadMessage({
		threadId: String(row.thread_id),
		authorId: user.id,
		authorUsername: user.username,
		content,
	});
	await recordEvent('THREAD_MESSAGE', {id: row.thread_id, content, actor_id: user.id, guild_id: row.guild_id});
	return (await getThreadRow(String(row.thread_id))) ?? row;
}

export function mount(app: HonoApp, loginRequired: LoginMiddleware) {
	ThreadController(app, loginRequired);
}

export function ThreadController(app: HonoApp, loginRequired: LoginMiddleware) {
	app.post('/channels/:channel_id/messages/:message_id/threads', loginRequired, async (ctx) => {
		const user = userOf(ctx);
		if (!ThreadPermissions.canCreateThread(perms(false))) return ctx.json({code: 'MISSING_PERMISSIONS'}, 403);
		if (limited(user.id)) return ctx.json({code: 'RATE_LIMITED'}, 429);
		const body = await bodyOf(ctx);
		const row = await createStoredThread({
			channelId: ctx.req.param('channel_id'),
			guildId: typeof body.guild_id === 'string' ? body.guild_id : null,
			parentMessageId: ctx.req.param('message_id'),
			name: String(body.name || 'Новая ветка'),
			creatorId: user.id,
			creatorUsername: user.username,
			autoArchiveDurationMinutes: Number(body.auto_archive_duration || 10080),
			isPrivate: Boolean(body.private),
			fluxerChannelId: typeof body.fluxer_channel_id === 'string' ? body.fluxer_channel_id : null,
		});
		const stored = await storeStarter(row, user, body.message);
		return ctx.json(toApiThread(stored), 201);
	});

	app.post('/channels/:channel_id/threads', loginRequired, async (ctx) => {
		const user = userOf(ctx);
		if (!ThreadPermissions.canCreateThread(perms(false))) return ctx.json({code: 'MISSING_PERMISSIONS'}, 403);
		if (limited(user.id)) return ctx.json({code: 'RATE_LIMITED'}, 429);
		const body = await bodyOf(ctx);
		const row = await createStoredThread({
			channelId: ctx.req.param('channel_id'),
			guildId: typeof body.guild_id === 'string' ? body.guild_id : null,
			name: String(body.name || 'Новая ветка'),
			creatorId: user.id,
			creatorUsername: user.username,
			autoArchiveDurationMinutes: Number(body.auto_archive_duration || 10080),
			isPrivate: Boolean(body.private),
			kind: typeof body.kind === 'string' ? body.kind : undefined,
			fluxerChannelId: typeof body.fluxer_channel_id === 'string' ? body.fluxer_channel_id : null,
		});
		const stored = await storeStarter(row, user, body.message);
		return ctx.json(toApiThread(stored), 201);
	});

	app.get('/channels/:channel_id/threads/active', loginRequired, async (ctx) => {
		const rows = await listChannelThreads(ctx.req.param('channel_id'), 'active', userOf(ctx).id);
		return ctx.json({threads: rows.map(toApiThread)});
	});

	app.get('/channels/:channel_id/threads/archived/public', loginRequired, async (ctx) => {
		const rows = (await listChannelThreads(ctx.req.param('channel_id'), 'archived', userOf(ctx).id)).filter((row) => !row.is_private && row.joined);
		return ctx.json({threads: rows.map(toApiThread)});
	});

	app.get('/channels/:channel_id/threads/archived/private', loginRequired, async (ctx) => {
		const user = userOf(ctx);
		const rows = (await listChannelThreads(ctx.req.param('channel_id'), 'archived', userOf(ctx).id)).filter((row) => row.is_private);
		const visible = [];
		for (const row of rows) {
			const members = await listMembers(String(row.thread_id));
			if (members.some((member) => member.user_id === user.id) || row.creator_id === user.id) visible.push(row);
		}
		return ctx.json({threads: visible.map(toApiThread)});
	});

	app.get('/guilds/:guild_id/threads/active', loginRequired, async (ctx) => {
		const rows = await listGuildThreads(ctx.req.param('guild_id'), userOf(ctx).id);
		return ctx.json({threads: rows.map(toApiThread)});
	});

	app.get('/channels/:thread_id/messages', loginRequired, async (ctx, next) => {
		const row = await getThreadRow(ctx.req.param('thread_id'));
		if (!row) return next();
		const messages = await listThreadMessages(row.thread_id);
		return ctx.json(messages);
	});

	app.get('/channels/:thread_id/thread-members', loginRequired, async (ctx) => {
		const members = await listMembers(ctx.req.param('thread_id'));
		return ctx.json(members);
	});

	app.put('/channels/:thread_id/thread-members/@me', loginRequired, async (ctx) => {
		const user = userOf(ctx);
		const row = await joinStored(ctx.req.param('thread_id'), user.id);
		if (!row) return ctx.json({code: 'UNKNOWN_THREAD'}, 404);
		return ctx.json(toApiThread(row));
	});

	app.delete('/channels/:thread_id/thread-members/@me', loginRequired, async (ctx) => {
		const user = userOf(ctx);
		const row = await getThreadRow(ctx.req.param('thread_id'));
		if (!row || row.deleted || row.state === 'deleted') return ctx.json({code: 'UNKNOWN_THREAD'}, 404);
		await leaveStored(ctx.req.param('thread_id'), user.id);
		const members = await listMembers(ctx.req.param('thread_id'));
		if (members.length === 0) {
			await deleteStored(ctx.req.param('thread_id'), user.id);
			return ctx.json({deleted: true, fluxer_channel_id: row.fluxer_channel_id || null});
		}
		return ctx.json({deleted: false, fluxer_channel_id: row.fluxer_channel_id || null});
	});

	app.put('/channels/:thread_id/thread-members/:user_id', loginRequired, async (ctx) => {
		const actor = userOf(ctx);
		const row = await getThreadRow(ctx.req.param('thread_id'));
		if (!row) return ctx.json({code: 'UNKNOWN_THREAD'}, 404);
		const manage = ThreadPermissions.canManageThread(perms(false), String(row.creator_id), actor.id) || row.invitable;
		if (!manage) return ctx.json({code: 'MISSING_PERMISSIONS'}, 403);
		const updated = await joinStored(ctx.req.param('thread_id'), ctx.req.param('user_id'));
		return ctx.json(updated ? toApiThread(updated) : {});
	});

	app.delete('/channels/:thread_id/thread-members/:user_id', loginRequired, async (ctx) => {
		const actor = userOf(ctx);
		const row = await getThreadRow(ctx.req.param('thread_id'));
		if (!row) return ctx.json({code: 'UNKNOWN_THREAD'}, 404);
		if (!ThreadPermissions.canManageThread(perms(false), String(row.creator_id), actor.id)) {
			return ctx.json({code: 'MISSING_PERMISSIONS'}, 403);
		}
		await leaveStored(ctx.req.param('thread_id'), ctx.req.param('user_id'));
		return ctx.body(null, 204);
	});

	app.patch('/channels/:thread_id', loginRequired, async (ctx, next) => {
		const actor = userOf(ctx);
		const current = await getThreadRow(ctx.req.param('thread_id'));
		if (!current) return next();
		const body = await bodyOf(ctx);
		if (typeof body.fluxer_channel_id === 'string' && body.fluxer_channel_id && body.name == null && body.spoiler == null) {
			const linked = await setFluxerChannel(current.thread_id, body.fluxer_channel_id);
			return ctx.json(linked ? toApiThread(linked) : {});
		}
		if (typeof body.spoiler === 'boolean') await setSpoiler(current.thread_id, body.spoiler);
		const manage = ThreadPermissions.canManageThread(perms(Boolean(body.manage)), String(current.creator_id), actor.id);
		if (body.archived === true && body.locked === true) {
			if (!manage) return ctx.json({code: 'MISSING_PERMISSIONS'}, 403);
			const row = await archiveStored(ctx.req.param('thread_id'), actor.id);
			return ctx.json(row ? toApiThread(row) : {});
		}
		if (body.archived === true) {
			const row = await closeStored(ctx.req.param('thread_id'), actor.id);
			return ctx.json(row ? toApiThread(row) : {});
		}
		if (body.archived === false && current.state === 'archived' && !manage) return ctx.json({code: 'MISSING_PERMISSIONS'}, 403);
		if (body.archived === false && current.state === 'archived') {
			const row = await unarchiveStored(ctx.req.param('thread_id'), actor.id);
			return ctx.json(row ? toApiThread(row) : {});
		}
		if (body.archived === false) {
			const row = await reopenStored(ctx.req.param('thread_id'), actor.id);
			return ctx.json(row ? toApiThread(row) : {});
		}
		const row = await renameStored(ctx.req.param('thread_id'), String(body.name || current.name), actor.id, {
			slowmode: body.rate_limit_per_user == null ? null : Number(body.rate_limit_per_user),
			autoArchive: body.auto_archive_duration == null ? null : Number(body.auto_archive_duration),
			invitable: typeof body.invitable === 'boolean' ? body.invitable : null,
		});
		return ctx.json(row ? toApiThread(row) : {});
	});

	app.delete('/channels/:thread_id', loginRequired, async (ctx, next) => {
		const actor = userOf(ctx);
		const current = await getThreadRow(ctx.req.param('thread_id'));
		if (!current) return next();
		if (!ThreadPermissions.canManageThread(perms(false), String(current.creator_id), actor.id)) {
			return ctx.json({code: 'MISSING_PERMISSIONS'}, 403);
		}
		await deleteStored(ctx.req.param('thread_id'), actor.id);
		return ctx.body(null, 204);
	});

	app.post('/channels/:thread_id/messages', loginRequired, async (ctx, next) => {
		const actor = userOf(ctx);
		const param = ctx.req.param('thread_id');
		let current = await getThreadRow(param);
		if (!current) {
			const linked = await getThreadByFluxerChannel(param);
			if (linked) {
				const peeked = await peekText(ctx);
				await noteFluxerChannelMessage(param, actor).catch(() => undefined);
				await inviteMentioned(linked, actor.id, peeked).catch(() => undefined);
			}
			return next();
		}
		if (current.state === 'archived' && hiddenByInactivity(current)) {
			current = (await unarchiveStored(param, actor.id)) ?? current;
		}
		if (!ThreadPermissions.canSendInThread(perms(false), String(current.state))) {
			return ctx.json({code: 'MISSING_PERMISSIONS'}, 403);
		}
		if (current.state === 'closed') await reopenStored(param, actor.id);
		const body = await bodyOf(ctx);
		await joinStored(ctx.req.param('thread_id'), actor.id);
		await inviteMentioned(current, actor.id, String(body.content ?? '')).catch(() => undefined);
		const message = await addThreadMessage({
			threadId: current.thread_id,
			authorId: actor.id,
			authorUsername: actor.username,
			content: String(body.content ?? ''),
		});
		await recordEvent('THREAD_MESSAGE', {id: current.thread_id, content: body.content, actor_id: actor.id, guild_id: current.guild_id});
		return ctx.json(message, 201);
	});

	app.post('/webhooks/:webhook_id/:token', async (ctx, next) => {
		const threadId = String(ctx.req.query('thread_id') || '');
		if (!threadId) return next();
		const body = await bodyOf(ctx);
		const row = await getThreadRow(threadId);
		if (!row) return ctx.json({code: 'UNKNOWN_THREAD'}, 404);
		if (row.state === 'active' || hiddenByInactivity(row)) {
			if (row.fluxer_channel_id) await noteFluxerChannelMessage(String(row.fluxer_channel_id), {id: String(ctx.req.param('webhook_id')), username: 'webhook'}).catch(() => undefined);
		}
		await inviteMentioned(row, String(ctx.req.param('webhook_id')), String(body.content ?? '')).catch(() => undefined);
		await recordEvent('THREAD_MESSAGE', {id: threadId, webhook_id: ctx.req.param('webhook_id'), content: body.content});
		return ctx.json({id: threadId}, 200);
	});
}
