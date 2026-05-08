import type { Tree } from '../model/file-tree.js';
import type { AppType } from '../route.js';

import { hc } from 'hono/client';

const client = hc<AppType>(location.origin);

/**
 * Fetch the file tree JSON from the server (`GET /api/tree`) and render it
 * into the `#nav-tree-mount` placeholder produced by `view/nav.tsx`.
 *
 * The server decides whether the response represents the on-disk directory
 * tree or the logical (virtualTree) tree, so this client code is agnostic to
 * the mode. Safe to call multiple times — re-renders idempotently.
 *
 * Errors from the network or response parsing are propagated to the caller
 * (i.e. not silently swallowed) so that boot-time failures are visible.
 * @returns A promise that resolves once the tree has been rendered. Resolves
 *          with no value when the mount point is absent.
 */
export async function hydrateNavTree() {
	const mount = document.getElementById('nav-tree-mount');
	if (!mount) {
		return;
	}

	const res = await client.api.tree.$get();
	const { tree } = await res.json();

	mount.replaceChildren(buildList(tree));
}

/**
 * Build a `<ul>` DOM subtree mirroring the SSR output of `view/nav-tree.tsx`.
 *
 * In virtualTree mode each leaf carries an `id` (the on-disk filename).
 * The label is rendered as `${name} (${id-without-html})` so editors can see
 * which physical file a logical path maps to. In directory mode `id` is
 * absent and only the bare name is shown.
 * @param items the tree returned by `GET /api/tree`
 * @returns a `<ul>` element ready to be appended into the DOM
 */
function buildList(items: Tree): HTMLUListElement {
	const ul = document.createElement('ul');
	for (const item of items) {
		const li = document.createElement('li');
		if (item.name.endsWith('.html')) {
			const a = document.createElement('a');
			a.className = 'file';
			a.href = item.path;
			const nameSpan = document.createElement('span');
			nameSpan.textContent = item.name;
			a.append(nameSpan);
			if ('id' in item && typeof item.id === 'string') {
				const idSpan = document.createElement('span');
				idSpan.className = 'file-id';
				idSpan.textContent = ` (${item.id.replace(/\.html$/, '')})`;
				a.append(idSpan);
			}
			li.append(a);
		} else {
			const span = document.createElement('span');
			span.className = 'dir';
			span.textContent = item.name;
			li.append(span);
		}
		if ('files' in item) {
			li.append(buildList(item.files));
		}
		ul.append(li);
	}
	return ul;
}
