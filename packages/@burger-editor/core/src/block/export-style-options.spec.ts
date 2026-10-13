import { test, expect } from 'vitest';

import { exportStyleOptions } from './export-style-options.js';
import { importStyleOptions } from './import-style-options.js';

test('スタイルオプションの取得', () => {
	const el = document.createElement('div');
	el.style.setProperty('--bge-options-width', 'var(--bge-options-width--full)');
	el.style.setProperty('--bge-options-bgcolor', 'var(--bge-options-bgcolor--blue)');
	el.style.setProperty(
		'--bge-options-padding-block',
		'var(--bge-options-padding-block--middle)',
	);
	el.style.setProperty(
		'--bge-options-padding-inline',
		'var(--bge-options-padding-inline--large)',
	);

	expect(exportStyleOptions(el)).toEqual({
		width: 'full',
		bgcolor: 'blue',
		'padding-block': 'middle',
		'padding-inline': 'large',
	});
});

test('数字・大文字・アンダースコアを含むカテゴリ名・値名を読み戻す', () => {
	const el = document.createElement('div');
	el.style.setProperty('--bge-options-gap', 'var(--bge-options-gap--2x)');
	el.style.setProperty('--bge-options-h2-size', 'var(--bge-options-h2-size--level-3)');
	el.style.setProperty(
		'--bge-options-heading_size',
		'var(--bge-options-heading_size--Large)',
	);
	el.style.setProperty('--bge-options-TextColor', 'var(--bge-options-TextColor--Red)');

	expect(exportStyleOptions(el)).toEqual({
		gap: '2x',
		'h2-size': 'level-3',
		heading_size: 'Large',
		TextColor: 'Red',
	});
});

test('値名が - で始まる参照を検出側と同じく読み戻す', () => {
	const el = document.createElement('div');
	el.style.setProperty('--bge-options-gap', 'var(--bge-options-gap---x)');

	expect(exportStyleOptions(el)).toEqual({
		gap: '-x',
	});
});

test('-- を含む名前・末尾が - のカテゴリ名は無視する', () => {
	const el = document.createElement('div');
	el.style.setProperty('--bge-options-gap', 'var(--bge-options-gap--x--y)');
	el.style.setProperty('--bge-options-size--2x', 'var(--bge-options-size--2x--big)');
	el.style.setProperty('--bge-options-width-', 'var(--bge-options-width---full)');

	expect(exportStyleOptions(el)).toEqual({});
});

test('コンテナ種別プレフィックス付きで数字を含む名前を読み戻す', () => {
	const el = document.createElement('div');
	el.style.setProperty(
		'--bge-options-_grid_cols2',
		'var(--bge-options-_grid_cols2--3up)',
	);

	expect(exportStyleOptions(el)).toEqual({
		_grid_cols2: '3up',
	});
});

test('var() の内側の空白を許容する', () => {
	const el = document.createElement('div');
	el.setAttribute('style', '--bge-options-gap: var( --bge-options-gap--2x )');

	expect(exportStyleOptions(el)).toEqual({
		gap: '2x',
	});
});

test('別カテゴリを参照する宣言は無視する', () => {
	const el = document.createElement('div');
	el.style.setProperty('--bge-options-gap', 'var(--bge-options-gap2--2x)');

	expect(exportStyleOptions(el)).toEqual({});
});

test('--bge-options- 以外の変数を参照する宣言は無視する', () => {
	const el = document.createElement('div');
	el.style.setProperty('--bge-options-gap', 'var(--gap--2x)');

	expect(exportStyleOptions(el)).toEqual({});
});

test('カテゴリ名が空の宣言は無視する', () => {
	const el = document.createElement('div');
	el.style.setProperty('--bge-options-', 'var(--bge-options---2x)');

	expect(exportStyleOptions(el)).toEqual({});
});

test('単一の var() 参照でない宣言と値名が空の参照は無視する', () => {
	const el = document.createElement('div');
	el.style.setProperty('--bge-options-gap', '2rem');
	el.style.setProperty('--bge-options-width', 'var(--bge-options-width--full, 100%)');
	el.style.setProperty('--bge-options-bgcolor', 'var(--bge-options-bgcolor--)');

	expect(exportStyleOptions(el)).toEqual({});
});

test('importStyleOptions で書き込んだ値をそのまま読み戻す', () => {
	const el = document.createElement('div');
	const style = {
		width: 'full',
		gap: '2x',
		heading_size: 'Large',
		TextColor: 'Red',
		_grid_cols2: '3up',
	};

	importStyleOptions(el, style);

	expect(exportStyleOptions(el)).toEqual(style);
});
