import { test, expect, describe } from 'vitest';

import { narrowElement } from './narrow-element.js';

describe('narrowElement', () => {
	test('期待する型のインスタンスならそのまま返す', () => {
		const input = document.createElement('input');
		expect(narrowElement(input, HTMLInputElement)).toBe(input);
	});

	test('期待する型でなければTypeErrorを投げる', () => {
		const div = document.createElement('div');
		expect(() => narrowElement(div, HTMLInputElement)).toThrow(
			'Expected HTMLInputElement, got HTMLDivElement',
		);
	});

	test('contextを渡すとエラーメッセージに含まれる', () => {
		const div = document.createElement('div');
		expect(() => narrowElement(div, HTMLInputElement, 'メールアドレス')).toThrow(
			'Expected HTMLInputElement for メールアドレス, got HTMLDivElement',
		);
	});
});
