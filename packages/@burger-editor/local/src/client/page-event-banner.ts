import type { PageEventMessage } from '../protocol/ws-messages.js';

import { normalizeLogicalPath } from '../helpers/normalize-logical-path.js';

const BANNER_ID = 'bge-page-event-banner';
const DISMISS_COMMAND = '--dismiss';
const AUTO_DISMISS_MS = 8000;

export interface PageGoneMessage {
	readonly kind: 'deleted' | 'renamed';
	readonly to?: string;
}

/**
 * Decide whether a `page-event` frame is about the page THIS tab currently
 * has open (deleted, or renamed away from it) — pulled out of
 * `create-editor.ts`'s `onPageEvent` wiring as a pure function so the
 * decision itself (as opposed to the DOM/engine glue around it) has direct
 * unit tests. Returns `null` for `created` (nothing of "this page" to
 * compare), a `from` that didn't survive normalizing to a string, or a
 * `from` that normalizes to a different page than `currentPage`.
 * @param message
 * @param currentPage Already normalized the same way `create-editor.ts`
 *   normalizes `location.pathname` before comparing.
 * @param indexFileName
 */
export function pageGoneBannerFor(
	message: PageEventMessage,
	currentPage: string,
	indexFileName: string,
): PageGoneMessage | null {
	if (message.kind === 'created' || !message.from) {
		return null;
	}
	if (normalizeLogicalPath(message.from, indexFileName) !== currentPage) {
		return null;
	}
	return { kind: message.kind, to: message.to };
}

/**
 * Non-blocking notice that the page currently open was deleted or renamed by
 * another process (an agent tool call, another disk-mode `bge` instance) —
 * `create-editor.ts` shows this instead of the WS `page-event` handler
 * silently doing nothing, and deliberately not `alert()`, which would block
 * the tab on a modal the user didn't ask for. No existing toast/banner
 * component exists elsewhere in this package to reuse (checked
 * `client/` and `@burger-editor/client`'s components), so this is a
 * minimal, self-contained one: a single dismissible, auto-expiring div.
 * @param message
 */
export function showPageGoneBanner(message: PageGoneMessage): void {
	document.getElementById(BANNER_ID)?.remove();

	const banner = document.createElement('div');
	banner.id = BANNER_ID;
	banner.setAttribute('role', 'status');
	Object.assign(banner.style, {
		position: 'fixed',
		top: '1rem',
		right: '1rem',
		zIndex: '9999',
		display: 'flex',
		alignItems: 'center',
		gap: '0.75rem',
		padding: '0.75rem 1rem',
		borderRadius: '4px',
		background: '#333',
		color: '#fff',
		fontSize: '0.875rem',
		boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
	});

	const text = document.createElement('span');
	text.textContent =
		message.kind === 'deleted'
			? 'This page was deleted elsewhere.'
			: `This page was renamed elsewhere${message.to ? ` (now ${message.to})` : ''}.`;
	banner.append(text);

	const dismiss = document.createElement('button');
	dismiss.type = 'button';
	dismiss.textContent = '×';
	dismiss.setAttribute('aria-label', 'Dismiss');
	// Invoker Commands API instead of a click handler: the browser dispatches
	// `command` on the `commandfor` target (`banner`, listened for below), not
	// on this button — see `command-event.d.ts`'s ambient typing.
	dismiss.setAttribute('command', DISMISS_COMMAND);
	dismiss.setAttribute('commandfor', BANNER_ID);
	Object.assign(dismiss.style, {
		background: 'transparent',
		border: 'none',
		color: 'inherit',
		cursor: 'pointer',
		fontSize: '1rem',
		lineHeight: '1',
		padding: '0',
	});
	banner.append(dismiss);

	banner.addEventListener('command', (event) => {
		if (event.command === DISMISS_COMMAND) {
			banner.remove();
		}
	});

	document.body.append(banner);
	setTimeout(() => banner.remove(), AUTO_DISMISS_MS);
}
