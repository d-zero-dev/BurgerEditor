import type { AppType } from '../route.js';

import { hc } from 'hono/client';

const client = hc<AppType>(location.origin);

type Navigate = (url: string) => void;

const defaultNavigate: Navigate = (url) => {
	globalThis.location.href = url;
};

/**
 * Wires up the "new file" dialog. Behaviour depends on whether the server is
 * running in virtualTree mode — that flag is rendered into the DOM by the SSR
 * layer (see `view/app.tsx`) so we don't pay an extra fetch on every page.
 *
 * `navigate` is exposed for tests; in production we just assign to
 * `globalThis.location.href`.
 * @param navigate
 */
export function newFile(navigate: Navigate = defaultNavigate): void {
	const form = document.getElementById('new-file-form');
	if (!form) {
		return;
	}

	const flagEl = document.getElementById(
		'virtual-tree-enabled',
	) as HTMLInputElement | null;
	const virtualTreeEnabled = flagEl?.value === 'true';

	form.addEventListener('submit', async (e) => {
		e.preventDefault();

		const formData = new FormData(e.currentTarget as HTMLFormElement);
		const pathData = formData.get('path');
		const path = typeof pathData === 'string' ? pathData : await pathData?.text();

		let savePath = path?.trim().replaceAll(/^\/|\.\.\//g, '') ?? '';

		if (savePath === '') {
			return;
		}

		if (!savePath.endsWith('.html')) {
			savePath += '.html';
		}

		if (virtualTreeEnabled) {
			const idData = formData.get('id');
			const id = typeof idData === 'string' ? idData.trim() : '';
			if (id === '') {
				alert('File ID is required when virtualTree is enabled.');
				return;
			}
			const res = await client.api.content.create.$post({
				json: { id, path: savePath },
			});
			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as {
					error?: string;
				};

				alert(body.error ?? `Failed to create file (status ${res.status})`);
				return;
			}
		}

		navigate(`/${savePath}`);
	});
}
