import { expect, test } from 'vitest';

import { applyBlockOptions } from './apply-block-options.js';
import { BurgerBlock } from './block.js';

/**
 * `BurgerBlock.rebind` が受け付ける最小構造のブロック要素を組み立てる
 * @param frameSemantics - コンテナフレームのタグ名（div/ul/ol）
 */
async function createBlock(frameSemantics: 'div' | 'ul' | 'ol' = 'div') {
	const frameTag = frameSemantics;
	const groupTag = frameSemantics === 'div' ? 'div' : 'li';
	const el = document.createElement('div');
	el.dataset.bgeName = 'text';
	el.dataset.bgeContainer =
		frameSemantics === 'div' ? 'grid:2' : `grid:2:${frameSemantics}`;
	el.innerHTML = `
		<${frameTag} data-bge-container-frame>
			<${groupTag} data-bge-group>
				<div data-bge-item></div>
			</${groupTag}>
		</${frameTag}>
	`;
	return await BurgerBlock.rebind(el, (itemEl) => Promise.resolve(itemEl));
}

/**
 * ダイアログフォームの submit を模した FormData を合成する
 * @param entries - `bge-options-*` の name/value ペア
 */
function createFormData(entries: Record<string, string>) {
	const formData = new FormData();
	for (const [name, value] of Object.entries(entries)) {
		formData.append(name, value);
	}
	return formData;
}

test('frameSemanticsの変更をsubmitするとタグとdata-bge-container属性の両方に反映される', async () => {
	const block = await createBlock('div');

	applyBlockOptions(
		block,
		createFormData({
			'bge-options-container-type': 'grid',
			'bge-options-columns': '2',
			'bge-options-frame-semantics': 'ul',
		}),
	);

	const frame = block.el.querySelector('[data-bge-container-frame]');
	const group = block.el.querySelector('[data-bge-group]');
	expect(frame?.tagName).toBe('UL');
	expect(group?.tagName).toBe('LI');
	// 属性文字列にも反映されること（タグだけ変わって属性が旧値のまま
	// 乖離する退行の検出）
	expect(block.exportOptions().containerProps.frameSemantics).toBe('ul');
	expect(block.el.dataset.bgeContainer).toContain('ul');
});

test('frameSemanticsが現在値と同じ場合はフレーム要素を再構築しない', async () => {
	const block = await createBlock('ul');
	const frameBefore = block.el.querySelector('[data-bge-container-frame]');

	applyBlockOptions(
		block,
		createFormData({
			'bge-options-container-type': 'grid',
			'bge-options-columns': '2',
			'bge-options-frame-semantics': 'ul',
		}),
	);

	const frameAfter = block.el.querySelector('[data-bge-container-frame]');
	expect(frameAfter).toBe(frameBefore);
	expect(block.exportOptions().containerProps.frameSemantics).toBe('ul');
});

test('フォームにframeSemanticsフィールドが無い場合は現在値を維持する', async () => {
	const block = await createBlock('ol');

	applyBlockOptions(
		block,
		createFormData({
			'bge-options-container-type': 'grid',
			'bge-options-columns': '2',
		}),
	);

	const frame = block.el.querySelector('[data-bge-container-frame]');
	expect(frame?.tagName).toBe('OL');
	expect(block.exportOptions().containerProps.frameSemantics).toBe('ol');
});

test('不正なframeSemantics値は無視して現在値を維持する', async () => {
	const block = await createBlock('div');

	applyBlockOptions(
		block,
		createFormData({
			'bge-options-container-type': 'grid',
			'bge-options-columns': '2',
			'bge-options-frame-semantics': 'span',
		}),
	);

	const frame = block.el.querySelector('[data-bge-container-frame]');
	expect(frame?.tagName).toBe('DIV');
	expect(block.exportOptions().containerProps.frameSemantics).toBe('div');
});
