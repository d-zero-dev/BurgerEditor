import type { AppType } from '../route.js';

import { generalCSS, items } from '@burger-editor/blocks';
import { createBurgerEditorClient } from '@burger-editor/client';
import {
	createFrontMatterEditor,
	type FrontMatterEditorHandle,
} from '@burger-editor/client/ui';
import {
	CSS_LAYER,
	type BlockCatalog,
	type FileListItem,
	type FileListResult,
	type FileType,
} from '@burger-editor/core';
import '@burger-editor/client/style';
import { hc } from 'hono/client';

import { $upload } from '../helpers/$upload.js';

import { createAgentLink, type AgentLink } from './agent-link.js';
import { createEngineAdapter } from './engine-adapter.js';
import { saveContentRequest } from './save-content-request.js';
import { createWsTransport } from './ws-transport.js';

const client = hc<AppType>(location.origin);

/** Default debounce delay for Front Matter save (ms) */
const FRONT_MATTER_SAVE_DEBOUNCE_DELAY = 500;

/**
 * Create a debounced function
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 */
function debounce<T extends (...args: Parameters<T>) => void>(
	fn: T,
	delay: number,
): (...args: Parameters<T>) => void {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	return (...args: Parameters<T>) => {
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
		}
		timeoutId = setTimeout(() => {
			fn(...args);
			timeoutId = null;
		}, delay);
	};
}

/**
 *
 */
export async function createEditor() {
	const configRes = await client['config.json'].$get();
	const config = await configRes.json();

	if (__DEBUG__) {
		// eslint-disable-next-line no-console
		console.log('config', config);
	}

	const mainInput = document.getElementById('main') as HTMLInputElement | null;

	if (mainInput === null) {
		// eslint-disable-next-line no-console
		console.warn('Editable area not found');
		return;
	}

	// Initialize Front Matter editor
	const frontMatterContainer =
		document.querySelector<HTMLElement>('.front-matter-editor');
	const frontMatterInput = document.getElementById(
		'front-matter',
	) as HTMLInputElement | null;
	const hasFrontMatterInput = document.getElementById(
		'has-front-matter',
	) as HTMLInputElement | null;

	let frontMatterEditor: FrontMatterEditorHandle | null = null;
	let agentLink: AgentLink | null = null;

	/**
	 * Save content to server
	 * @param content
	 * @param frontMatterData
	 * @param originalFrontMatter
	 */
	async function saveContent(
		content: string,
		frontMatterData?: Record<string, unknown>,
		originalFrontMatter?: string,
	) {
		await saveContentRequest(
			client.api.content.$post,
			{
				path: location.pathname,
				content,
				frontMatter: frontMatterData,
				originalFrontMatter,
			},
			{
				// eslint-disable-next-line no-console
				info: (message) => console.log(message),
				// eslint-disable-next-line no-console
				error: (message) => console.error(message),
			},
		);
		agentLink?.notifyHumanSave();
	}

	/**
	 * Debounced save for Front Matter changes
	 */
	const debouncedSaveFrontMatter = debounce(() => {
		if (!frontMatterEditor) {
			return;
		}
		const content = mainInput.value;
		const frontMatterData = frontMatterEditor.getData();
		const originalFrontMatter = frontMatterEditor.getOriginalFrontMatter();
		void saveContent(content, frontMatterData, originalFrontMatter);
	}, FRONT_MATTER_SAVE_DEBOUNCE_DELAY);

	if (frontMatterContainer && frontMatterInput) {
		const initialData = JSON.parse(frontMatterInput.value || '{}') as Record<
			string,
			unknown
		>;
		const hasFrontMatter = hasFrontMatterInput?.value === 'true';

		frontMatterEditor = createFrontMatterEditor({
			container: frontMatterContainer,
			initialData,
			hasFrontMatter,
			onUpdated: debouncedSaveFrontMatter,
		});

		if (__DEBUG__) {
			// eslint-disable-next-line no-console
			console.log('Front Matter editor initialized:', {
				initialData,
				hasFrontMatter,
			});
		}
	}

	const catalog: BlockCatalog = config.enableImportBlock
		? {
				...config.catalog,
				import: [
					{
						label: 'インポート',
						definition: {
							name: 'import',
							containerProps: {
								type: 'inline',
								immutable: true,
							},
							items: [['import']],
						},
					},
				],
			}
		: config.catalog;

	const { engine } = await createBurgerEditorClient({
		root: '.editor',
		config: {
			...config,
			stylesheets: [
				{
					path: '/client.css',
					layer: CSS_LAYER.ui,
				},
				...config.stylesheets.map((stylesheet) => ({
					path: stylesheet,
				})),
			],
		},
		items,
		catalog,
		initialContents: mainInput.value,
		generalCSS,
		healthCheck: config.healthCheck
			? {
					...config.healthCheck,
					async checkHealth() {
						const response = await client.api.health.$get().catch((error) => error);
						if (response instanceof Error) {
							return false;
						}
						return response.ok;
					},
				}
			: undefined,
		async onUpdated(content) {
			// A browser-applied `BlockOp` already reflects the new content into
			// `mainInput`/the server (`applyOp` → `engine.save()` → this
			// `onUpdated` firing synchronously) — re-POSTing it here would be a
			// redundant, and possibly stale, echo of what `agent/route.ts`
			// already persisted from the tab's `ack`.
			if (agentLink?.consumeEcho()) {
				mainInput.value = content;
				return;
			}

			if (mainInput.value === content) {
				return;
			}

			mainInput.value = content;

			// Prepare Front Matter data if editor exists
			const frontMatterData = frontMatterEditor?.getData();
			const originalFrontMatter = frontMatterEditor?.getOriginalFrontMatter();

			await saveContent(content, frontMatterData, originalFrontMatter);
		},
		fileIO: {
			async getFileList(fileType, options) {
				const res = await client.api.file.list.$post({
					json: {
						type: fileType,
						filter: options.filter,
						page: options.page,
						selected: options.selected,
					},
				});
				if (!res.ok) {
					throw new Error(`Failed to get file list: ${res.statusText}`);
				}
				return await res.json();
			},
			async postFile(fileType, file, progress) {
				const res = await $upload<
					{ type: FileType; file: File },
					{
						readonly error: boolean;
						readonly uploaded: FileListItem;
						readonly result: FileListResult;
					}
				>(client.api.file.upload)(
					{
						type: fileType,
						file,
					},
					progress,
				);
				return res;
			},
			async deleteFile(fileType, url) {
				const res = await client.api.file.$delete({
					json: {
						type: fileType,
						url,
					},
				});
				if (!res.ok) {
					throw new Error(`Failed to delete file: ${res.statusText}`);
				}
				return await res.json();
			},
		},
	});

	// Absent when `agent.enabled` is `false` (`view/app.tsx` only renders
	// `#server-session` in that case) — no WS connection, no AgentLink.
	const serverSessionInput = document.getElementById(
		'server-session',
	) as HTMLInputElement | null;
	if (serverSessionInput) {
		const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
		const wsUrl = `${wsProtocol}//${location.host}/ws/editor`;
		// eslint-disable-next-line no-console
		console.log('[bge-agent-link] wiring up', { wsUrl, page: location.pathname });
		const transport = createWsTransport({
			url: wsUrl,
			onMessage: (raw) => agentLink?.handleMessage(raw),
			onOpen: () => agentLink?.handleOpen(),
		});
		agentLink = createAgentLink({
			adapter: createEngineAdapter(engine),
			transport,
			page: location.pathname,
			serverSession: serverSessionInput.value,
		});
		engine.el.addEventListener('bge:server-online', () => transport.reconnectNow());
	} else {
		// eslint-disable-next-line no-console
		console.log(
			'[bge-agent-link] #server-session not found — agent.enabled is false, skipping WS wiring',
		);
	}
}
