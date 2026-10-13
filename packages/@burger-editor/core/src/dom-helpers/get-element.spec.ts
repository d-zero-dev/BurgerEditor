import { test, expect, beforeEach } from 'vitest';

import { ElementNotFoundError, NoHTMLElementError } from '../error/errors.js';

import { getElement } from './get-element.js';

beforeEach(() => {
	document.body.innerHTML = '';
});

test('文字列セレクタが一致する要素を返す', () => {
	document.body.innerHTML = '<div id="target"></div>';

	expect(getElement('#target')).toBe(document.querySelector('#target'));
});

test('文字列セレクタが一致しない場合はElementNotFoundErrorを投げる', () => {
	expect(() => getElement('#not-found')).toThrow(ElementNotFoundError);
});

test('セレクタがHTMLElementではない要素にマッチした場合はNoHTMLElementErrorを投げる', () => {
	document.body.insertAdjacentHTML('beforeend', '<svg id="not-html"><rect /></svg>');

	expect(() => getElement('#not-html')).toThrow(NoHTMLElementError);
});

test('HTMLElementを直接渡すとそのまま返す（複数エンジンが同一documentに存在できる経路）', () => {
	const el = document.createElement('div');
	document.body.append(el);

	expect(getElement(el)).toBe(el);
});

test('nullやundefinedが渡された場合はElementNotFoundErrorを投げる（呼び出し元のnullアサーション崩れを検出する）', () => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	expect(() => getElement(null as any)).toThrow(ElementNotFoundError);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	expect(() => getElement(undefined as any)).toThrow(ElementNotFoundError);
});
