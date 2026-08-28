import type { CliContext } from '../../context.js';
import type { BlockCatalog } from '@burger-editor/core';
import type { BurgerEditorConfig } from '@burger-editor/file-io';

import fs from 'node:fs/promises';
import path from 'node:path';

import { defaultCatalog } from '@burger-editor/blocks';
import { mkdtempDisposable } from '@d-zero/shared/mkdtemp-disposable';

export const EDITABLE_AREA = '.content';

/** Fragment-style page with two blocks under `.content` — mirrors handlers.spec.ts's fixture. */
export function samplePageHtml(): string {
	return `---
title: 'Test Page'
---
<div class="content">
	<div data-bge-name="h2" data-bge-container="inline:immutable">
		<div data-bge-container-frame>
			<div data-bge-group>
				<div data-bge-item>
					<div data-bgi="title-h2" data-bgi-ver="0.0.0"><h2 data-bge="title-h2">最初の見出し</h2></div>
				</div>
			</div>
		</div>
	</div>
	<div data-bge-name="wysiwyg" data-bge-container="grid:1">
		<div data-bge-container-frame>
			<div data-bge-group>
				<div data-bge-item>
					<div data-bgi="wysiwyg" data-bgi-ver="0.0.0"><div data-bge="wysiwyg"><p>本文1</p></div></div>
				</div>
			</div>
		</div>
	</div>
</div>`;
}

/**
 * @param documentRoot
 * @param assetsRoot
 * @param overrides
 */
export function makeConfig(
	documentRoot: string,
	assetsRoot: string,
	overrides: Partial<BurgerEditorConfig> = {},
): BurgerEditorConfig {
	const catalog: BlockCatalog = overrides.catalog ?? defaultCatalog;
	return {
		version: 'test',
		port: 0,
		host: 'localhost',
		documentRoot,
		assetsRoot,
		lang: 'en',
		stylesheets: [],
		classList: [],
		editableArea: EDITABLE_AREA,
		indexFileName: 'index.html',
		filesDir: {
			image: { serverPath: assetsRoot, clientPath: '/' },
			pdf: { serverPath: assetsRoot, clientPath: '/' },
			video: { serverPath: assetsRoot, clientPath: '/' },
			audio: { serverPath: assetsRoot, clientPath: '/' },
			other: { serverPath: assetsRoot, clientPath: '/' },
		},
		sampleImagePath: '/sample.png',
		sampleFilePath: '/sample.pdf',
		googleMapsApiKey: null,
		open: false,
		newFileContent: `---
title: 'New Page'
---
<div class="content"></div>`,
		catalog,
		enableImportBlock: false,
		healthCheck: { enabled: false, interval: 0, retryCount: 0 },
		virtualTree: { enabled: false, pathKey: 'path' },
		...overrides,
	};
}

export interface AgentToolFixture {
	readonly tmp: { readonly path: string } & AsyncDisposable;
	readonly docRoot: string;
	readonly assetsRoot: string;
	readonly ctx: CliContext;
}

/** Build a fresh documentRoot with `about.html` (the standard 2-block fixture) and a CliContext. */
export async function makeFixture(): Promise<AgentToolFixture> {
	const tmp = await mkdtempDisposable('bge-agent-tools-');
	const docRoot = path.join(tmp.path, 'src');
	const assetsRoot = path.join(tmp.path, 'public');
	await fs.mkdir(docRoot, { recursive: true });
	await fs.mkdir(assetsRoot, { recursive: true });
	await fs.writeFile(path.join(docRoot, 'about.html'), samplePageHtml(), 'utf8');
	const ctx: CliContext = {
		config: makeConfig(docRoot, assetsRoot),
		configPath: null,
		resolverState: null,
		invalidPages: [],
	};
	return { tmp, docRoot, assetsRoot, ctx };
}
