import { test, expect, beforeEach, describe } from 'vitest';

import { BurgerEditorEngine } from './engine.js';

// アイテムを持たない最小のブロック骨格（engine.spec.tsのMINIMAL_BLOCK_CONTENTと同じ形）
const MINIMAL_BLOCK_CONTENT =
	'<div data-bge-name="text" data-bge-container="grid:1"><div data-bge-container-frame=""><div data-bge-group=""><div data-bge-item=""></div></div></div></div>';

/**
 * `BurgerEditorEngine.new()`が要求する最小限のoptionsを組み立てる
 * @param overrides - root などの上書き
 */
function createOptions(
	overrides: Partial<Parameters<typeof BurgerEditorEngine.new>[0]> = {},
) {
	return {
		root: '#engine-root-a',
		config: {
			classList: [],
			stylesheets: [],
			sampleImagePath: '/img/sample.png',
			sampleFilePath: '/pdf/sample.pdf',
			googleMapsApiKey: null,
		},
		items: {},
		catalog: {},
		generalCSS: '',
		initialContents: MINIMAL_BLOCK_CONTENT,
		...overrides,
	};
}

describe('同一documentに複数エンジンを共存させる', () => {
	beforeEach(() => {
		document.body.innerHTML =
			'<div id="engine-root-a"></div><div id="engine-root-b"></div>';
	});

	test('2つのエンジンはcommandBus.receiverIdが異なり、親documentに受信要素が2つ存在する', async () => {
		const engineA = await BurgerEditorEngine.new(createOptions());
		const engineB = await BurgerEditorEngine.new(
			createOptions({ root: '#engine-root-b' }),
		);

		expect(engineA.commandBus.receiverId).not.toBe(engineB.commandBus.receiverId);
		expect(document.querySelectorAll('[id^="bge-command-bus-"]')).toHaveLength(2);

		engineA[Symbol.dispose]();
		engineB[Symbol.dispose]();
	});

	test('2つ目のエンジンのreceiverIdを指す親documentのボタンの実クリックは2つ目のbusにだけ届く', async () => {
		const engineA = await BurgerEditorEngine.new(createOptions());
		const engineB = await BurgerEditorEngine.new(
			createOptions({ root: '#engine-root-b' }),
		);

		const receivedA: string[] = [];
		const receivedB: string[] = [];
		engineA.commandBus.define('--probe', () => receivedA.push('a'));
		engineB.commandBus.define('--probe', () => receivedB.push('b'));

		document.body.insertAdjacentHTML(
			'beforeend',
			`<button type="button" command="--probe" commandfor="${engineB.commandBus.receiverId}">go</button>`,
		);
		document.querySelector('button')?.click();

		expect(receivedA).toEqual([]);
		expect(receivedB).toEqual(['b']);

		engineA[Symbol.dispose]();
		engineB[Symbol.dispose]();
	});

	test('片方をdisposeしても、もう片方の受信要素は残る', async () => {
		const engineA = await BurgerEditorEngine.new(createOptions());
		const engineB = await BurgerEditorEngine.new(
			createOptions({ root: '#engine-root-b' }),
		);

		const idA = engineA.commandBus.receiverId;
		const idB = engineB.commandBus.receiverId;

		engineA[Symbol.dispose]();

		expect(document.getElementById(idA)).toBeNull();
		expect(document.getElementById(idB)).not.toBeNull();

		engineB[Symbol.dispose]();
	});

	test('rootにHTMLElementを渡すと、その要素がengine.elになる', async () => {
		const rootElement = document.querySelector<HTMLElement>('#engine-root-b')!;
		const engine = await BurgerEditorEngine.new(createOptions({ root: rootElement }));

		expect(engine.el).toBe(rootElement);

		engine[Symbol.dispose]();
	});
});
