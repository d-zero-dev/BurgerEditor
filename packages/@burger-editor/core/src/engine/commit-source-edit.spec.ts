import { afterEach, describe, expect, test } from 'vitest';

import { BurgerEditorEngine } from './engine.js';

/**
 * A block holding one `label` item with the given inner HTML.
 * @param inner
 */
function block(inner: string) {
	return `<div data-bge-name="label" data-bge-container="grid:1"><div data-bge-container-frame=""><div data-bge-group=""><div data-bge-item=""><div data-bgi="label" data-bgi-ver="1.0.0">${inner}</div></div></div></div></div>`;
}

let engine: BurgerEditorEngine | undefined;

afterEach(() => {
	engine?.[Symbol.dispose]();
	engine = undefined;
	document.body.innerHTML = '';
});

/**
 * An engine whose `label` item fills an empty label in `normalizeItemData`.
 */
async function createEngine() {
	document.body.innerHTML = '<div id="engine-root"></div>';
	engine = await BurgerEditorEngine.new({
		root: '#engine-root',
		config: {
			classList: [],
			stylesheets: [],
			sampleImagePath: '',
			sampleFilePath: '',
			googleMapsApiKey: null,
		},
		items: {
			label: {
				name: 'label',
				version: '1.0.0',
				template: '<p data-bge="label"></p>',
				style: '',
				normalizeItemData: (data: Record<string, unknown>) =>
					data['label'] ? data : { ...data, label: 'filled' },
			},
		},
		catalog: {},
		generalCSS: '',
		initialContents: block('<p data-bge="label">initial</p>'),
	});
	return engine;
}

describe('BurgerEditorEngine.commitSourceEdit', () => {
	test("applies each item's normalizeItemData to HTML written in source mode", async () => {
		const engine = await createEngine();

		await engine.commitSourceEdit('main', block('<p data-bge="label"></p>'));

		expect(engine.content.getContentsAsString()).toContain('>filled</p>');
	});

	test('leaves the markup of an item that needs no normalization as it was written', async () => {
		const engine = await createEngine();
		const written = '<p data-bge="label" class="as-written">kept</p>';

		await engine.commitSourceEdit('main', block(written));

		expect(engine.content.getContentsAsString()).toContain(written);
	});
});
