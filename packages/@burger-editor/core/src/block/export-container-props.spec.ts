import { test, expect } from 'vitest';

import { exportContainerProps } from './export-container-props.js';

test('グリッドタイプのコンテナを正しく解析する', () => {
	expect(exportContainerProps('grid:2')).toEqual({
		type: 'grid',
		immutable: false,
		justify: null,
		align: null,
		wrap: null,
		columns: 2,
		float: null,
	});

	expect(exportContainerProps('grid:3:immutable')).toEqual({
		type: 'grid',
		immutable: true,
		justify: null,
		align: null,
		wrap: null,
		columns: 3,
		float: null,
	});
});

test('インラインタイプのコンテナを正しく解析する', () => {
	expect(exportContainerProps('inline:center:wrap')).toEqual({
		type: 'inline',
		immutable: false,
		justify: 'center',
		align: null,
		wrap: 'wrap',
		columns: null,
		float: null,
	});

	expect(exportContainerProps('inline:between:align-center:nowrap')).toEqual({
		type: 'inline',
		immutable: false,
		justify: 'between',
		align: 'align-center',
		wrap: 'nowrap',
		columns: null,
		float: null,
	});
});

test('フロートタイプのコンテナを正しく解析する', () => {
	expect(exportContainerProps('float:start')).toEqual({
		type: 'float',
		immutable: false,
		justify: null,
		align: null,
		wrap: null,
		columns: null,
		float: 'start',
	});

	expect(exportContainerProps('float:end:immutable')).toEqual({
		type: 'float',
		immutable: true,
		justify: null,
		align: null,
		wrap: null,
		columns: null,
		float: 'end',
	});
});

test('コンテナタイプが未定義の場合、デフォルト値を返す', () => {
	expect(exportContainerProps()).toEqual({
		type: 'inline',
		immutable: false,
		justify: null,
		align: null,
		wrap: null,
		columns: null,
		float: null,
	});
});

test('無効なオプションは無視される', () => {
	expect(exportContainerProps('grid:invalid:2')).toEqual({
		type: 'grid',
		immutable: false,
		justify: null,
		align: null,
		wrap: null,
		columns: 2,
		float: null,
	});
});
