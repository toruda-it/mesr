;globalThis.ftThreads = globalThis.ftThreads || (function () {
	const state = {threads: [], channelId: null, query: '', openThread: null, messageCache: null};
	const spool = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><path fill="currentColor" d="M12 2.81a1 1 0 0 1 0-1.41l.36-.36a1 1 0 0 1 1.41 0l9.2 9.2a1 1 0 0 1 0 1.4l-.7.7a1 1 0 0 1-1.3.13l-9.54-6.72a1 1 0 0 1-.08-1.58l1-1L12 2.8ZM12 21.2a1 1 0 0 1 0 1.41l-.35.35a1 1 0 0 1-1.41 0l-9.2-9.19a1 1 0 0 1 0-1.41l.7-.7a1 1 0 0 1 1.3-.12l9.54 6.72a1 1 0 0 1 .07 1.58l-1 1 .35.36ZM15.66 16.8a1 1 0 0 1-1.38.28l-8.49-5.66A1 1 0 1 1 6.9 9.76l8.49 5.65a1 1 0 0 1 .27 1.39ZM17.1 14.25a1 1 0 1 0 1.11-1.66L9.73 6.93a1 1 0 0 0-1.11 1.66l8.49 5.66Z"/></svg>';
	const style = document.createElement('style');
	style.textContent = [
		'.ft-card{margin:4px 0 8px 72px;padding:8px 10px;border:1px solid var(--brand-primary,#5865f2);border-radius:8px;background:var(--background-secondary,#2b2d31);color:var(--text-normal,#f2f3f5);display:flex;gap:8px;align-items:center;position:relative;cursor:pointer}',
		'.ft-card:before{content:"";position:absolute;left:-28px;top:-18px;height:28px;width:20px;border-left:2px solid var(--brand-primary,#5865f2);border-bottom:2px solid var(--brand-primary,#5865f2);border-radius:0 0 0 8px}',
		'.ft-card strong{display:block}.ft-muted{opacity:.65;font-size:12px}',
		'.ft-tree{margin-left:16px}',
		'.ft-side{position:relative;display:flex;align-items:center;min-height:32px;padding:1px 8px 1px 16px;color:var(--channels-default,#949ba4);font-size:16px;cursor:pointer;border-radius:4px}',
		'.ft-side:before{content:"";position:absolute;left:-2px;top:0;bottom:0;width:14px;border-left:2px solid var(--background-modifier-accent,#4e5058)}',
		'.ft-side:not(:last-child):after{content:"";position:absolute;left:-2px;top:50%;width:12px;border-top:2px solid var(--background-modifier-accent,#4e5058)}',
		'.ft-side:last-child:before{bottom:50%;border-bottom:2px solid var(--background-modifier-accent,#4e5058);border-bottom-left-radius:10px}',
		'.ft-side.ft-on{background:var(--background-modifier-selected,#404249);color:var(--interactive-active,#f2f3f5)}',
		':where(html.window-focused,html.unfocused-fully-interactive):not(.window-focus-activation-guard) .ft-side:hover:not(.ft-on){background-color:var(--background-modifier-hover);color:var(--text-chat)}',
		'.ft-spool{display:inline-flex;width:32px;height:32px;align-items:center;justify-content:center;border:0;background:transparent;color:var(--interactive-normal,#b5bac1);cursor:pointer;border-radius:4px}',
		'.ft-spool:hover{color:var(--interactive-hover,#dbdee1);background:var(--background-modifier-hover,rgba(255,255,255,.05))}',
		'.ft-panel{position:fixed;top:48px;right:0;bottom:0;width:min(420px,100vw);z-index:40;background:var(--background-primary,#313338);color:var(--text-normal,#f2f3f5);box-shadow:-8px 0 24px rgba(0,0,0,.35);display:flex;flex-direction:column}',
		'.ft-panel header,.ft-col header{display:flex;align-items:center;gap:8px;padding:12px}',
		'.ft-panel h2,.ft-col h2{margin:0;font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px}',
		'.ft-search{width:100%;box-sizing:border-box;flex:0 0 auto;background:var(--background-tertiary,#1e1f22);border:0;border-radius:4px;color:inherit;padding:8px}',
		'.ft-primary{background:var(--brand-primary,#5865f2);color:#fff;border:0;border-radius:4px;padding:8px 14px;cursor:pointer;font-weight:600}',
		'.ft-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;gap:8px}',
		'.ft-section{padding:12px 16px 8px;font-size:12px;font-weight:700;letter-spacing:.02em;color:var(--header-secondary,#b5bac1)}',
		'.ft-thread-card{display:flex;align-items:center;gap:12px;margin:0 12px 8px;padding:12px 14px;border:1px solid var(--background-modifier-accent,rgba(255,255,255,.08));border-radius:8px;background:var(--background-secondary,#2b2d31);cursor:pointer}',
		'.ft-thread-card:hover{background:var(--background-modifier-hover,#35373c)}',
		'.ft-thread-card strong{display:block;font-size:16px;font-weight:600;color:var(--text-normal,#f2f3f5)}',
		'.ft-thread-meta{display:flex;align-items:center;gap:6px;margin-top:4px;color:var(--text-muted,#949ba4);font-size:13px;min-width:0}',
		'.ft-thread-meta span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
		'.ft-dot{width:8px;height:8px;border-radius:50%;background:#23a559;flex:0 0 auto}',
		'.ft-faces{display:flex;margin-left:auto;flex:0 0 auto}',
		'.ft-faces img{width:28px;height:28px;border-radius:50%;object-fit:cover;background:#1e1f22;border:2px solid #2b2d31;margin-left:-8px;display:block}',
		'.ft-faces img:first-child{margin-left:0}',
		'.ft-panel-bar{display:flex;align-items:center;gap:12px;padding:16px 16px 8px}',
		'.ft-panel-bar h1{margin:0;display:flex;align-items:center;gap:8px;font-size:20px;white-space:nowrap}',
		'.ft-panel-bar .ft-search{flex:1;height:40px;margin:0;border:1px solid transparent}',
		'.ft-panel-bar .ft-search:focus{outline:none;border-color:var(--brand-primary,#5865f2)}',
		'.ft-panel-bar .ft-primary{height:40px;padding:0 16px;flex:0 0 auto}',
		'.ft-row{display:flex;gap:8px;padding:8px;border-radius:8px;cursor:pointer}',
		'.ft-row:hover{background:var(--background-modifier-hover,rgba(255,255,255,.04))}',
		'.ft-row strong{display:block}.ft-old{opacity:.7}',
		'.ft-col{position:fixed;z-index:30;width:320px;background:var(--background-secondary,#2b2d31);color:var(--text-normal,#f2f3f5);display:flex;flex-direction:column;border-left:1px solid var(--background-modifier-accent,#3f4147)}',
		'.ft-col input[type=text],.ft-sheet input,.ft-sheet select{width:100%;box-sizing:border-box;margin-top:6px;padding:10px;border:0;border-radius:4px;background:var(--background-tertiary,#1e1f22);color:inherit}',
		'.ft-col .ft-body{padding:0 16px;flex:1}',
		'.ft-hint{font-size:12px;color:var(--text-muted,#949ba4);margin:6px 0 0}',
		'.ft-check{display:flex;gap:8px;align-items:flex-start;margin-top:16px}',
		'.ft-composer{margin:12px;padding:12px;border-radius:8px;background:var(--background-secondary,#2b2d31)}',
		'.ft-composer input{width:100%;border:0;background:transparent;color:inherit;outline:none}',
		'.ft-x{margin-left:auto;border:0;background:transparent;color:inherit;cursor:pointer;font-size:18px}',
		'.ft-menu{position:fixed;z-index:60;min-width:220px;padding:6px;background:var(--background-floating,#111214);border-radius:4px;box-shadow:0 8px 16px rgba(0,0,0,.4)}',
		'.ft-menu button{display:flex;align-items:center;gap:8px;width:100%;text-align:left;border:0;background:transparent;color:var(--text-normal,#f2f3f5);padding:8px;border-radius:2px;cursor:pointer}',
		'.ft-menu button:hover,.ft-sub-item:hover > button{background:var(--brand-primary,#5865f2);color:#fff}',
		'.ft-sub-item{position:relative}',
		'.ft-sub{display:none;position:absolute;left:calc(100% - 4px);top:-6px;min-width:220px;padding:6px;z-index:61}',
		'.ft-sub-item:hover > .ft-sub,.ft-sub:hover{display:block}',
		'.ft-caret{margin-left:auto;opacity:.8}',
		'.ft-radio{width:18px;height:18px;margin-left:auto;border:2px solid #80848e;border-radius:50%;box-sizing:border-box;flex:0 0 auto}',
		'.ft-radio.on{border-color:#5865f2;background:radial-gradient(circle,#5865f2 0 5px,transparent 6px)}',
		'#ft-menu{overflow:visible!important}',
		'html.ft-switching [data-flx^="channel.messages.scroll-filler-skeleton"]{display:none!important}',
		'html[data-ft-members] [data-ft-hide]{display:none!important}',
		'html.ft-driving [class*="contextMenu" i]:not(#ft-menu):not(.ft-sub),html.ft-driving [class*="modal" i],html.ft-driving [class*="backdrop" i]:not(#ft-menu-back),html.ft-driving [role="dialog"]{opacity:0!important;visibility:hidden!important;pointer-events:none!important;animation:none!important;transition:none!important}',
		'.ft-modal{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:70;display:flex;align-items:center;justify-content:center}',
		'.ft-sheet{width:min(480px,calc(100vw - 24px));background:var(--background-primary,#313338);color:inherit;border-radius:8px;padding:16px}',
		'.ft-sheet h2{margin:0 0 12px}.ft-preview{margin-top:12px;padding:8px;border-radius:4px;background:var(--background-secondary,#2b2d31)}',
		'.ft-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}',
		'#ft-log{position:absolute;inset:0;overflow:auto;background:var(--background-primary);z-index:2}',
		'html[data-ft-open] [data-flx^="channel.channel-header.channel-name"]{cursor:pointer}',
		'html[data-ft-open] [data-flx="channel.channel-header.header-wrapper"] [data-flx="channel.channel-utils.get-icon.text-channel-icon"]{display:none!important}',
		'html[data-ft-open] [data-flx$="message-action-bar-button.thread"]{display:none!important}',
		'#ft-hash{display:inline-flex;align-items:center;margin-right:6px;color:var(--text-muted,#949ba4)}',
		'#ft-panel .ft-scroll{flex:1;min-height:0;overflow:auto}',
		'#ft-panel .ft-search{margin:0 16px 8px}',
		'#ft-panel [data-create]{margin-left:auto}',
		'.ft-settings{position:fixed;inset:0;z-index:1100;display:flex;align-items:center;justify-content:center}',
		'.ft-settings-window{position:relative;z-index:1;width:min(60rem,calc(100vw - 3rem));height:min(52rem,calc(100vh - 2rem));display:flex}',
		'.ft-settings .SettingsModalLayout\\.module__container___SkNUdm{width:100%;height:100%}',
		'.ft-settings form{display:flex;flex-direction:column;min-width:0;flex:1;height:100%}',
		'.ft-settings .SettingsModalLayout\\.module__desktopScroll___SkNUdm{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column}',
		'.ft-settings-fields{display:flex;flex-direction:column;gap:16px;padding:16px 24px 24px;flex:1}',
		'.ft-settings-fields label:not(.ft-switch){display:flex;flex-direction:column;gap:8px;font-size:12px;font-weight:700;color:var(--header-secondary,#b5bac1)}',
		'.ft-settings-fields input:not([type=checkbox]),.ft-settings-fields select{height:40px;padding:0 12px;border:0;border-radius:4px;background:var(--background-tertiary,#1e1f22);color:var(--text-normal,#f2f3f5);font-size:16px;font-weight:400}',
		'.ft-settings-name{display:flex;align-items:center;gap:8px;min-width:0}',
		'.ft-settings-name svg{flex:0 0 auto}',
		'.ft-settings-name span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
		'.ft-settings-close{display:flex;flex-direction:column;align-items:center;gap:2px;border:0;background:transparent;color:var(--interactive-normal,#b5bac1);cursor:pointer}',
		'.ft-settings-close b{display:flex;width:36px;height:36px;align-items:center;justify-content:center;border:2px solid currentColor;border-radius:50%;font-size:18px;font-weight:400}',
		'.ft-settings-close span{font-size:11px;font-weight:700;letter-spacing:.04em}',
		'.ft-switch-row{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}',
		'.ft-switch-row strong{font-size:16px;color:var(--text-normal,#f2f3f5)}',
		'.ft-switch{position:relative;display:block;width:40px;height:24px;flex:0 0 auto;margin-top:2px;cursor:pointer}',
		'.ft-switch input{position:absolute;inset:0;width:40px;height:24px;margin:0;opacity:0;cursor:pointer}',
		'.ft-switch span{display:block;width:40px;height:24px;border-radius:999px;background:#4e5058;position:relative}',
		'.ft-switch span:before{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff}',
		'.ft-switch input:checked + span{background:#23a559}',
		'.ft-switch input:checked + span:before{left:19px}',
		'.ft-art{display:flex;justify-content:flex-end;margin-top:auto;opacity:.85}',
		'.ft-spoiler{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.75)}',
		'.ft-spoiler-card{width:min(440px,calc(100vw - 32px));padding:24px;border-radius:8px;background:var(--background-primary,#313338);color:var(--text-normal,#f2f3f5)}',
		'.ft-spoiler-card h2{margin:0 0 8px;font-size:20px}',
		'.ft-spoiler-card p{margin:0 0 20px;color:var(--text-muted,#b5bac1)}',
		'.ft-spoiler-card div{display:flex;justify-content:flex-end;gap:8px}',
		'.ft-ghost{border:0;background:transparent;color:inherit;padding:8px 16px;cursor:pointer;font-weight:600}',
	].join('');
	document.documentElement.appendChild(style);

	function token() {
		const store = globalThis.__ftStorage;
		if (!store) return null;
		const value = store.getItem('token');
		if (!value || value === 'null' || value === 'undefined') return null;
		return value.replace(/^"|"$/g, '');
	}
	function guildId() {
		const match = location.pathname.match(/^\/channels\/([^/]+)/);
		return match ? match[1] : '@me';
	}
	function pathIds() {
		const match = location.pathname.match(/^\/channels\/([^/]+)\/(\d+)(?:\/(\d+))?/);
		return match ? {guild: match[1], channel: match[2], thread: match[3] || null} : {guild: guildId(), channel: null, thread: null};
	}
	function channelFromPath() {
		return pathIds().channel;
	}
	function currentThread() {
		const channelId = pathIds().channel;
		return state.threads.find(function (thread) {
			return thread.fluxer_channel_id && String(thread.fluxer_channel_id) === String(channelId);
		}) || null;
	}
	function channelClickTarget(channelId) {
		const row = document.querySelector('[data-scroll-id="channel-' + channelId + '"]');
		return row && (row.closest('[data-flx="app.generic-channel-item.long-pressable.click"]') || row);
	}
	function preloadChannel(channelId) {
		const target = channelClickTarget(channelId);
		if (!target) return;
		target.dispatchEvent(new MouseEvent('mouseover', {bubbles: true, cancelable: true, view: window}));
	}
	function openReal(channelId) {
		if (!channelId) return;
		const path = '/channels/' + guildId() + '/' + channelId;
		if (location.pathname === path) return;
		const target = channelClickTarget(channelId);
		if (target) target.click();
		if (location.pathname !== path) {
			history.pushState(null, '', path);
			dispatchEvent(new PopStateEvent('popstate'));
		}
		const chatReady = function () {
			const wrapper = document.querySelector('[data-flx="channel.messages.messages-wrapper"]');
			return wrapper && (wrapper.querySelector('article') || wrapper.querySelector('[data-flx^="channel.channel-welcome-section"]'));
		};
		if (chatReady()) return;
		document.documentElement.classList.add('ft-switching');
		const started = performance.now();
		const timer = setInterval(function () {
			if (chatReady() || performance.now() - started > 80) {
				clearInterval(timer);
				document.documentElement.classList.remove('ft-switching');
			}
		}, 16);
	}
	const channelPromises = new Map();
	function ensureFluxerChannel(thread) {
		if (thread.fluxer_channel_id) return Promise.resolve(thread.fluxer_channel_id);
		if (channelPromises.has(thread.id)) return channelPromises.get(thread.id);
		const pending = api('/guilds/' + guildId() + '/channels', {
			method: 'POST',
			body: JSON.stringify({name: thread.name, type: 0}),
		}).then(function (channel) {
			return api('/channels/' + thread.id, {
				method: 'PATCH',
				body: JSON.stringify({fluxer_channel_id: channel.id}),
			}).then(function () {
				thread.fluxer_channel_id = channel.id;
				return channel.id;
			});
		});
		channelPromises.set(thread.id, pending);
		return pending;
	}
	function hiddenChannelIds() {
		const ids = new Set(state.threads.map(function (thread) { return thread.fluxer_channel_id; }).filter(Boolean).map(String));
		const store = globalThis.__ftStorage;
		if (!store) return ids;
		try {
			JSON.parse(store.getItem('ft-hidden-' + guildId()) || '[]').forEach(function (id) { ids.add(String(id)); });
		} catch { /* ignore broken cache */ }
		return ids;
	}
	function rememberHiddenChannels() {
		const store = globalThis.__ftStorage;
		if (!store) return;
		const ids = state.threads.map(function (thread) { return thread.fluxer_channel_id; }).filter(Boolean).map(String);
		try { store.setItem('ft-hidden-' + guildId(), JSON.stringify(ids)); } catch { /* ignore quota */ }
	}
	function hideThreadChannels() {
		const ids = hiddenChannelIds();
		document.querySelectorAll('[data-scroll-id^="channel-"]').forEach(function (node) {
			const id = node.getAttribute('data-scroll-id').slice('channel-'.length);
			const row = node.closest('[data-flx="app.generic-channel-item.div"]') || node;
			if (ids.has(id)) {
				row.style.display = 'none';
				row.dataset.ftChannelHide = '1';
			} else if (row.dataset.ftChannelHide) {
				row.style.display = '';
				delete row.dataset.ftChannelHide;
			}
		});
	}
	function remember(threads) {
		const store = globalThis.__ftStorage;
		if (!store) return;
		try { store.setItem('ft-threads-' + guildId(), JSON.stringify(threads)); } catch { /* ignore quota */ }
	}
	function remembered() {
		const store = globalThis.__ftStorage;
		if (!store) return [];
		try { return JSON.parse(store.getItem('ft-threads-' + guildId()) || '[]'); } catch { return []; }
	}
	function go(channelId, threadId) {
		const thread = state.threads.find(function (item) { return item.id === threadId; });
		if (thread) showThread(thread);
	}
	async function api(path, options) {
		const headers = {'Content-Type': 'application/json'};
		const auth = token();
		if (auth) headers.Authorization = auth;
		const response = await fetch('/api' + path, Object.assign({headers: headers, credentials: 'include'}, options || {}));
		if (response.status === 204) return null;
		const body = await response.json().catch(function () { return {}; });
		if (!response.ok) throw new Error(body.message || body.code || response.statusText);
		return body;
	}
	async function load(channelId) {
		state.channelId = channelId;
		if (!channelId || !token()) return;
		const active = await api('/channels/' + channelId + '/threads/active');
		const archivedPublic = await api('/channels/' + channelId + '/threads/archived/public');
		const archivedPrivate = await api('/channels/' + channelId + '/threads/archived/private');
		const channelThreads = []
			.concat((active && active.threads) || [])
			.concat((archivedPublic && archivedPublic.threads) || [])
			.concat((archivedPrivate && archivedPrivate.threads) || []);
		const rest = state.threads.filter(function (thread) { return String(thread.parent_id) !== String(channelId); });
		state.threads = rest.concat(channelThreads);
	}
	function closeOverlays() {
		document.getElementById('ft-panel')?.remove();
		releaseColumn();
		document.getElementById('ft-menu')?.remove();
		document.getElementById('ft-menu-back')?.remove();
	}
	function paint() {
		const byMessage = new Map();
		for (const thread of state.threads) {
			if (thread.parent_message_id) byMessage.set(String(thread.parent_message_id), thread);
		}
		document.querySelectorAll('[data-message-id]').forEach(function (article) {
			const thread = byMessage.get(article.getAttribute('data-message-id'));
			let card = article.nextElementSibling;
			if (thread && (!card || !card.classList.contains('ft-card'))) {
				card = document.createElement('div');
				card.className = 'ft-card';
				article.insertAdjacentElement('afterend', card);
			}
			if (!card || !card.classList.contains('ft-card')) return;
			if (!thread) {
				card.remove();
				return;
			}
			card.replaceChildren();
			const name = document.createElement('strong');
			name.textContent = thread.name;
			const meta = document.createElement('span');
			meta.className = 'ft-muted';
			meta.textContent = (thread.last_message_sender_username || '') + (thread.last_message_preview ? ' · ' + thread.last_message_preview : '');
			const body = document.createElement('div');
			body.append(name, meta);
			card.appendChild(body);
			card.onclick = function () { go(state.channelId, thread.id); };
		});
		paintSidebar();
	}
	let sidebarSig = '';
	function channelRow(channelId) {
		if (!channelId) return null;
		const hit = document.querySelector('[data-scroll-id="channel-' + channelId + '"]');
		return hit && (hit.closest('[data-flx="app.generic-channel-item.div"]') || hit);
	}
	function paintSidebar() {
		state.channelId = pathIds().channel;
		const open = currentThread();
		const groups = new Map();
		state.threads.forEach(function (thread) {
			if (!thread.thread_metadata) return;
			const archived = !!thread.thread_metadata.archived;
			const viewing = open && open.id === thread.id;
			if (archived ? !viewing : !thread.joined) return;
			const parentId = String(thread.parent_id || '');
			if (!parentId) return;
			const list = groups.get(parentId) || [];
			list.push(thread);
			groups.set(parentId, list);
		});
		const sig = [...groups.entries()].map(function (entry) {
			return entry[0] + ':' + entry[1].map(function (thread) { return thread.id + thread.name; }).join(',');
		}).join('|') + '#' + (open ? open.id : '');
		if (sig === sidebarSig && document.querySelector('.ft-tree')) {
			const misplaced = [...document.querySelectorAll('.ft-tree')].some(function (tree) {
				const parent = tree.previousElementSibling && tree.previousElementSibling.querySelector('[data-scroll-id]');
				return !parent || parent.getAttribute('data-scroll-id') !== 'channel-' + tree.dataset.parentId;
			});
			if (!misplaced) return;
		}
		sidebarSig = sig;
		document.querySelectorAll('.ft-tree').forEach(function (node) { node.remove(); });
		groups.forEach(function (rows, channelId) {
			const row = channelRow(channelId);
			if (!row) return;
			const tree = document.createElement('div');
			tree.className = 'ft-tree';
			tree.dataset.parentId = channelId;
			rows.forEach(function (thread) {
			const item = document.createElement('div');
			item.className = 'ft-side' + (currentThread() && currentThread().id === thread.id ? ' ft-on' : '');
			const label = document.createElement('span');
			label.textContent = thread.name;
			item.appendChild(label);
			item.onmouseenter = function () { preloadChannel(thread.fluxer_channel_id); };
			item.onclick = function (event) {
				event.preventDefault();
				event.stopPropagation();
				go(channelId, thread.id);
			};
			item.dataset.threadId = thread.id;
			item.setAttribute('role', 'button');
			item.setAttribute('aria-label', 'Ветка ' + thread.name);
			item.oncontextmenu = function (event) {
				event.preventDefault();
				event.stopPropagation();
			};
			tree.appendChild(item);
			});
			row.insertAdjacentElement('afterend', tree);
		});
		hideThreadChannels();
	}
	const memberIds = new Map();
	const memberLoading = new Set();
	let memberWatch = null;
	function rowUserId(row) {
		const fiberName = Object.keys(row).find(function (name) { return name.indexOf('__reactFiber') === 0; });
		const fiber = fiberName ? row[fiberName] : null;
		if (!fiber) return '';
		if (typeof fiber.key === 'string' && fiber.key.indexOf('member-') === 0) return fiber.key.slice(7);
		let node = fiber.child;
		for (let step = 0; node && step < 20; step += 1) {
			const props = node.memoizedProps || node.pendingProps;
			if (props && props.user && props.user.id) return String(props.user.id);
			node = node.child;
		}
		return '';
	}
	function markMemberRow(row, hide, transform) {
		if (hide) {
			if (row.dataset.ftHide !== '1') row.dataset.ftHide = '1';
		} else if (row.dataset.ftHide) {
			delete row.dataset.ftHide;
		}
		if (transform && row.style.transform !== transform) row.style.transform = transform;
	}
	function layoutMembers(ids) {
		const content = document.querySelector('[data-flx="channel.channel-members.lazy-member-list.virtual-list-content"]');
		if (!content) return;
		const rows = Array.from(content.children);
		const visible = [];
		let pendingGroup = null;
		let pendingMembers = [];
		function flush() {
			if (pendingMembers.length) {
				if (pendingGroup) visible.push({row: pendingGroup, count: pendingMembers.length, group: true});
				pendingMembers.forEach(function (row) { visible.push({row: row, group: false}); });
			} else if (pendingGroup) {
				markMemberRow(pendingGroup, true, '');
			}
			pendingGroup = null;
			pendingMembers = [];
		}
		rows.forEach(function (row) {
			const flx = row.getAttribute('data-flx') || '';
			if (flx.indexOf('virtual-row.group') !== -1) {
				flush();
				pendingGroup = row;
				return;
			}
			if (flx.indexOf('virtual-row.member') === -1 || flx.indexOf('member-list-item') !== -1) {
				markMemberRow(row, true, '');
				return;
			}
			if (ids.has(rowUserId(row))) pendingMembers.push(row);
			else markMemberRow(row, true, '');
		});
		flush();
		const seen = new Set();
		let top = 0;
		visible.forEach(function (item) {
			seen.add(item.row);
			markMemberRow(item.row, false, 'translateY(' + top + 'px)');
			if (item.group) {
				const count = item.row.querySelector('[data-flx="channel.channel-members.member-list-group-header-content.group-header-count"]');
				const text = String(item.count);
				if (count && count.textContent !== text) count.textContent = text;
			}
			top += item.group ? 32 : 44;
		});
		const height = Math.max(top, 1) + 'px';
		if (content.style.height !== height) content.style.height = height;
		watchMemberList(content);
	}
	function watchMemberList(content) {
		if (memberWatch && memberWatch.target === content) return;
		if (memberWatch) memberWatch.observer.disconnect();
		const observer = new MutationObserver(function () {
			const thread = currentThread();
			const ids = thread && memberIds.get(thread.id);
			if (ids) layoutMembers(ids);
		});
		observer.observe(content, {childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['style']});
		memberWatch = {observer: observer, target: content};
	}
	function clearMemberFilter() {
		if (memberWatch) {
			memberWatch.observer.disconnect();
			memberWatch = null;
		}
		document.documentElement.removeAttribute('data-ft-members');
		document.getElementById('ft-members')?.remove();
		document.querySelectorAll('[data-ft-hide]').forEach(function (row) {
			delete row.dataset.ftHide;
			row.style.transform = '';
		});
		const content = document.querySelector('[data-flx="channel.channel-members.lazy-member-list.virtual-list-content"]');
		if (content) content.style.height = '';
	}
	function paintMembers() {
		const thread = currentThread();
		const aside = document.querySelector('[data-flx="channel.member-list-container.member-list-container"]');
		if (!thread || !aside) {
			clearMemberFilter();
			return;
		}
		document.documentElement.dataset.ftMembers = '1';
		const ids = memberIds.get(thread.id);
		if (ids) {
			layoutMembers(ids);
			return;
		}
		if (memberLoading.has(thread.id)) return;
		memberLoading.add(thread.id);
		const threadId = thread.id;
		api('/channels/' + threadId + '/thread-members').then(function (members) {
			const set = new Set((members || []).map(function (member) { return String(member.user_id); }));
			memberIds.set(threadId, set);
			memberLoading.delete(threadId);
			if (!currentThread() || currentThread().id !== threadId) return;
			layoutMembers(set);
		}).catch(function () {
			memberLoading.delete(threadId);
		});
	}
	let channelTitle = null;
	let messageTemplate = null;
	function restoreChannel() {
		document.getElementById('ft-log')?.remove();
		const area = document.querySelector('[data-flx="channel.channel-chat-layout.messages-area"]');
		if (area) area.style.position = '';
		document.documentElement.removeAttribute('data-ft-open');
		const header = document.querySelector('[data-flx="channel.channel-header.header-wrapper"]');
		const icon = header && header.querySelector('[data-flx="channel.channel-utils.get-icon.text-channel-icon"]');
		if (icon) icon.style.display = '';
		const box = document.querySelector('[class*="composerEditable"]');
		if (box && box.dataset.ftLabel) {
			box.setAttribute('aria-label', box.dataset.ftLabel);
			delete box.dataset.ftLabel;
		}
		document.getElementById('ft-hash')?.remove();
		const name = document.querySelector('[data-flx^="channel.channel-header.channel-name"]');
		if (name && channelTitle != null) name.textContent = channelTitle;
		channelTitle = null;
		state.openThread = null;
		state.messageCache = null;
	}
	function closeThread() {
		const ids = pathIds();
		restoreChannel();
		if (ids.thread) history.pushState({}, '', '/channels/' + ids.guild + '/' + ids.channel);
		sidebarSig = '';
		paintSidebar();
	}
	function applyChannelChrome(thread) {
		const name = document.querySelector('[data-flx^="channel.channel-header.channel-name"]');
		if (name) {
			if (channelTitle == null && name.textContent !== thread.name) channelTitle = name.textContent;
			if (name.textContent !== thread.name) name.textContent = thread.name;
		}
		document.documentElement.dataset.ftOpen = '1';
		const header = document.querySelector('[data-flx="channel.channel-header.header-wrapper"]');
		const icon = header && header.querySelector('[data-flx="channel.channel-utils.get-icon.text-channel-icon"]');
		if (icon) icon.style.display = 'none';
		const box = document.querySelector('[class*="composerEditable"]');
		if (box) {
			if (!box.dataset.ftLabel) box.dataset.ftLabel = box.getAttribute('aria-label') || '';
			const label = 'Написать в ' + thread.name;
			if (box.getAttribute('aria-label') !== label) box.setAttribute('aria-label', label);
		}
		if (name && header && header.contains(name) && !document.getElementById('ft-hash')) {
			const mark = document.createElement('span');
			mark.id = 'ft-hash';
			mark.innerHTML = spool;
			name.before(mark);
		}
		const area = document.querySelector('[data-flx="channel.channel-chat-layout.messages-area"]');
		if (!area) return;
		if (!messageTemplate) {
			const sample = area.querySelector('[role="article"]');
			if (sample) messageTemplate = sample.cloneNode(true);
		}
		area.style.position = 'relative';
		let log = document.getElementById('ft-log');
		if (!log) {
			log = document.createElement('div');
			log.id = 'ft-log';
			area.appendChild(log);
		}
		log.dataset.threadId = thread.id;
		if (state.messageCache) renderMessages(thread, state.messageCache);
	}
	function messageSig(messages) {
		return (messages || []).map(function (message) { return String(message.message_id || message.id || message.content); }).join('|');
	}
	function renderMessages(thread, messages) {
		const log = document.getElementById('ft-log');
		if (!log) return;
		const sig = thread.id + ':' + messageSig(messages);
		if (log.dataset.sig === sig) return;
		log.dataset.sig = sig;
		log.replaceChildren();
		const welcomeSample = document.querySelector('[data-flx="channel.channel-welcome-section.container"]');
		if (welcomeSample) {
			const welcome = welcomeSample.cloneNode(true);
			const heading = welcome.querySelector('[class*="heading"]');
			const description = welcome.querySelector('[class*="description"]');
			if (heading) heading.textContent = thread.name;
			if (description) description.textContent = 'Это начало ветки «' + thread.name + '».';
			log.appendChild(welcome);
		}
		(messages || []).forEach(function (message) {
			const line = messageTemplate ? messageTemplate.cloneNode(true) : document.createElement('div');
			line.style.display = '';
			if (messageTemplate) {
				line.removeAttribute('id');
				line.removeAttribute('data-message-id');
				line.querySelectorAll('[data-message-id]').forEach(function (node) { node.removeAttribute('data-message-id'); });
				const user = line.querySelector('[class*="messageUsername"]');
				if (user) user.textContent = message.author_username || 'Участник';
				const text = line.querySelector('[class*="messageText"]');
				if (text) text.textContent = message.content || '';
				const time = line.querySelector('time');
				if (time && message.created_at) {
					const date = new Date(Number(message.created_at));
					time.textContent = date.toLocaleString('ru-RU', {day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'});
				}
				line.querySelectorAll('[data-flx*="action-bar"]').forEach(function (node) { node.remove(); });
			} else {
				line.className = 'Message.module__message___OEtiVj';
				line.setAttribute('role', 'article');
				const content = document.createElement('div');
				content.className = 'Message.module__messageContent___OEtiVj';
				const author = document.createElement('h3');
				author.className = 'Message.module__messageAuthorInfo___OEtiVj';
				const username = document.createElement('span');
				username.className = 'Message.module__messageUsername___OEtiVj';
				username.textContent = message.author_username || 'Участник';
				const text = document.createElement('div');
				text.className = 'Message.module__messageText___OEtiVj Message.module__messageSent___OEtiVj';
				text.textContent = message.content || '';
				author.appendChild(username);
				content.append(author, text);
				line.appendChild(content);
			}
			log.appendChild(line);
		});
		log.scrollTop = log.scrollHeight;
	}
	function spoilerSeen(threadId) {
		const store = globalThis.__ftStorage;
		if (!store) return false;
		try { return Boolean(JSON.parse(store.getItem('ft-spoiler-seen-' + guildId()) || '{}')[threadId]); } catch { return false; }
	}
	function markSpoilerSeen(threadId) {
		const store = globalThis.__ftStorage;
		if (!store) return;
		let map = {};
		try { map = JSON.parse(store.getItem('ft-spoiler-seen-' + guildId()) || '{}'); } catch { map = {}; }
		map[threadId] = true;
		try { store.setItem('ft-spoiler-seen-' + guildId(), JSON.stringify(map)); } catch { /* ignore quota */ }
	}
	function openSpoilerWarning(thread, onContinue) {
		document.getElementById('ft-spoiler')?.remove();
		const modal = document.createElement('div');
		modal.id = 'ft-spoiler';
		modal.className = 'ft-spoiler';
		modal.innerHTML = '<div class="ft-spoiler-card"><h2>Спойлеры</h2><p>Эта ветка помечена как содержащая спойлеры. Сюжетные повороты и обсуждения будут скрыты, пока вы не продолжите.</p><div><button type="button" class="ft-ghost" data-cancel>Отмена</button><button type="button" class="ft-primary" data-go>Продолжить</button></div></div>';
		modal.querySelector('[data-cancel]').onclick = function () {
			modal.remove();
			if (currentThread() && currentThread().id === thread.id) openReal(thread.parent_id);
		};
		modal.querySelector('[data-go]').onclick = function () {
			markSpoilerSeen(thread.id);
			modal.remove();
			onContinue();
		};
		document.body.appendChild(modal);
	}
	function showThread(thread) {
		if (!thread) return;
		if (thread.spoiler && !spoilerSeen(thread.id)) {
			openSpoilerWarning(thread, function () { showThread(thread); });
			return;
		}
		closeOverlays();
		ensureFluxerChannel(thread).then(function (channelId) {
			hideThreadChannels();
			openReal(channelId);
			sidebarSig = '';
			paintSidebar();
		}).catch(function (error) { console.error(error); });
	}
	function parentChannelId() {
		const thread = currentThread();
		if (thread && thread.parent_id) return String(thread.parent_id);
		return String(pathIds().channel || '');
	}
	function ensureHeaderButton() {
		const bell = document.querySelector('[data-flx="channel.channel-header-components.channel-notification-settings-button.channel-header-icon.click"]');
		if (!bell || !bell.parentElement) return;
		const right = bell.parentElement;
		let button = document.getElementById('ft-spool');
		if (button && button.parentElement === right && button.nextElementSibling === bell) return;
		if (!button) {
			button = document.createElement('button');
			button.id = 'ft-spool';
			button.type = 'button';
			button.title = 'Ветки';
			button.setAttribute('aria-label', 'Ветки');
			button.innerHTML = spool.replace('<svg ', '<svg class="ChannelHeader.module__buttonIcon___RnVTYm" ');
			button.onclick = function (event) {
				event.preventDefault();
				event.stopPropagation();
				openPanel();
			};
		}
		button.className = bell.className;
		right.insertBefore(button, bell);
	}
	function filtered(list) {
		const query = state.query.trim().toLowerCase();
		return list.filter(function (thread) { return !query || thread.name.toLowerCase().includes(query); });
	}
	function ago(stamp) {
		const value = Number(stamp);
		if (!value) return '';
		const minutes = Math.round((Date.now() - value) / 60000);
		if (minutes < 1) return 'только что';
		if (minutes < 60) return minutes + ' мин. назад';
		const hours = Math.round(minutes / 60);
		if (hours < 24) return hours + ' ч. назад';
		const days = Math.round(hours / 24);
		if (days < 30) return days + ' д. назад';
		return new Date(value).toLocaleDateString('ru-RU', {day: 'numeric', month: 'long', year: 'numeric'});
	}
	const peopleById = new Map();
	function avatarSrc(userId) {
		const known = document.querySelector('img[src*="' + userId + '"]');
		if (known && known.src) return known.currentSrc || known.src;
		const user = peopleById.get(String(userId));
		const hash = user && user.avatar;
		if (hash) {
			const sample = document.querySelector('img[src*="/avatars/"][src*=".webp"]');
			if (sample) {
				try {
					const url = new URL(sample.src, location.href);
					const file = String(hash).replace(/^a_/, '');
					url.pathname = url.pathname.replace(/\/avatars\/[^/]+\/[^.]+\.webp$/, '/avatars/' + userId + '/' + file + '.webp');
					url.search = '?size=80';
					return url.toString();
				} catch (error) { /* default avatar */ }
			}
		}
		let index = 0;
		try { index = Number(BigInt(userId) % 6n); } catch (error) { index = 0; }
		return location.origin + '/avatars/' + index + '.png?v=1';
	}
	function hydrateFaces(root) {
		const imgs = root.querySelectorAll('.ft-faces img[data-user-id]');
		if (!imgs.length || !guildId()) return;
		api('/guilds/' + guildId() + '/members?limit=100').then(function (members) {
			(members || []).forEach(function (member) {
				const user = member && member.user;
				if (user && user.id) peopleById.set(String(user.id), user);
			});
			imgs.forEach(function (img) {
				if (!img.isConnected) return;
				const next = avatarSrc(img.dataset.userId);
				if (next && img.getAttribute('src') !== next) img.src = next;
			});
		}).catch(function () {});
	}
	function fillPanelList(list, channelId) {
		const here = state.threads.filter(function (thread) { return String(thread.parent_id) === String(channelId); });
		const joined = filtered(here.filter(function (thread) { return thread.joined && thread.thread_metadata && !thread.thread_metadata.archived; }));
		const old = filtered(here.filter(function (thread) { return thread.joined && thread.thread_metadata && thread.thread_metadata.archived; }));
		list.replaceChildren();
		if (!joined.length && !old.length) {
			const empty = document.createElement('div');
			empty.className = 'ft-empty';
			empty.innerHTML = '<strong>Нет веток.</strong><p class="ft-hint">Не отвлекайтесь от беседы с помощью веток — временных текстовых каналов.</p>';
			list.appendChild(empty);
			return;
		}
		if (joined.length) {
			const section = document.createElement('div');
			section.className = 'ft-section';
			section.textContent = 'УЧАСТИЕ В ВЕТКАХ: ' + joined.length;
			list.appendChild(section);
			joined.forEach(function (thread) { list.appendChild(threadRow(thread, false)); });
		}
		if (old.length) {
			const archived = document.createElement('div');
			archived.className = 'ft-section';
			archived.textContent = 'СТАРЫЕ ВЕТКИ';
			list.appendChild(archived);
			old.forEach(function (thread) { list.appendChild(threadRow(thread, true)); });
		}
	}
	function openPanel() {
		closeOverlays();
		const button = document.getElementById('ft-spool');
		const anchor = button ? button.getBoundingClientRect() : {left: 16, bottom: 56, right: 48};
		const width = Math.min(560, window.innerWidth - 16);
		const top = anchor.bottom + 8;
		const height = Math.min(520, Math.max(320, window.innerHeight - top - 16));
		let left = anchor.left;
		if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - 8 - width);
		const panel = document.createElement('div');
		panel.id = 'ft-panel';
		panel.className = 'ChannelPinsPopout.module__container___dW9DVm';
		panel.style.position = 'fixed';
		panel.style.top = top + 'px';
		panel.style.left = left + 'px';
		panel.style.width = width + 'px';
		panel.style.height = height + 'px';
		panel.style.zIndex = '1000';
		const channelId = parentChannelId();
		panel.innerHTML = '<div class="ft-panel-bar"><h1>' + spool + ' Ветки</h1><input class="ft-search" placeholder="Поиск по названию ветки" /><button type="button" class="ft-primary" data-create>Создать</button></div>';
		const list = document.createElement('div');
		list.className = 'ft-scroll';
		fillPanelList(list, channelId);
		hydrateFaces(list);
		panel.appendChild(list);
		const search = panel.querySelector('.ft-search');
		search.value = state.query;
		search.addEventListener('input', function (event) {
			state.query = event.target.value;
			fillPanelList(list, channelId);
			hydrateFaces(list);
		});
		panel.querySelector('[data-create]').onclick = function () { openColumn(channelId); };
		document.body.appendChild(panel);
		search.focus();
	}
	function threadRow(thread, archived) {
		const item = document.createElement('div');
		item.className = 'ft-thread-card' + (archived ? ' ft-old' : '');
		item.dataset.threadId = String(thread.id);
		const text = document.createElement('div');
		text.style.minWidth = '0';
		text.style.flex = '1';
		const name = document.createElement('strong');
		name.textContent = thread.name;
		const meta = document.createElement('div');
		meta.className = 'ft-thread-meta';
		if (thread.last_message_preview) {
			const dot = document.createElement('i');
			dot.className = 'ft-dot';
			const line = document.createElement('span');
			const who = thread.last_message_sender_username || 'Участник';
			const when = ago(thread.last_message_timestamp);
			line.textContent = who + ': ' + thread.last_message_preview + (when ? ' · ' + when : '');
			meta.append(dot, line);
		} else {
			const line = document.createElement('span');
			const when = ago(thread.thread_metadata && thread.thread_metadata.create_timestamp);
			line.textContent = 'Нет недавних сообщений' + (when ? ' · ' + when : '');
			meta.appendChild(line);
		}
		text.append(name, meta);
		const faces = document.createElement('div');
		faces.className = 'ft-faces';
		const ids = (thread.member_ids && thread.member_ids.length ? thread.member_ids : [thread.owner_id]).filter(Boolean).slice(0, 5);
		ids.forEach(function (userId) {
			const face = document.createElement('img');
			face.alt = '';
			face.dataset.userId = String(userId);
			face.src = avatarSrc(String(userId));
			faces.appendChild(face);
		});
		item.append(text, faces);
		item.onclick = function () { go(thread.parent_id, thread.id); };
		return item;
	}
	function releaseColumn() {
		document.getElementById('ft-col')?.remove();
		const chat = document.querySelector('[data-flx="channel.channel-chat-layout.container"]');
		if (chat) chat.style.marginRight = '';
	}
	function placeColumn() {
		const column = document.getElementById('ft-col');
		const layout = document.querySelector('[data-flx="channel.channel-layout.channel-layout-container"]');
		const header = document.querySelector('[data-flx="channel.channel-header.header-wrapper"]');
		const chat = document.querySelector('[data-flx="channel.channel-chat-layout.container"]');
		if (!column || !layout || !header) return;
		const box = layout.getBoundingClientRect();
		const bar = header.getBoundingClientRect();
		const width = Math.min(320, box.width - 48);
		column.style.top = bar.bottom + 'px';
		column.style.height = Math.max(0, box.bottom - bar.bottom) + 'px';
		column.style.width = width + 'px';
		column.style.left = (box.right - width) + 'px';
		if (chat) chat.style.marginRight = width + 'px';
	}
	function submitColumn(column, channelId) {
		const data = new FormData(column);
		const message = String(data.get('message') || '').trim();
		const typedName = String(data.get('name') || '').trim();
		if (!message && !typedName) return;
		const name = typedName || 'Новая ветка';
		const parentMessage = state.pendingMessage;
		state.pendingMessage = null;
		const threadPath = parentMessage
			? '/channels/' + channelId + '/messages/' + parentMessage + '/threads'
			: '/channels/' + channelId + '/threads';
		api('/guilds/' + guildId() + '/channels', {
			method: 'POST',
			body: JSON.stringify({name: name, type: 0}),
		}).then(function (channel) {
			return api(threadPath, {
				method: 'POST',
				body: JSON.stringify({
					name: name,
					private: data.get('private') === 'on',
					auto_archive_duration: 10080,
					guild_id: guildId(),
					fluxer_channel_id: channel.id,
				}),
			}).then(function () {
				const posted = message
					? api('/channels/' + channel.id + '/messages', {method: 'POST', body: JSON.stringify({content: message})})
					: Promise.resolve();
				return posted.then(function () {
					releaseColumn();
						return load(channelId).then(function () {
						remember(state.threads);
						sidebarSig = '';
						hideThreadChannels();
						paint();
						openReal(channel.id);
					});
				});
			});
		}).catch(function (error) { console.error(error); });
	}
	function openColumn(channelId, preset) {
		if (!channelId) return;
		closeOverlays();
		const column = document.createElement('form');
		column.id = 'ft-col';
		column.className = 'ft-col';
		column.innerHTML = '<header><h2>' + spool + ' Новая ветка</h2><button type="button" class="ft-x" data-x aria-label="Закрыть">×</button></header><div class="ft-body"><label>Название ветки<input name="name" type="text" placeholder="Новая ветка" maxlength="100" /></label><label class="ft-check"><input name="private" type="checkbox" /> <span>Приватная ветка<br><span class="ft-hint">Ветка видна только приглашённым пользователям и модераторам</span></span></label></div><div class="ft-composer"><input name="message" placeholder="Введите сообщение, чтобы начать беседу!" /></div>';
		if (preset) column.querySelector('[name=message]').value = preset;
		column.querySelector('[data-x]').onclick = function () { releaseColumn(); };
		column.onsubmit = function (event) {
			event.preventDefault();
			submitColumn(column, channelId);
		};
		column.querySelector('[name=message]').addEventListener('keydown', function (event) {
			if (event.key !== 'Enter' || event.shiftKey) return;
			event.preventDefault();
			submitColumn(column, channelId);
		});
		document.body.appendChild(column);
		placeColumn();
		column.querySelector('[name=message]').focus();
	}
	let notifySnapshot = null;
	let notifyRead = 0;
	function notifyLabel(level) {
		if (level === 0) return 'Все сообщения';
		if (level === 1) return 'Только @упоминания';
		if (level === 2) return 'Ничего';
		return '';
	}
	function notifyLabelFromText(text) {
		const value = (text || '').replace(/\s+/g, ' ').trim();
		if (value.indexOf('Ничего') !== -1) return 'Ничего';
		if (value.indexOf('упомина') !== -1) return 'Только @упоминания';
		if (value.indexOf('Все сообщения') !== -1) return 'Все сообщения';
		return '';
	}
	function channelParentId(channelId) {
		const target = channelClickTarget(channelId);
		if (!target) return '';
		const fiberName = Object.keys(target).find(function (name) { return name.indexOf('__reactFiber') === 0; });
		let node = fiberName ? target[fiberName] : null;
		for (let step = 0; node && step < 16; step += 1) {
			const props = node.memoizedProps;
			if (props && props.channel && String(props.channel.id) === String(channelId)) {
				return props.channel.parentId ? String(props.channel.parentId) : '';
			}
			node = node.return;
		}
		return '';
	}
	function notifyChoice(thread) {
		const snap = notifySnapshot;
		if (!snap || !thread) return '';
		const ids = [thread.fluxer_channel_id, thread.parent_id, channelParentId(thread.parent_id)];
		for (let index = 0; index < ids.length; index += 1) {
			const id = ids[index] ? String(ids[index]) : '';
			if (!id || snap.overrides[id] == null) continue;
			const label = notifyLabel(snap.overrides[id]);
			if (label) return label;
		}
		return snap.guild || '';
	}
	function showNotifyChoice(label) {
		document.querySelectorAll('[data-ft-notify] button').forEach(function (button) {
			const mark = button.querySelector('.ft-radio');
			if (!mark) return;
			mark.className = 'ft-radio' + (itemText(button) === label ? ' on' : '');
		});
	}
	function closeMenu() {
		document.querySelectorAll('.ft-sub').forEach(function (node) { node.remove(); });
		document.getElementById('ft-menu')?.remove();
		document.getElementById('ft-menu-back')?.remove();
	}
	function nativeMenuItems() {
		return [...document.querySelectorAll('[role="menuitem"], [role="menuitemradio"]')].filter(function (node) {
			return !node.closest('#ft-menu') && !node.closest('.ft-sub');
		});
	}
	function reactProps(node) {
		if (!node) return null;
		const key = Object.keys(node).find(function (name) { return name.indexOf('__reactProps') === 0; });
		return key ? node[key] : null;
	}
	function reactFiber(node) {
		if (!node) return null;
		const key = Object.keys(node).find(function (name) { return name.indexOf('__reactFiber') === 0; });
		return key ? node[key] : null;
	}
	function fakeEvent(node, type) {
		return {
			type: type,
			pointerType: 'mouse',
			button: 0,
			buttons: 0,
			target: node,
			currentTarget: node,
			preventDefault: function () {},
			stopPropagation: function () {},
			nativeEvent: {target: node, pointerType: 'mouse'},
			persist: function () {},
		};
	}
	function reactClick(node) {
		const props = reactProps(node);
		if (props && typeof props.onClick === 'function') props.onClick(fakeEvent(node, 'click'));
	}
	function openNativeSubmenu(node) {
		let fiber = reactFiber(node);
		for (let step = 0; fiber && step < 12; step += 1) {
			let hook = fiber.memoizedState;
			let hops = 0;
			while (hook && hops < 20) {
				hops += 1;
				const queue = hook.queue;
				if (hook.memoizedState === false && queue && typeof queue.dispatch === 'function' && !queue.getSnapshot) {
					queue.dispatch(true);
					return true;
				}
				hook = hook.next;
			}
			fiber = fiber.return;
		}
		return false;
	}
	function itemText(node) {
		return (node.innerText || '').replace(/\s+/g, ' ').trim();
	}
	function finishDrive() {
		document.querySelectorAll('[role="dialog"]').forEach(function (dialog) {
			const close = [...dialog.querySelectorAll('button')].find(function (button) {
				const text = itemText(button);
				return text === 'Закрыть' || button.getAttribute('aria-label') === 'Закрыть';
			});
			if (close) reactClick(close);
		});
		document.querySelectorAll('[class*="modalBackdrop"], [class*="modal-backdrop"], [class*="backdrop"]').forEach(function (node) {
			if (node.id === 'ft-menu-back') return;
			node.click();
		});
		let tries = 0;
		const timer = setInterval(function () {
			tries += 1;
			const left = document.querySelector('[class*="modalBackdrop"], [class*="modal-backdrop"], [class*="contextMenuPositioner"], [role="dialog"]');
			if (!left || tries > 25) {
				clearInterval(timer);
				document.documentElement.classList.remove('ft-driving');
			}
		}, 40);
	}
	function readNotifySnapshot(ticket, done) {
		const target = channelClickTarget(pathIds().channel);
		if (!target) {
			done(null);
			return;
		}
		document.documentElement.classList.add('ft-driving');
		target.dispatchEvent(new MouseEvent('contextmenu', {bubbles: true, cancelable: true, clientX: 8, clientY: 8, view: window}));
		let tries = 0;
		let opened = false;
		const timer = setInterval(function () {
			if (ticket !== notifyRead) {
				clearInterval(timer);
				finishDrive();
				return;
			}
			tries += 1;
			const dialog = [...document.querySelectorAll('[role="dialog"]')].find(function (node) {
				return itemText(node).indexOf('Настройки уведомлений') !== -1;
			});
			if (!dialog) {
				const parent = nativeMenuItems().find(function (node) { return itemText(node).indexOf('Настройки уведомлений') === 0; });
				if (parent && !opened) {
					opened = true;
					reactClick(parent);
				}
				if (tries > 40) {
					clearInterval(timer);
					finishDrive();
					done(null);
				}
				return;
			}
			clearInterval(timer);
			let guild = '';
			[...dialog.querySelectorAll('[role="radiogroup"]')].some(function (group) {
				const radios = [...group.querySelectorAll('[role="radio"]')];
				const names = radios.map(function (radio) {
					return (radio.getAttribute('aria-label') || radio.textContent || '').replace(/\s+/g, ' ').trim();
				});
				if (names.indexOf('Все сообщения') === -1 || names.indexOf('Ничего') === -1 || names.indexOf('Как в аккаунте') !== -1) return false;
				const checked = radios.find(function (radio) {
					return radio.getAttribute('aria-checked') === 'true' || radio.getAttribute('data-state') === 'checked';
				});
				guild = notifyLabelFromText(checked ? (checked.getAttribute('aria-label') || checked.textContent || '') : '');
				return true;
			});
			const overrides = {};
			const fiberName = Object.keys(dialog).find(function (name) { return name.indexOf('__reactFiber') === 0; });
			let node = fiberName ? dialog[fiberName] : null;
			for (let step = 0; node && step < 30; step += 1) {
				let hook = node.memoizedState;
				let hops = 0;
				while (hook && hops < 30) {
					hops += 1;
					const current = hook.memoizedState && hook.memoizedState.current;
					const reaction = current && current.reaction;
					const observed = reaction && reaction.observing_;
					if (observed) {
						observed.forEach(function (atom) {
							const value = atom.value_;
							if (!value || typeof value !== 'object' || Array.isArray(value)) return;
							const ids = Object.keys(value);
							if (!ids.length || !value[ids[0]] || typeof value[ids[0]].message_notifications !== 'number') return;
							ids.forEach(function (id) { overrides[id] = value[id].message_notifications; });
						});
					}
					hook = hook.next;
				}
				node = node.return;
			}
			finishDrive();
			if (ticket !== notifyRead) return;
			notifySnapshot = {guild: guild, overrides: overrides};
			done(notifySnapshot);
		}, 40);
	}
	function refreshNotifySnapshot(done) {
		const ticket = ++notifyRead;
		readNotifySnapshot(ticket, function () {
			if (ticket === notifyRead && done) done();
		});
	}
	function driveChannelSetting(thread, action) {
		notifyRead += 1;
		const row = channelClickTarget(thread.fluxer_channel_id);
		if (!row || !action) return;
		closeMenu();
		document.documentElement.classList.add('ft-driving');
		row.dispatchEvent(new MouseEvent('contextmenu', {bubbles: true, cancelable: true, clientX: 8, clientY: 8, view: window}));
		let tries = 0;
		let opened = false;
		const timer = setInterval(function () {
			tries += 1;
			const giveUp = function () {
				if (tries > 40) {
					clearInterval(timer);
					finishDrive();
				}
			};
			if (action.kind === 'mute') {
				const child = nativeMenuItems().find(function (node) { return itemText(node) === action.label; });
				if (child) {
					clearInterval(timer);
					reactClick(child);
					setTimeout(finishDrive, 60);
					return;
				}
				const parent = nativeMenuItems().find(function (node) {
					const text = itemText(node);
					return text.indexOf('Отключить уведомления канала') !== -1 || text.indexOf('Включить уведомления канала') !== -1;
				});
				if (parent && !opened) {
					opened = true;
					openNativeSubmenu(parent);
				}
				giveUp();
				return;
			}
			const dialog = [...document.querySelectorAll('[role="dialog"]')].find(function (node) {
				return itemText(node).indexOf('Настройки уведомлений') !== -1;
			});
			if (!dialog) {
				const parent = nativeMenuItems().find(function (node) { return itemText(node).indexOf('Настройки уведомлений') === 0; });
				if (parent && !opened) {
					opened = true;
					reactClick(parent);
				}
				giveUp();
				return;
			}
			const override = [...dialog.querySelectorAll('[data-flx="guild.guild-notification-settings-modal.override-item"]')].find(function (node) {
				const fiber = reactFiber(node);
				return fiber && String(fiber.key) === String(thread.fluxer_channel_id);
			});
			if (!override) {
				const combo = dialog.querySelector('[data-flx="guild.guild-notification-settings-modal.select.add-override"]');
				let fiber = reactFiber(combo);
				let onChange = null;
				for (let step = 0; fiber && step < 6; step += 1) {
					if (fiber.memoizedProps && typeof fiber.memoizedProps.onChange === 'function' && Array.isArray(fiber.memoizedProps.options)) {
						onChange = fiber.memoizedProps.onChange;
						break;
					}
					fiber = fiber.return;
				}
				if (onChange && combo && !combo.dataset.ftAdded) {
					combo.dataset.ftAdded = '1';
					onChange(String(thread.fluxer_channel_id));
				}
				giveUp();
				return;
			}
			const button = [...override.querySelectorAll('button')].find(function (node) { return itemText(node) === action.label; });
			if (!button) {
				giveUp();
				return;
			}
			clearInterval(timer);
			reactClick(button);
			setTimeout(finishDrive, 80);
		}, 40);
	}
	function menuButton(label) {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'ContextMenu.module__item___SC1OQU';
		button.setAttribute('role', 'menuitem');
		const text = document.createElement('div');
		text.className = 'ContextMenu.module__itemLabel___SC1OQU';
		text.textContent = label;
		button.appendChild(text);
		return button;
	}
	function openMenu(thread, x, y) {
		closeMenu();
		const backdrop = document.createElement('div');
		backdrop.id = 'ft-menu-back';
		backdrop.className = 'ContextMenu.module__backdrop___SC1OQU';
		backdrop.style.zIndex = '1990';
		backdrop.onclick = function (event) {
			event.stopPropagation();
			closeMenu();
		};
		const menu = document.createElement('div');
		menu.id = 'ft-menu';
		menu.className = 'ContextMenu.module__contextMenu___SC1OQU';
		menu.setAttribute('role', 'menu');
		menu.style.position = 'fixed';
		menu.style.left = Math.min(x, window.innerWidth - 520) + 'px';
		menu.style.top = Math.min(y, window.innerHeight - 420) + 'px';
		menu.style.zIndex = '2000';
		menu.dataset.threadId = thread.id;
		const plain = ['Пометить как прочитанное', 'Покинуть ветку', 'Закрыть ветку', 'Редактировать ветку', 'Копировать ссылку'];
		plain.forEach(function (label) {
			const button = menuButton(label);
			button.onclick = function (event) {
				event.stopPropagation();
				runMenu(thread, label);
				closeMenu();
			};
			menu.appendChild(button);
		});
		addSubmenu(menu, 'Заглушить ветку', [
			['На 15 минут', {kind: 'mute', label: 'На 15 минут'}],
			['На 1 час', {kind: 'mute', label: 'На 1 час'}],
			['На 3 часа', {kind: 'mute', label: 'На 3 часа'}],
			['На 8 часов', {kind: 'mute', label: 'На 8 часов'}],
			['На 24 часа', {kind: 'mute', label: 'На 24 часов'}],
			['До тех пор, пока не включу', {kind: 'mute', label: 'Пока не включу обратно'}],
		], thread, false);
		addSubmenu(menu, 'Параметры уведомлений', [
			['Все сообщения', {kind: 'notify', label: 'Все сообщения'}],
			['Только @упоминания', {kind: 'notify', label: 'Только упоминания'}],
			['Ничего', {kind: 'notify', label: 'Ничего'}],
		], thread, notifyChoice(thread));
		const copyId = menuButton('Копировать ID ветки');
		copyId.onclick = function (event) {
			event.stopPropagation();
			runMenu(thread, 'Копировать ID ветки');
			closeMenu();
		};
		menu.appendChild(copyId);
		document.body.append(backdrop, menu);
	}
	function addSubmenu(menu, label, options, thread, selected) {
		const item = document.createElement('div');
		item.className = 'ft-sub-item';
		const button = menuButton(label);
		const caret = document.createElement('span');
		caret.className = 'ft-caret';
		caret.textContent = '›';
		button.appendChild(caret);
		const sub = document.createElement('div');
		sub.className = 'ContextMenu.module__contextMenu___SC1OQU ft-sub';
		if (selected !== false) sub.dataset.ftNotify = '1';
		sub.setAttribute('role', 'menu');
		sub.style.position = 'fixed';
		sub.style.zIndex = '2001';
		options.forEach(function (option) {
			const choice = menuButton(option[0]);
			if (selected !== false) {
				const mark = document.createElement('span');
				mark.className = 'ft-radio' + (selected === option[0] ? ' on' : '');
				choice.appendChild(mark);
			}
			choice.onclick = function (event) {
				event.stopPropagation();
				if (option[1] && option[1].kind === 'notify') {
					if (!notifySnapshot) notifySnapshot = {guild: '', overrides: {}};
					const level = option[1].label === 'Только упоминания' ? 1 : option[1].label === 'Ничего' ? 2 : 0;
					notifySnapshot.overrides[String(thread.fluxer_channel_id)] = level;
				}
				driveChannelSetting(thread, option[1]);
			};
			sub.appendChild(choice);
		});
		item.appendChild(button);
		menu.appendChild(item);
		document.body.appendChild(sub);
		const place = function () {
			const rect = button.getBoundingClientRect();
			sub.style.display = 'block';
			const width = sub.offsetWidth || 220;
			let left = rect.right - 8;
			if (left + width > window.innerWidth - 8) left = Math.max(8, rect.left - width + 8);
			sub.style.left = left + 'px';
			sub.style.top = Math.max(8, rect.top - 6) + 'px';
		};
		const hide = function () { sub.style.display = 'none'; };
		item.addEventListener('mouseenter', place);
		item.addEventListener('mouseleave', function (event) {
			if (event.relatedTarget && sub.contains(event.relatedTarget)) return;
			hide();
		});
		sub.addEventListener('mouseleave', function (event) {
			if (event.relatedTarget && item.contains(event.relatedTarget)) return;
			hide();
		});
	}
	function runMenu(thread, label) {
		if (label === 'Покинуть ветку') {
			const parent = thread.parent_id;
			const viewing = currentThread() && currentThread().id === thread.id;
			api('/channels/' + thread.id + '/thread-members/@me', {method: 'DELETE'}).then(function (body) {
				if (viewing && parent) openReal(parent);
				if (body && body.deleted && body.fluxer_channel_id) {
					return api('/channels/' + body.fluxer_channel_id, {method: 'DELETE'}).catch(function () { return null; });
				}
			}).then(function () { return load(parent || parentChannelId()); }).then(paint);
		}
		if (label === 'Закрыть ветку') {
			const parent = thread.parent_id;
			const viewing = currentThread() && currentThread().id === thread.id;
			api('/channels/' + thread.id, {method: 'PATCH', body: JSON.stringify({archived: true, locked: true})}).then(function () {
				if (viewing && parent) openReal(parent);
				return load(parent || parentChannelId());
			}).then(paint);
		}
		if (label === 'Редактировать ветку') openSettings(thread);
		if (label === 'Копировать ссылку') navigator.clipboard.writeText(location.origin + '/channels/' + guildId() + '/' + state.channelId + '/' + thread.id);
		if (label === 'Копировать ID ветки') navigator.clipboard.writeText(thread.id);
	}
	function openSettings(thread) {
		const root = document.createElement('div');
		root.className = 'ft-settings';
		const art = '<svg class="ft-art" width="180" height="120" viewBox="0 0 180 120" aria-hidden="true"><rect x="18" y="62" width="70" height="40" rx="8" fill="#4e5058"/><circle cx="40" cy="82" r="8" fill="#2b2d31"/><circle cx="62" cy="82" r="8" fill="#2b2d31"/><rect x="30" y="54" width="46" height="8" rx="2" fill="#6d6f78"/><circle cx="118" cy="48" r="22" fill="none" stroke="#4e5058" stroke-width="8"/><circle cx="118" cy="48" r="8" fill="#4e5058"/><path d="M132 62l22 22" stroke="#4e5058" stroke-width="8" stroke-linecap="round"/></svg>';
		root.innerHTML = '<div class="Modal.module__backdropCentered___Sm85TU" data-cancel style="position:absolute;inset:0"></div><div class="Modal.module__root___alItM0 ft-settings-window"><div class="SettingsModalLayout.module__container___SkNUdm"><div class="SettingsModalLayout.module__desktopSidebar___SkNUdm"><div class="SettingsModalLayout.module__desktopSidebarInner___SkNUdm"><div class="GuildSettingsModal.module__sidebarHeader___LVpJWW"><div class="GuildSettingsModal.module__channelNameWithIcon___LVpJWW ft-settings-name">' + spool + '<span class="GuildSettingsModal.module__channelNameText___LVpJWW"></span></div></div><div class="SettingsModalLayout.module__sidebarItem___SkNUdm SettingsModalLayout.module__sidebarItemSelected___SkNUdm"><span class="SettingsModalLayout.module__sidebarItemLabel___SkNUdm">Обзор</span></div></div></div><form class="SettingsModalLayout.module__desktopContent___SkNUdm"><div class="SettingsModalLayout.module__desktopHeader___SkNUdm"><div class="SettingsModalHeader.module__title___bTU5Mn">Обзор</div><button type="button" class="ft-settings-close" data-cancel aria-label="Закрыть"><b>×</b><span>ESC</span></button></div><div class="SettingsModalLayout.module__desktopScroll___SkNUdm"><div class="ft-settings-fields"><label>Название ветки<input name="name" maxlength="100" /></label><label>Медленный режим<select name="slow"><option value="0">Выкл</option><option value="5">5 секунд</option><option value="10">10 секунд</option><option value="30">30 секунд</option><option value="60">1 минута</option><option value="300">5 минут</option></select></label><p class="ft-hint">Участники не смогут отправлять больше одного сообщения в течение этого периода времени, кроме случаев, когда у них есть право обходить медленный режим.</p><label>Скрыть после неактивности<select name="hide"><option value="60">1 час</option><option value="1440">24 часа</option><option value="4320">3 дня</option><option value="10080" selected>1 неделя</option></select></label><p class="ft-hint">Ветки перестанут отображаться в списке каналов после заданного периода неактивности.</p><div class="ft-switch-row"><div><strong>Канал со спойлерами</strong><p class="ft-hint">Пометьте этот канал как содержащий спойлеры, чтобы сюжетные повороты, а также темы и обсуждения чувствительного характера были скрыты, пока пользователи не захотят их посмотреть.</p></div><label class="ft-switch"><input name="spoiler" type="checkbox" /><span></span></label></div><div class="ft-actions"><button class="ft-primary" type="submit">Сохранить изменения</button></div>' + art + '</div></div></form></div></div>';
		root.querySelector('[class*="channelNameText"]').textContent = thread.name;
		root.querySelector('[name=name]').value = thread.name;
		if (thread.spoiler) root.querySelector('[name=spoiler]').checked = true;
		root.querySelectorAll('[data-cancel]').forEach(function (node) {
			node.onclick = function (event) { event.preventDefault(); root.remove(); };
		});
		root.querySelector('form').onsubmit = function (event) {
			event.preventDefault();
			const data = new FormData(event.target);
			api('/channels/' + thread.id, {
				method: 'PATCH',
				body: JSON.stringify({
					name: data.get('name'),
					rate_limit_per_user: Number(data.get('slow')),
					auto_archive_duration: Number(data.get('hide')),
					spoiler: data.get('spoiler') === 'on',
				}),
			}).then(function () { root.remove(); return load(thread.parent_id || parentChannelId()); }).then(paint).catch(function (error) { console.error(error); });
		};
		document.body.appendChild(root);
	}
	function openModal(channelId, messageId, preview) {
		state.pendingMessage = messageId || null;
		openColumn(channelId, preview || '');
	}
	function applyThreads(threads) {
		state.channelId = channelFromPath();
		state.threads = threads;
		remember(threads);
		rememberHiddenChannels();
		sidebarSig = '';
		hideThreadChannels();
		paintSidebar();
		const open = currentThread();
		if (open && open.spoiler && !spoilerSeen(open.id) && !document.getElementById('ft-spoiler')) {
			openSpoilerWarning(open, function () {});
		}
		const legacyId = pathIds().thread;
		if (!legacyId) return;
		const thread = threads.find(function (item) { return item.id === legacyId; });
		if (thread) showThread(thread);
	}
	function refresh() {
		const ids = pathIds();
		state.channelId = ids.channel;
		if (!state.threads.length) state.threads = remembered();
		paintSidebar();
		if (!ids.channel || !ids.guild || ids.guild === '@me' || !token()) return;
		api('/guilds/' + ids.guild + '/threads/active').then(function (body) {
			applyThreads((body && body.threads) || []);
		}).catch(function (error) { console.error(error); });
	}
	function prefetchNotify() {
		if (notifySnapshot) return;
		if (!token() || !channelClickTarget(pathIds().channel)) {
			prefetchNotify.tries = (prefetchNotify.tries || 0) + 1;
			if (prefetchNotify.tries < 20) setTimeout(prefetchNotify, 500);
			return;
		}
		refreshNotifySnapshot(function () {
			if (!notifySnapshot) {
				prefetchNotify.tries = (prefetchNotify.tries || 0) + 1;
				if (prefetchNotify.tries < 8) setTimeout(prefetchNotify, 1200);
				return;
			}
			const menu = document.getElementById('ft-menu');
			if (!menu) return;
			const thread = state.threads.find(function (item) { return item.id === menu.dataset.threadId; });
			if (thread) showNotifyChoice(notifyChoice(thread));
		});
	}
	state.threads = remembered();
	state.channelId = channelFromPath();
	refresh();
	setTimeout(prefetchNotify, 800);
	ensureHeaderButton();
	let memberSeen = {threadId: '', keys: new Set()};
	function syncMentionedMembers() {
		const thread = currentThread();
		if (!thread) {
			memberSeen = {threadId: '', keys: new Set()};
			return;
		}
		const area = document.querySelector('[data-flx="channel.channel-chat-layout.messages-area"]');
		const keys = area ? [...area.querySelectorAll('[role="article"]')].map(function (article) {
			return article.getAttribute('data-message-id') || article.getAttribute('aria-label') || '';
		}).filter(Boolean) : [];
		if (memberSeen.threadId !== thread.id) {
			memberSeen = {threadId: thread.id, keys: new Set(keys)};
			return;
		}
		const added = keys.some(function (key) { return !memberSeen.keys.has(key); });
		keys.forEach(function (key) { memberSeen.keys.add(key); });
		if (!added) return;
		const threadId = thread.id;
		api('/channels/' + threadId + '/thread-members').then(function (members) {
			const set = new Set((members || []).map(function (member) { return String(member.user_id); }));
			memberIds.set(threadId, set);
			memberLoading.delete(threadId);
			if (!currentThread() || currentThread().id !== threadId) return;
			layoutMembers(set);
		}).catch(function () {});
	}
	let seenChannel = pathIds().channel;
	new MutationObserver(function (records) {
		if (records.length && records.every(function (record) {
			const node = record.target.nodeType === 1 ? record.target : record.target.parentElement;
			return node && node.closest && node.closest('#ft-log');
		})) return;
		const ids = pathIds();
		if (ids.channel !== seenChannel) {
			seenChannel = ids.channel;
			sidebarSig = '';
			releaseColumn();
			document.getElementById('ft-panel')?.remove();
			document.getElementById('ft-log')?.remove();
			refresh();
		}
		ensureHeaderButton();
		hideThreadChannels();
		paintSidebar();
		paintMembers();
		syncMentionedMembers();
		placeColumn();
	}).observe(document.documentElement, {childList: true, subtree: true});
	addEventListener('popstate', function () {
		sidebarSig = '';
		document.getElementById('ft-log')?.remove();
		refresh();
	});
	document.addEventListener('contextmenu', function (event) {
		const row = event.target.closest && event.target.closest('.ft-side');
		if (!row) return;
		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
		const thread = state.threads.find(function (item) { return item.id === row.dataset.threadId; });
		if (thread) openMenu(thread, event.clientX, event.clientY);
	}, true);
	document.addEventListener('keydown', function (event) {
		if (event.key === 'Escape') {
			document.querySelector('.ft-settings [data-cancel]')?.click();
			const warning = document.getElementById('ft-spoiler');
			if (warning) warning.querySelector('[data-cancel]')?.click();
			return;
		}
		if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
		const column = document.getElementById('ft-col');
		if (column && event.target.closest) {
			if (event.target.closest('#ft-col')) return;
			const composer = event.target.closest('[class*="composerEditable"]');
			if (composer) {
				const draft = (composer.innerText || '').replace(/\u00a0/g, ' ').trim();
				if (!draft) return;
				event.preventDefault();
				event.stopPropagation();
				event.stopImmediatePropagation();
				column.querySelector('[name=message]').value = draft;
				composer.textContent = '';
				submitColumn(column, (currentThread() && currentThread().parent_id) || pathIds().channel);
				return;
			}
		}
	}, true);
	document.addEventListener('click', function (event) {
		const thread = currentThread();
		if (thread && event.target.closest && event.target.closest('[data-flx^="channel.channel-header.channel-name"]')) {
			event.preventDefault();
			event.stopPropagation();
			openReal(thread.parent_id);
			return;
		}
		if (!document.documentElement.classList.contains('ft-driving') && !event.target.closest('#ft-menu') && !event.target.closest('.ft-sub') && !event.target.closest('.ft-side')) {
			closeMenu();
		}
		if (document.getElementById('ft-panel') && !event.target.closest('#ft-panel') && !event.target.closest('#ft-spool')) {
			document.getElementById('ft-panel')?.remove();
		}
	}, true);
	return {
		labelFor: function (message) {
			const messageId = message && message.id;
			const existing = state.threads.find(function (thread) { return String(thread.parent_message_id) === String(messageId); });
			return existing ? 'Join thread' : 'Start new thread';
		},
		openMessage: function (message) {
			const channelId = message && (message.channelId || message.channel_id);
			const messageId = message && message.id;
			if (!channelId || !messageId) return;
			load(channelId).then(function () {
				const existing = state.threads.find(function (thread) { return String(thread.parent_message_id) === String(messageId); });
				if (existing) {
					go(channelId, existing.id);
					return;
				}
				const preview = typeof message.content === 'string' ? message.content.slice(0, 180) : '';
				openModal(channelId, messageId, preview);
			}).catch(function (error) { console.error(error); });
		},
	};
})();
