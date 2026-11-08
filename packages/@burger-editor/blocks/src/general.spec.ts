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
