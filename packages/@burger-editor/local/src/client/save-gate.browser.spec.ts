import { BurgerEditorEngine } from '@burger-editor/core';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createSaveGate } from './save-gate.js';

/**
 * @param text
 */
function blockHtml(text: string): string {
	return `<div data-bge-name="text" data-bge-container="grid:1"><div data-bge-container-frame=""><div data-bge-group=""><div data-bge-item=""><div data-bgi="wysiwyg" data-bgi-ver="1.0.0"><div data-bge="wysiwyg"><p>${text}</p></div></div></div></div></div></div>`;
}

/**
 * Open `initialContents` in a real engine wired the way `create-editor.ts`
 * wires it: every `onUpdated` goes through the gate, and `ready()` is
 * called once `BurgerEditorEngine.new` has resolved.
 * @param initialContents
 */
async function open(initialContents: string) {
	const gate = createSaveGate({ isNewFile: false });
	const posted: string[] = [];
	let current = initialContents;
	const engine = await BurgerEditorEngine.new({
		root: '#engine-root',
		config: {
			classList: [],
			stylesheets: [],
			sampleImagePath: '/img/sample.png',
			sampleFilePath: '/pdf/sample.pdf',
			googleMapsApiKey: null,
		},
		items: {
			wysiwyg: {
				name: 'wysiwyg',
				version: '1.0.0',
				template: '<div data-bge="wysiwyg"><p></p></div>',
				style: '',
			},
		},
		catalog: {},
		generalCSS: '',
		initialContents,
		onUpdated(content) {
			const previous = current;
			current = content;
			if (gate.shouldPost(previous, content)) {
				posted.push(content);
			}
		},
	});
	gate.ready();
	engines.push(engine);
	return { engine, gate, posted };
}

const engines: BurgerEditorEngine[] = [];

beforeEach(() => {
	document.body.innerHTML = '<div id="engine-root"></div>';
});

afterEach(() => {
	for (const engine of engines.splice(0)) {
		engine[Symbol.dispose]();
	}
});

describe('createSaveGate against a real BurgerEditorEngine', () => {
	test('the save the engine runs while it initializes is not posted', async () => {
		const { posted } = await open('<p>raw</p>');

		expect(posted).toEqual([]);
	});

	test('raw HTML wrapped into a block on open is kept as normalizedOnOpen', async () => {
		const { engine, gate } = await open('<p>raw</p>');

		expect(engine.getLiveBlocks()).toHaveLength(1);
		expect(gate.normalizedOnOpen).toBe(engine.content.getContentsAsString());
	});

	test('a formatted, multi-line page of blocks is not reported as normalized', async () => {
		const { gate } = await open(`\n\t${blockHtml('alpha')}\n\t${blockHtml('bravo')}\n`);

		expect(gate.normalizedOnOpen).toBeUndefined();
	});

	test('a save after the engine has initialized is posted', async () => {
		const { engine, posted } = await open(blockHtml('alpha'));

		await engine.commitSourceEdit('main', `${blockHtml('alpha')}${blockHtml('bravo')}`);

		expect(posted).toHaveLength(1);
		expect(posted[0]).toContain('<p>bravo</p>');
	});
});
