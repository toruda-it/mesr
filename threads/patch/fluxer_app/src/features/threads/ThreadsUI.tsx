import React, {useEffect, useMemo, useState} from 'react';
import styles from '@app/features/threads/Threads.module.css';

type ApiThread = {
	id: string;
	parent_id: string;
	name: string;
	owner_id: string;
	member_count: number;
	last_message_preview?: string | null;
	last_message_sender_username?: string | null;
	thread_metadata: {archived: boolean; locked: boolean; state: string; create_timestamp: number; archive_timestamp?: number | null};
	private: boolean;
};

async function readThreads(channelId: string, path: string): Promise<Array<ApiThread>> {
	const response = await fetch(`/api/channels/${channelId}/threads/${path}`, {credentials: 'include'});
	if (!response.ok) return [];
	const body = (await response.json()) as {threads?: Array<ApiThread>};
	return body.threads ?? [];
}

export function ThreadSidebarRows({channelId, selectedId, onOpen}: {channelId: string; selectedId?: string | null; onOpen: (thread: ApiThread) => void}) {
	const [threads, setThreads] = useState<Array<ApiThread>>([]);
	useEffect(() => {
		readThreads(channelId, 'active').then(setThreads).catch(() => setThreads([]));
	}, [channelId]);
	if (threads.length === 0) return null;
	return (
		<div className={styles.tree}>
			{threads.map((thread) => (
				<div
					key={thread.id}
					className={selectedId === thread.id ? `${styles.treeRow} ${styles.treeRowActive}` : styles.treeRow}
					onClick={() => onOpen(thread)}
					onContextMenu={(event) => {
						event.preventDefault();
						window.dispatchEvent(new CustomEvent('ft-thread-menu', {detail: {thread, x: event.clientX, y: event.clientY}}));
					}}
				>
					<span aria-hidden="true">☰</span>
					<span>{thread.name}</span>
				</div>
			))}
		</div>
	);
}

export function ThreadsHeaderButton({channelId, onCreate}: {channelId: string; onCreate: () => void}) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<button type="button" className={styles.create} aria-label="Ветки" onClick={() => setOpen(true)}>
				Ветки
			</button>
			{open ? <ThreadsPanel channelId={channelId} onClose={() => setOpen(false)} onCreate={onCreate} /> : null}
		</>
	);
}

export function ThreadsPanel({channelId, onClose, onCreate}: {channelId: string; onClose: () => void; onCreate: () => void}) {
	const [query, setQuery] = useState('');
	const [active, setActive] = useState<Array<ApiThread>>([]);
	const [archived, setArchived] = useState<Array<ApiThread>>([]);
	useEffect(() => {
		readThreads(channelId, 'active').then(setActive);
		readThreads(channelId, 'archived/public').then(setArchived);
	}, [channelId]);
	const match = (thread: ApiThread) => thread.name.toLowerCase().includes(query.trim().toLowerCase());
	const joined = useMemo(() => active.filter(match), [active, query]);
	const old = useMemo(() => archived.filter(match), [archived, query]);
	return (
		<div className={styles.backdrop} onClick={onClose}>
			<div className={styles.sheet} onClick={(event) => event.stopPropagation()}>
				<div className={styles.header}>
					<div className={styles.title}>☰ Ветки</div>
					<input className={styles.search} placeholder="Поиск по названию ветки" value={query} onChange={(event) => setQuery(event.target.value)} />
					<button type="button" className={styles.create} onClick={onCreate}>Создать</button>
				</div>
				{joined.length === 0 && old.length === 0 ? (
					<div className={styles.empty}>
						<div className={styles.emptyIcon}>☰</div>
						<strong>Нет веток.</strong>
						<p>Не отвлекайтесь от беседы с помощью веток — временных текстовых каналов.</p>
						<button type="button" className={styles.create} onClick={onCreate}>Создать ветку</button>
					</div>
				) : (
					<>
						<div className={styles.section}>УЧАСТИЕ В ВЕТКАХ: {joined.length}</div>
						{joined.map((thread) => (
							<div key={thread.id} className={styles.card}>
								<div>
									<strong>{thread.name}</strong>
									<div className={styles.meta}>{thread.last_message_preview || 'Нет недавних сообщений'}</div>
								</div>
								<div className={styles.avatars}>
									{Array.from({length: Math.min(thread.member_count, 3)}).map((_, index) => (
										<span key={index} className={styles.avatar} />
									))}
								</div>
							</div>
						))}
						<div className={styles.section}>СТАРЫЕ ВЕТКИ</div>
						{old.map((thread) => (
							<div key={thread.id} className={`${styles.card} ${styles.muted}`}>
								<div>
									<strong>{thread.name}</strong>
									<div className={styles.meta}>Последняя активность: {thread.thread_metadata.archive_timestamp ? new Date(thread.thread_metadata.archive_timestamp).toLocaleDateString() : '—'}</div>
								</div>
							</div>
						))}
					</>
				)}
			</div>
		</div>
	);
}

export function NewThreadPanel({channelId, onClose}: {channelId: string; onClose: () => void}) {
	const [name, setName] = useState('');
	const [isPrivate, setPrivate] = useState(false);
	const [message, setMessage] = useState('');
	async function submit() {
		await fetch(`/api/channels/${channelId}/threads`, {
			method: 'POST',
			credentials: 'include',
			headers: {'content-type': 'application/json'},
			body: JSON.stringify({name: name || 'Новая ветка', private: isPrivate, message, auto_archive_duration: 10080}),
		});
		onClose();
	}
	return (
		<aside className={styles.drawer}>
			<div className={styles.header}>
				<div className={styles.title}>☰ Новая ветка</div>
				<button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">×</button>
			</div>
			<label className={styles.field}>
				Название ветки
				<input className={styles.input} placeholder="Новая ветка" value={name} onChange={(event) => setName(event.target.value)} />
			</label>
			<label className={styles.field}>
				<span><input type="checkbox" checked={isPrivate} onChange={(event) => setPrivate(event.target.checked)} /> Приватная ветка</span>
				<span className={styles.hint}>Ветка видна только приглашённым пользователям и модераторам</span>
			</label>
			<label className={styles.field + ' ' + styles.composer}>
				Введите сообщение, чтобы начать беседу!
				<textarea className={styles.input} value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => {
					if (event.key === 'Enter' && !event.shiftKey) {
						event.preventDefault();
						submit().catch(() => undefined);
					}
				}} />
			</label>
		</aside>
	);
}

export function ThreadMenus() {
	const [menu, setMenu] = useState<{thread: ApiThread; x: number; y: number} | null>(null);
	const [settings, setSettings] = useState<ApiThread | null>(null);
	useEffect(() => {
		const onMenu = (event: Event) => setMenu((event as CustomEvent).detail);
		window.addEventListener('ft-thread-menu', onMenu);
		return () => window.removeEventListener('ft-thread-menu', onMenu);
	}, []);
	return (
		<>
			{menu ? (
				<div className={styles.menu} style={{left: menu.x, top: menu.y}} onMouseLeave={() => setMenu(null)}>
					<button type="button">Пометить как прочитанное</button>
					<button type="button" onClick={() => fetch(`/api/channels/${menu.thread.id}/thread-members/@me`, {method: 'DELETE', credentials: 'include'})}>Покинуть ветку</button>
					<button type="button" onClick={() => fetch(`/api/channels/${menu.thread.id}`, {method: 'PATCH', credentials: 'include', headers: {'content-type': 'application/json'}, body: JSON.stringify({archived: true})})}>Закрыть ветку</button>
					<button type="button" onClick={() => { setSettings(menu.thread); setMenu(null); }}>Редактировать ветку</button>
					<button type="button" onClick={() => navigator.clipboard.writeText(`${location.origin}/channels/${menu.thread.parent_id}/${menu.thread.id}`)}>Копировать ссылку</button>
					<button type="button">Заглушить ветку</button>
					<button type="button">Параметры уведомлений</button>
					<button type="button" onClick={() => navigator.clipboard.writeText(menu.thread.id)}>Копировать ID ветки</button>
				</div>
			) : null}
			{settings ? <ThreadSettings thread={settings} onClose={() => setSettings(null)} /> : null}
		</>
	);
}

function ThreadSettings({thread, onClose}: {thread: ApiThread; onClose: () => void}) {
	const [name, setName] = useState(thread.name);
	const [slowmode, setSlowmode] = useState('0');
	const [hideAfter, setHideAfter] = useState('10080');
	const [spoilers, setSpoilers] = useState(false);
	return (
		<div className={styles.settings}>
			<button type="button" className={styles.close} onClick={onClose}>×</button>
			<h2>Обзор</h2>
			<label className={styles.field}>
				Название ветки
				<input className={styles.input} value={name} onChange={(event) => setName(event.target.value)} onBlur={() => fetch(`/api/channels/${thread.id}`, {method: 'PATCH', credentials: 'include', headers: {'content-type': 'application/json'}, body: JSON.stringify({name})})} />
			</label>
			<label className={styles.field}>
				Медленный режим
				<select className={styles.input} value={slowmode} onChange={(event) => setSlowmode(event.target.value)}>
					<option value="0">Выкл</option>
					<option value="5">5 секунд</option>
					<option value="30">30 секунд</option>
				</select>
				<span className={styles.hint}>Участники не смогут отправлять больше одного сообщения в течение этого периода времени, кроме случаев, когда у них есть право обходить медленный режим.</span>
			</label>
			<label className={styles.field}>
				Скрыть после неактивности
				<select className={styles.input} value={hideAfter} onChange={(event) => {
					setHideAfter(event.target.value);
					fetch(`/api/channels/${thread.id}`, {method: 'PATCH', credentials: 'include', headers: {'content-type': 'application/json'}, body: JSON.stringify({auto_archive_duration: Number(event.target.value)})});
				}}>
					<option value="60">1 час</option>
					<option value="1440">24 часа</option>
					<option value="4320">3 дня</option>
					<option value="10080">1 неделя</option>
				</select>
				<span className={styles.hint}>Ветки перестанут отображаться в списке каналов после заданного периода неактивности.</span>
			</label>
			<label className={styles.field}>
				Канал со спойлерами
				<input type="checkbox" checked={spoilers} onChange={(event) => setSpoilers(event.target.checked)} />
				<span className={styles.hint}>Пометьте этот канал как содержащий спойлеры, чтобы сюжетные повороты, а также темы и обсуждения чувствительного характера были скрыты, пока пользователи не захотят их посмотреть.</span>
			</label>
		</div>
	);
}
