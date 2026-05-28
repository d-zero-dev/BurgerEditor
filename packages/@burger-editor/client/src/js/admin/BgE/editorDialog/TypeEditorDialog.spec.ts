import { vi, test, expect } from 'vitest';

import { createElement, enableJQuery } from '../../../../test-helper.js';

import { extractFormData, setForm } from './TypeEditorDialog.js';

enableJQuery(vi);

test('import', () => {
	const form = createElement(`
		<div>
			<input type="hidden" name="bge-path">
			<input type="hidden" name="bge-formated-size" value="0">
			<input type="hidden" name="bge-size" value="0">
			<input type="text" name="bge-name" placeholder="サンプルダウンロードファイル">
			<input type="text" name="bge-name2" placeholder="サンプルダウンロードファイル">
			<input type="checkbox" name="bge-download" value="bge:checked" checked>
			<input type="checkbox" name="bge-download2" value="bge:checked" checked>
			<input type="checkbox" name="bge-download3" checked>
			<input type="checkbox" name="bge-download4">
			<input type="radio" name="bge-switch" value="a">
			<input type="radio" name="bge-switch" value="b">
			<input type="radio" name="bge-switch" value="c">
			<ul data-bge-list>
				<li><input type="text" name="bge-name3"></li>
			</ul>
			<ul data-bge-list>
				<li>
					<input type="hidden" name="bge-view">
					<label data-bge="view"></label>
				</li>
			</ul>
		</div>
	`);
	setForm(form, {
		path: '/path/to/file.ext',
		'formated-size': '999.99MB',
		size: '9999999',
		name: 'ふぁいるめい',
		name2: 'サンプルダウンロードファイル',
		download: true,
		download2: false,
		download3: 'false',
		download4: true,
		switch: 'b',
		name3: ['zero', 'one', 'two', 'three', 'four'],
		view: ['a', 'b', 'c'],
	});
	expect(form.querySelector<HTMLInputElement>('[name="bge-path"]')?.value).toBe(
		'/path/to/file.ext',
	);
	expect(form.querySelector<HTMLInputElement>('[name="bge-formated-size"]')?.value).toBe(
		'999.99MB',
	);
	expect(form.querySelector<HTMLInputElement>('[name="bge-size"]')?.value).toBe(
		'9999999',
	);
	expect(form.querySelector<HTMLInputElement>('[name="bge-name"]')?.value).toBe(
		'ふぁいるめい',
	);
	expect(form.querySelector<HTMLInputElement>('[name="bge-name2"]')?.value).toBe('');
	expect(form.querySelector<HTMLInputElement>('[name="bge-download"]')?.checked).toBe(
		true,
	);
	expect(form.querySelector<HTMLInputElement>('[name="bge-download2"]')?.checked).toBe(
		false,
	);
	expect(form.querySelector<HTMLInputElement>('[name="bge-download3"]')?.checked).toBe(
		false,
	);
	expect(form.querySelector<HTMLInputElement>('[name="bge-download4"]')?.checked).toBe(
		true,
	);
	expect(
		form.querySelectorAll<HTMLInputElement>('[name="bge-switch"]')?.[0]?.checked,
	).toBe(false);
	expect(
		form.querySelectorAll<HTMLInputElement>('[name="bge-switch"]')?.[1]?.checked,
	).toBe(true);
	expect(
		form.querySelectorAll<HTMLInputElement>('[name="bge-switch"]')?.[2]?.checked,
	).toBe(false);
	expect(form.querySelectorAll<HTMLInputElement>('[name="bge-name3"]').length).toBe(5);
	expect(
		form.querySelectorAll<HTMLInputElement>('[name="bge-name3"]').item(0)?.value,
	).toBe('zero');
	expect(
		form.querySelectorAll<HTMLInputElement>('[name="bge-name3"]').item(1)?.value,
	).toBe('one');
	expect(
		form.querySelectorAll<HTMLInputElement>('[name="bge-name3"]').item(2)?.value,
	).toBe('two');
	expect(
		form.querySelectorAll<HTMLInputElement>('[name="bge-name3"]').item(3)?.value,
	).toBe('three');
	expect(
		form.querySelectorAll<HTMLInputElement>('[name="bge-name3"]').item(4)?.value,
	).toBe('four');
	expect(form.querySelectorAll<HTMLInputElement>('[name="bge-view"]').length).toBe(3);
	expect(
		form.querySelectorAll<HTMLInputElement>('[name="bge-view"]').item(0)?.value,
	).toBe('a');
	expect(
		form.querySelectorAll<HTMLInputElement>('[name="bge-view"]').item(1)?.value,
	).toBe('b');
	expect(
		form.querySelectorAll<HTMLInputElement>('[name="bge-view"]').item(2)?.value,
	).toBe('c');
	expect(form.querySelectorAll('[data-bge="view"]').length).toBe(3);
	expect(form.querySelectorAll('[data-bge="view"]').item(0).innerHTML).toBe('a');
	expect(form.querySelectorAll('[data-bge="view"]').item(1).innerHTML).toBe('b');
	expect(form.querySelectorAll('[data-bge="view"]').item(2).innerHTML).toBe('c');
});

test('export', () => {
	const form = createElement(`
		<div>
			<input type="hidden" name="bge-path" value="/path/to/file.ext">
			<input type="hidden" name="bge-formated-size" value="999.99MB">
			<input type="hidden" name="bge-size" value="9999999">
			<input type="text" name="bge-name" placeholder="サンプルダウンロードファイル" value="ふぁいるめい">
			<input type="text" name="bge-name2" placeholder="サンプルダウンロードファイル" value="サンプルダウンロードファイル">
			<input type="checkbox" name="bge-download" value="bge:checked" checked>
			<input type="checkbox" name="bge-download2" value="bge:checked">
			<input type="checkbox" name="bge-download3" checked>
			<input type="checkbox" name="bge-download4">
			<input type="radio" name="bge-switch" value="a">
			<input type="radio" name="bge-switch" value="b" checked>
			<input type="radio" name="bge-switch" value="c">
			<div data-bge-list>
				<input type="hidden" name="bge-pathes" value="/path/to/file-1.ext">
				<input type="hidden" name="bge-pathes" value="/path/to/file-2.ext">
				<input type="hidden" name="bge-pathes" value="/path/to/file-3.ext">
			</div>
			<div data-bge-list>
				<input type="hidden" name="bge-array" value="array-item">
			</div>
		</div>
	`);
	const data = extractFormData(form);
	expect({
		path: '/path/to/file.ext',
		'formated-size': '999.99MB',
		size: '9999999',
		name: 'ふぁいるめい',
		name2: 'サンプルダウンロードファイル',
		download: true,
		download2: false,
		download3: true,
		download4: false,
		switch: 'b',
		pathes: ['/path/to/file-1.ext', '/path/to/file-2.ext', '/path/to/file-3.ext'],
		array: ['array-item'],
	}).toStrictEqual(data);
});
