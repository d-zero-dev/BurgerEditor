const BANNER_ID = 'bge-save-failure-banner';
const RELOAD_COMMAND = '--reload';
const DISMISS_COMMAND = '--dismiss';

/**
 * Why a save did not reach disk:
 * - `conflict`: the page changed after this tab loaded it (another tab, the
 *   agent or another editor saved in between); writing would erase that
 * - `not-found`: the page no longer exists at this tab's path (moved or deleted elsewhere)
 * - `path-taken`: the save moves the page (virtual tree) to a path another page uses
 * - `failed`: anything else (the server is unreachable, rejected the request, …)
 */
export type SaveFailureReason = 'conflict' | 'not-found' | 'path-taken' | 'failed';

const MESSAGES: Record<SaveFailureReason, string> = {
	conflict:
		'このページは別の場所（別のタブ、エージェント、外部のエディター）で更新されています。この画面の変更は保存されていません。',
	'not-found':
		'このページは移動または削除されています。この画面の変更は保存されていません。',
	'path-taken':
		'このパスは別のページが使っています。この画面の変更は保存されていません。',
	failed: '保存できませんでした。この画面の変更は保存されていません。',
};

/**
 * Notice that a save did not reach disk. It stays until dismissed or until a
 * later save succeeds ({@link clearSaveFailureBanner}) — unlike
 * `page-event-banner.ts`'s notice, which expires — because the user must not
 * keep editing in the belief that the work is saved.
 *
 * Only a `conflict` offers "再読み込み": it opens the latest content (this
 * tab's unsaved changes are lost by design). There is deliberately no
 * "overwrite" action, which would erase the other save. Reloading would not
 * help a page that is gone or a server that is unreachable.
 * @param reason
 * @param reload - Reloads the page (`location.reload()` in the editor)
 * @example
 * ```ts
 * showSaveFailureBanner('conflict', () => location.reload());
 * ```
 */
export function showSaveFailureBanner(
	reason: SaveFailureReason,
	reload: () => void,
): void {
	clearSaveFailureBanner();

	const banner = document.createElement('div');
	banner.id = BANNER_ID;
	banner.setAttribute('role', 'alert');
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
		background: '#8a1c1c',
		color: '#fff',
		fontSize: '0.875rem',
		boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
	});

	const text = document.createElement('span');
	text.textContent = MESSAGES[reason];
	banner.append(text);

	if (reason === 'conflict') {
		const reloadButton = document.createElement('button');
		reloadButton.type = 'button';
		reloadButton.textContent = '再読み込み';
		// Invoker Commands API instead of a click handler: the browser dispatches
		// `command` on the `commandfor` target (`banner`, listened for below)
		reloadButton.setAttribute('command', RELOAD_COMMAND);
		reloadButton.setAttribute('commandfor', BANNER_ID);
		banner.append(reloadButton);
	}

	const dismiss = document.createElement('button');
	dismiss.type = 'button';
	dismiss.textContent = '×';
	dismiss.setAttribute('aria-label', '閉じる');
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
		if (event.command === RELOAD_COMMAND) {
			reload();
		} else if (event.command === DISMISS_COMMAND) {
			banner.remove();
		}
	});

	document.body.append(banner);
}

/**
 * Remove the notice {@link showSaveFailureBanner} shows — call it when a save
 * succeeds, so a failure that has since been resolved is not still reported.
 * @example
 * ```ts
 * if (saved) clearSaveFailureBanner();
 * ```
 */
export function clearSaveFailureBanner(): void {
	document.getElementById(BANNER_ID)?.remove();
}
