import { test, expect } from 'vitest';

import { exportContainerProps } from './export-container-props.js';

test('グリッドタイプのコンテナを正しく解析する', () => {
	expect(exportContainerProps('grid:2')).toEqual({
		type: 'grid',
		immutable: false,
		autoFit: false,
		justify: null,
		align: null,
		wrap: null,
		columns: 2,
		float: null,
		frameSemantics: 'div',
	});

	expect(exportContainerProps('grid:3:immutable')).toEqual({
		type: 'grid',
		immutable: true,
		autoFit: false,
		justify: null,
		align: null,
		wrap: null,
		columns: 3,
		float: null,
		frameSemantics: 'div',
	});

	expect(exportContainerProps('grid:3:auto-fit')).toEqual({
		type: 'grid',
		immutable: false,
		autoFit: true,
		justify: null,
		align: null,
		wrap: null,
		columns: 3,
		float: null,
		frameSemantics: 'div',
	});
});

test('インラインタイプのコンテナを正しく解析する', () => {
	expect(exportContainerProps('inline:center:wrap')).toEqual({
		type: 'inline',
		immutable: false,
		autoFit: false,
		justify: 'center',
		align: null,
		wrap: 'wrap',
		columns: null,
		float: null,
		frameSemantics: 'div',
	});

	expect(exportContainerProps('inline:between:align-center:nowrap')).toEqual({
		type: 'inline',
		immutable: false,
		autoFit: false,
		justify: 'between',
		align: 'align-center',
		wrap: 'nowrap',
		columns: null,
		float: null,
		frameSemantics: 'div',
	});
});

test('フロートタイプのコンテナを正しく解析する', () => {
	expect(exportContainerProps('float:start')).toEqual({
		type: 'float',
		immutable: false,
		autoFit: false,
		justify: null,
		align: null,
		wrap: null,
		columns: null,
		float: 'start',
		frameSemantics: 'div',
	});

	expect(exportContainerProps('float:end:immutable')).toEqual({
		type: 'float',
		immutable: true,
		autoFit: false,
		justify: null,
		align: null,
		wrap: null,
		columns: null,
		float: 'end',
		frameSemantics: 'div',
	});
});

test('コンテナタイプが未定義の場合、デフォルト値を返す', () => {
	expect(exportContainerProps()).toEqual({
		type: 'inline',
		immutable: false,
		autoFit: false,
		justify: null,
		align: null,
		wrap: null,
		columns: null,
		float: null,
		frameSemantics: 'div',
	});
});

test('無効なオプションは無視される', () => {
	expect(exportContainerProps('grid:invalid:2')).toEqual({
		type: 'grid',
		immutable: false,
		autoFit: false,
		justify: null,
		align: null,
		wrap: null,
		columns: 2,
		float: null,
		frameSemantics: 'div',
	});
});
