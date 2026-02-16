import { expect, test } from 'vitest';

import { exportOptions } from './export-options.js';

test('グループ要素にdata-bge-linkarea属性がない場合、linkarea: falseを返す', () => {
	const el = document.createElement('div');
	el.dataset.bgeContainer = 'grid:2';
	el.innerHTML = `
		<div data-bge-container-frame>
			<div data-bge-group>
				<div data-bge-item></div>
			</div>
		</div>
	`;

	const options = exportOptions(el);

	expect(options.containerProps.linkarea).toBe(false);
});

test('グループ要素にdata-bge-linkarea属性がある場合、linkarea: trueを返す', () => {
	const el = document.createElement('div');
	el.dataset.bgeContainer = 'grid:2';
	el.innerHTML = `
		<div data-bge-container-frame>
			<div data-bge-group data-bge-linkarea>
				<div data-bge-item></div>
			</div>
		</div>
	`;

	const options = exportOptions(el);

	expect(options.containerProps.linkarea).toBe(true);
});

test('複数グループのうち一つでもdata-bge-linkarea属性があれば、linkarea: trueを返す', () => {
	const el = document.createElement('div');
	el.dataset.bgeContainer = 'grid:2';
	el.innerHTML = `
		<div data-bge-container-frame>
			<div data-bge-group>
				<div data-bge-item></div>
			</div>
			<div data-bge-group data-bge-linkarea>
				<div data-bge-item></div>
			</div>
			<div data-bge-group>
				<div data-bge-item></div>
			</div>
		</div>
	`;

	const options = exportOptions(el);

	expect(options.containerProps.linkarea).toBe(true);
});

test('グループ要素が存在しない場合、linkarea: falseを返す', () => {
	const el = document.createElement('div');
	el.dataset.bgeContainer = 'grid:2';
	el.innerHTML = `
		<div data-bge-container-frame>
			<!-- グループなし -->
		</div>
	`;

	const options = exportOptions(el);

	expect(options.containerProps.linkarea).toBe(false);
});

test('data-bge-containerにバリアント指定がある場合、repeatMinInlineSizeを返す', () => {
	const el = document.createElement('div');
	el.dataset.bgeContainer = 'grid:3:auto-fit:--medium';
	el.innerHTML = `
		<div data-bge-container-frame>
			<div data-bge-group>
				<div data-bge-item></div>
			</div>
		</div>
	`;

	const options = exportOptions(el);

	expect(options.containerProps.repeatMinInlineSize).toBe('medium');
});

test('data-bge-containerにバリアント指定がない場合、repeatMinInlineSize: nullを返す', () => {
	const el = document.createElement('div');
	el.dataset.bgeContainer = 'grid:3:auto-fit';
	el.innerHTML = `
		<div data-bge-container-frame>
			<div data-bge-group>
				<div data-bge-item></div>
			</div>
		</div>
	`;

	const options = exportOptions(el);

	expect(options.containerProps.repeatMinInlineSize).toBeNull();
});
