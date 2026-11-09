import { afterEach, describe, expect, test } from 'vitest';

import generalCSS from './general.css';

afterEach(() => {
	document.body.replaceChildren();
	document.head.querySelector('#general-style')?.remove();
});

/**
 * general.css を読み込み、グループ 2 つのブロックを置く
 * @param container - `data-bge-container` の値
 * @returns グループを並べる要素（`[data-bge-container-frame]`）
 */
function mount(container: string) {
	const style = document.createElement('style');
	style.id = 'general-style';
	style.textContent = generalCSS;
	document.head.append(style);

	const block = document.createElement('div');
	block.dataset.bgeContainer = container;
	block.innerHTML = [
		'<div data-bge-container-frame>',
		'<div data-bge-group><div data-bge-item><p>A</p></div></div>',
		'<div data-bge-group><div data-bge-item><p>B</p></div></div>',
		'</div>',
	].join('');
	document.body.append(block);

	return block.querySelector<HTMLElement>('[data-bge-container-frame]')!;
}

/**
 * 1 グループにアイテムを並べたグリッドブロックを置く。
 *
 * 親は子の個数を CSS で読めない。`sibling-count()` は自分の兄弟の数であり、
 * `children-count()`（`grid-row: span children-count()`。
 * https://github.com/w3c/csswg-drafts/issues/11068 ）は提案のままなので、
 * それが使えるまでは 2〜8 個を `:nth-child` で span し、9 個以上は subgrid を
 * やめてグループ内で縦に積む。
 * @param itemCount - グループ内のアイテム数
 * @returns グループ要素
 */
function mountGridGroup(itemCount: number) {
	const style = document.createElement('style');
	style.id = 'general-style';
	style.textContent = generalCSS;
	document.head.append(style);

	const items = Array.from(
		{ length: itemCount },
		(_, index) => `<div data-bge-item><p>${index + 1}</p></div>`,
	).join('');

	const block = document.createElement('div');
	block.dataset.bgeContainer = 'grid:1';
	block.innerHTML = [
		'<div data-bge-container-frame>',
		`<div data-bge-group>${items}</div>`,
		'</div>',
	].join('');
	document.body.append(block);

	return block.querySelector<HTMLElement>('[data-bge-group]')!;
}

/**
 * 複数グループのグリッドブロックを置く
 * @param counts - グループごとのアイテム数（並び順）
 * @returns `[data-bge-container-frame]`
 */
function mountGridColumns(counts: readonly number[]) {
	const style = document.createElement('style');
	style.id = 'general-style';
	style.textContent = generalCSS;
	document.head.append(style);

	const groups = counts
		.map((count) => {
			const items = Array.from(
				{ length: count },
				(_, index) => `<div data-bge-item><p>${index + 1}</p></div>`,
			).join('');
			return `<div data-bge-group>${items}</div>`;
		})
		.join('');

	const block = document.createElement('div');
	block.dataset.bgeContainer = 'grid:2';
	block.innerHTML = `<div data-bge-container-frame>${groups}</div>`;
	document.body.append(block);

	return block.querySelector<HTMLElement>('[data-bge-container-frame]')!;
}

/**
 * 各アイテムが重ならず縦に並んでいる
 * @param group - `[data-bge-group]`
 * @param itemCount - 期待するアイテム数
 */
function expectItemsStackedVertically(group: HTMLElement, itemCount: number) {
	const items = group.querySelectorAll<HTMLElement>('[data-bge-item]');
	expect(items).toHaveLength(itemCount);

	const rects = [...items].map((item) => {
		const rect = item.getBoundingClientRect();
		expect(rect.height).toBeGreaterThan(0);
		return rect;
	});
	for (const [index, rect] of rects.slice(1).entries()) {
		expect(rect.top).toBeGreaterThanOrEqual(rects[index]!.bottom - 1);
	}
}

describe('general.css（グリッドのグループ内アイテム）', () => {
	test('1 個のアイテムは subgrid のまま', () => {
		const group = mountGridGroup(1);
		const style = getComputedStyle(group);

		expect(style.display).toBe('grid');
		expect(style.gridTemplateRows.startsWith('subgrid')).toBe(true);
	});

	test('8 個のアイテムは subgrid のまま縦に並ぶ', () => {
		const group = mountGridGroup(8);
		const style = getComputedStyle(group);

		expect(style.display).toBe('grid');
		expect(style.gridTemplateRows.startsWith('subgrid')).toBe(true);
		expectItemsStackedVertically(group, 8);
	});

	test('9 個のアイテムは flex フォールバックで縦に並ぶ', () => {
		const group = mountGridGroup(9);
		const style = getComputedStyle(group);

		expect(style.display).toBe('flex');
		expect(style.flexDirection).toBe('column');
		expectItemsStackedVertically(group, 9);
	});

	test('10 個のアイテムも flex フォールバックで縦に並ぶ', () => {
		const group = mountGridGroup(10);
		const style = getComputedStyle(group);

		expect(style.display).toBe('flex');
		expect(style.flexDirection).toBe('column');
		expectItemsStackedVertically(group, 10);
	});

	test('9 個のグループは隣の列と subgrid を共有しない', () => {
		const frame = mountGridColumns([9, 2]);
		const groups = frame.querySelectorAll<HTMLElement>('[data-bge-group]');
		const stacked = getComputedStyle(groups[0]!);
		const aligned = getComputedStyle(groups[1]!);

		expect(stacked.display).toBe('flex');
		expect(aligned.display).toBe('grid');
		expect(aligned.gridTemplateRows.startsWith('subgrid')).toBe(true);
		expectItemsStackedVertically(groups[0]!, 9);
		expectItemsStackedVertically(groups[1]!, 2);
	});
});

describe('general.css（横並びの縦向配置）', () => {
	test.each([
		['align-start', 'start'],
		['align-center', 'center'],
		['align-end', 'end'],
		['align-stretch', 'stretch'],
		['align-baseline', 'baseline'],
		// 末尾でない位置（保存される形。`$=` と `*=` の 2 つのセレクタのうち後者）
		['align-baseline:wrap', 'baseline'],
	])('inline:%s のグループは align-items: %s で並ぶ', (option, alignItems) => {
		const frame = mount(`inline:${option}`);

		expect(getComputedStyle(frame).alignItems).toBe(alignItems);
	});

	test('縦向配置の指定が無ければ stretch', () => {
		const frame = mount('inline');

		expect(getComputedStyle(frame).alignItems).toBe('stretch');
	});
});
