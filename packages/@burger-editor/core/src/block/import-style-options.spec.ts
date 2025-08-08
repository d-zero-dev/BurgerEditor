import { test, expect } from 'vitest';

import { importStyleOptions } from './import-style-options.js';

test('スタイルオプションの設定', () => {
	const el = document.createElement('div');
	const style = {
		width: 'full',
		bgcolor: 'blue',
	};

	importStyleOptions(el, style);

	expect(el.style.getPropertyValue('--bge-options-width')).toBe(
		'var(--bge-options-width--full)',
	);
	expect(el.style.getPropertyValue('--bge-options-bgcolor')).toBe(
		'var(--bge-options-bgcolor--blue)',
	);
});

test('@@defaultの値はスキップされる', () => {
	const el = document.createElement('div');
	const style = {
		width: '@@default',
		bgcolor: 'red',
	};

	importStyleOptions(el, style);

	expect(el.style.getPropertyValue('--bge-options-width')).toBe('');
	expect(el.style.getPropertyValue('--bge-options-bgcolor')).toBe(
		'var(--bge-options-bgcolor--red)',
	);
});

test('空のスタイルオブジェクト', () => {
	const el = document.createElement('div');
	const style = {};

	importStyleOptions(el, style);

	expect(el.style.length).toBe(0);
});
