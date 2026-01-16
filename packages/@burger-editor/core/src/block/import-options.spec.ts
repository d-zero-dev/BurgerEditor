import { expect, test } from 'vitest';

import { importOptions } from './import-options.js';

test('linkarea: trueの場合、全グループにdata-bge-linkarea属性を追加する', () => {
	const el = document.createElement('div');
	el.innerHTML = `
		<div data-bge-container-frame>
			<div data-bge-group>
				<div data-bge-item></div>
			</div>
			<div data-bge-group>
				<div data-bge-item></div>
			</div>
		</div>
	`;

	importOptions(el, {
		containerProps: {
			type: 'grid',
			columns: 2,
			linkarea: true,
		},
	});

	const groups = el.querySelectorAll('[data-bge-group]');
	expect(groups.length).toBe(2);
	expect(Object.hasOwn(groups[0].dataset, 'bgeLinkarea')).toBe(true);
	expect(Object.hasOwn(groups[1].dataset, 'bgeLinkarea')).toBe(true);
});

test('linkarea: falseの場合、全グループからdata-bge-linkarea属性を削除する', () => {
	const el = document.createElement('div');
	el.innerHTML = `
		<div data-bge-container-frame>
			<div data-bge-group data-bge-linkarea>
				<div data-bge-item></div>
			</div>
			<div data-bge-group data-bge-linkarea>
				<div data-bge-item></div>
			</div>
		</div>
	`;

	importOptions(el, {
		containerProps: {
			type: 'grid',
			columns: 2,
			linkarea: false,
		},
	});

	const groups = el.querySelectorAll('[data-bge-group]');
	expect(groups.length).toBe(2);
	expect(Object.hasOwn(groups[0].dataset, 'bgeLinkarea')).toBe(false);
	expect(Object.hasOwn(groups[1].dataset, 'bgeLinkarea')).toBe(false);
});

test('linkareaが未指定の場合、全グループからdata-bge-linkarea属性を削除する', () => {
	const el = document.createElement('div');
	el.innerHTML = `
		<div data-bge-container-frame>
			<div data-bge-group data-bge-linkarea>
				<div data-bge-item></div>
			</div>
		</div>
	`;

	importOptions(el, {
		containerProps: {
			type: 'grid',
			columns: 2,
			// linkarea未指定
		},
	});

	const group = el.querySelector('[data-bge-group]');
	expect(group?.hasAttribute('data-bge-linkarea')).toBe(false);
});

test('グループ要素が存在しない場合でもエラーが発生しない', () => {
	const el = document.createElement('div');
	el.innerHTML = `
		<div data-bge-container-frame>
			<!-- グループなし -->
		</div>
	`;

	expect(() => {
		importOptions(el, {
			containerProps: {
				type: 'grid',
				columns: 2,
				linkarea: true,
			},
		});
	}).not.toThrow();

	// グループが存在しないことを確認
	const groups = el.querySelectorAll('[data-bge-group]');
	expect(groups.length).toBe(0);
});
