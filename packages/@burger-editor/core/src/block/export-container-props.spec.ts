import { test, expect } from 'vitest';

import { exportContainerProps } from './export-container-props.js';

test('グリッドタイプのコンテナを正しく解析する', () => {
	expect(exportContainerProps('grid:2')).toEqual({
		type: 'grid',
		immutable: false,
		autoRepeat: 'fixed',
		justify: null,
		align: null,
		wrap: null,
		columns: 2,
		float: null,
		frameSemantics: 'div',
		linkarea: false,
		repeatMinInlineSize: null,
	});

	expect(exportContainerProps('grid:3:immutable')).toEqual({
		type: 'grid',
		immutable: true,
		autoRepeat: 'fixed',
		justify: null,
		align: null,
		wrap: null,
		columns: 3,
		float: null,
		frameSemantics: 'div',
		linkarea: false,
		repeatMinInlineSize: null,
	});

	expect(exportContainerProps('grid:3:auto-fit')).toEqual({
		type: 'grid',
		immutable: false,
		autoRepeat: 'auto-fit',
		justify: null,
		align: null,
		wrap: null,
		columns: 3,
		float: null,
		frameSemantics: 'div',
		linkarea: false,
		repeatMinInlineSize: null,
	});

	expect(exportContainerProps('grid:3:auto-fill')).toEqual({
		type: 'grid',
		immutable: false,
		autoRepeat: 'auto-fill',
		justify: null,
		align: null,
		wrap: null,
		columns: 3,
		float: null,
		frameSemantics: 'div',
		linkarea: false,
		repeatMinInlineSize: null,
	});
});

test('インラインタイプのコンテナを正しく解析する', () => {
	expect(exportContainerProps('inline:center:wrap')).toEqual({
		type: 'inline',
		immutable: false,
		autoRepeat: 'fixed',
		justify: 'center',
		align: null,
		wrap: 'wrap',
		columns: null,
		float: null,
		frameSemantics: 'div',
		linkarea: false,
		repeatMinInlineSize: null,
	});

	expect(exportContainerProps('inline:between:align-center:nowrap')).toEqual({
		type: 'inline',
		immutable: false,
		autoRepeat: 'fixed',
		justify: 'between',
		align: 'align-center',
		wrap: 'nowrap',
		columns: null,
		float: null,
		frameSemantics: 'div',
		linkarea: false,
		repeatMinInlineSize: null,
	});
});

test('フロートタイプのコンテナを正しく解析する', () => {
	expect(exportContainerProps('float:start')).toEqual({
		type: 'float',
		immutable: false,
		autoRepeat: 'fixed',
		justify: null,
		align: null,
		wrap: null,
		columns: null,
		float: 'start',
		frameSemantics: 'div',
		linkarea: false,
		repeatMinInlineSize: null,
	});

	expect(exportContainerProps('float:end:immutable')).toEqual({
		type: 'float',
		immutable: true,
		autoRepeat: 'fixed',
		justify: null,
		align: null,
		wrap: null,
		columns: null,
		float: 'end',
		frameSemantics: 'div',
		linkarea: false,
		repeatMinInlineSize: null,
	});
});

test('コンテナタイプが未定義の場合、デフォルト値を返す', () => {
	expect(exportContainerProps()).toEqual({
		type: 'inline',
		immutable: false,
		autoRepeat: 'fixed',
		justify: null,
		align: null,
		wrap: null,
		columns: null,
		float: null,
		frameSemantics: 'div',
		linkarea: false,
		repeatMinInlineSize: null,
	});
});

test('無効なオプションは無視される', () => {
	expect(exportContainerProps('grid:invalid:2')).toEqual({
		type: 'grid',
		immutable: false,
		autoRepeat: 'fixed',
		justify: null,
		align: null,
		wrap: null,
		columns: 2,
		float: null,
		frameSemantics: 'div',
		linkarea: false,
		repeatMinInlineSize: null,
	});
});

test('列数が数値でない場合、デフォルト値1を返す', () => {
	expect(exportContainerProps('grid')).toEqual({
		type: 'grid',
		immutable: false,
		autoRepeat: 'fixed',
		justify: null,
		align: null,
		wrap: null,
		columns: 1,
		float: null,
		frameSemantics: 'div',
		linkarea: false,
		repeatMinInlineSize: null,
	});
});

test('auto-fit + バリアント指定を正しく解析する', () => {
	expect(exportContainerProps('grid:3:auto-fit:--large')).toEqual({
		type: 'grid',
		immutable: false,
		autoRepeat: 'auto-fit',
		justify: null,
		align: null,
		wrap: null,
		columns: 3,
		float: null,
		frameSemantics: 'div',
		linkarea: false,
		repeatMinInlineSize: 'large',
	});

	expect(exportContainerProps('grid:auto-fill:--small:2')).toEqual({
		type: 'grid',
		immutable: false,
		autoRepeat: 'auto-fill',
		justify: null,
		align: null,
		wrap: null,
		columns: 2,
		float: null,
		frameSemantics: 'div',
		linkarea: false,
		repeatMinInlineSize: 'small',
	});
});

test('auto-fillとauto-fitの優先順位を正しく処理する', () => {
	// auto-fillが優先される
	expect(exportContainerProps('grid:3:auto-fill:auto-fit')).toEqual({
		type: 'grid',
		immutable: false,
		autoRepeat: 'auto-fill',
		justify: null,
		align: null,
		wrap: null,
		columns: 3,
		float: null,
		frameSemantics: 'div',
		linkarea: false,
		repeatMinInlineSize: null,
	});

	// auto-fitのみの場合
	expect(exportContainerProps('grid:3:auto-fit')).toEqual({
		type: 'grid',
		immutable: false,
		autoRepeat: 'auto-fit',
		justify: null,
		align: null,
		wrap: null,
		columns: 3,
		float: null,
		frameSemantics: 'div',
		linkarea: false,
		repeatMinInlineSize: null,
	});
});
