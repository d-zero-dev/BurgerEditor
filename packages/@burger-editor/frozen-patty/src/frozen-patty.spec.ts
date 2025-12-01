// @ts-nocheck

import { test, expect } from 'vitest';

import FrozenPatty from './frozen-patty.js';

test('toDOM', () => {
	const fp = new FrozenPatty('<div data-field="text">value</div>');
	expect(fp.toHTML()).toBe('<div data-field="text">value</div>');
});

test('toJSON basic', () => {
	const fp = new FrozenPatty('<div data-field="text">value</div>');
	expect(fp.toJSON()).toStrictEqual({ text: 'value' });
});

test('toJSON filter', () => {
	const fp = new FrozenPatty('<div data-field="text">value</div>', {
		valueFilter: (v) => v.toUpperCase(),
	});
	expect(fp.toJSON()).toStrictEqual({ text: 'VALUE' });
});

test('toJSON attribute field', () => {
	const fp = new FrozenPatty(
		'<a href="http://localhost" data-field="href:href">link</a>',
	);
	expect(fp.toJSON()).toStrictEqual({ href: 'http://localhost' });
});

test('toJSON optional field name', () => {
	const fp = new FrozenPatty('<div data-field="field-name">value</div>');
	expect(fp.toJSON()).toStrictEqual({ fieldName: 'value' });
});

test('toJSON optional attribute field', () => {
	const fp = new FrozenPatty(
		'<div data-option="value" data-field="field-name:data-option"></div>',
	);
	expect(fp.toJSON()).toStrictEqual({ fieldName: 'value' });
});

test('toJSON optional attribute field - empty string', () => {
	const fp = new FrozenPatty(
		'<div data-option="" data-field="field-name:data-option"></div>',
	);
	expect(fp.toJSON()).toStrictEqual({ fieldName: '' });
});

test('toJSON optional attribute field - no value', () => {
	const fp = new FrozenPatty(
		'<div data-option data-field="field-name:data-option"></div>',
	);
	expect(fp.toJSON()).toStrictEqual({ fieldName: '' });
});

test('toJSON optional attribute field - stringify true', () => {
	const fp = new FrozenPatty(
		'<div data-option="true" data-field="field-name:data-option"></div>',
	);
	expect(fp.toJSON()).toStrictEqual({ fieldName: 'true' });
});

test('toJSON optional attribute field - stringify false', () => {
	const fp = new FrozenPatty(
		'<div data-option="false" data-field="field-name:data-option"></div>',
	);
	expect(fp.toJSON()).toStrictEqual({ fieldName: 'false' });
});

test('toJSON optional attribute field - stringify true - type conversion', () => {
	const fp = new FrozenPatty(
		'<div data-option="true" data-field="field-name:data-option"></div>',
		{ typeConvert: true },
	);
	expect(fp.toJSON()).toStrictEqual({ fieldName: true });
});

test('toJSON optional attribute field - stringify false - type conversion', () => {
	const fp = new FrozenPatty(
		'<div data-option="false" data-field="field-name:data-option"></div>',
		{ typeConvert: true },
	);
	expect(fp.toJSON()).toStrictEqual({ fieldName: false });
});

test('toJSON optional attribute field - stringify number', () => {
	const fp = new FrozenPatty(
		'<div data-option="0" data-field="field-name:data-option"></div>',
	);
	expect(fp.toJSON()).toStrictEqual({ fieldName: '0' });
});

test('toJSON optional attribute field - stringify number - type conversion', () => {
	const fp = new FrozenPatty(
		'<div data-option="0" data-field="field-name:data-option"></div>',
		{ typeConvert: true },
	);
	expect(fp.toJSON()).toStrictEqual({ fieldName: 0 });
});

test('toJSON optional attribute field - stringify number', () => {
	const fp = new FrozenPatty(
		'<div data-option="1" data-field="field-name:data-option"></div>',
	);
	expect(fp.toJSON()).toStrictEqual({ fieldName: '1' });
});

test('toJSON optional attribute field - stringify number - type conversion', () => {
	const fp = new FrozenPatty(
		'<div data-option="1" data-field="field-name:data-option"></div>',
		{ typeConvert: true },
	);
	expect(fp.toJSON()).toStrictEqual({ fieldName: 1 });
});

test('toJSON optional attribute field - stringify number', () => {
	const fp = new FrozenPatty(
		'<div data-option="1.0" data-field="field-name:data-option"></div>',
	);
	expect(fp.toJSON()).toStrictEqual({ fieldName: '1.0' });
});

test('toJSON optional attribute field - stringify number - type conversion', () => {
	const fp = new FrozenPatty(
		'<div data-option="1.0" data-field="field-name:data-option"></div>',
		{ typeConvert: true },
	);
	expect(fp.toJSON()).toStrictEqual({ fieldName: 1 });
});

test('toJSON optional attribute field - stringify number', () => {
	const fp = new FrozenPatty(
		'<div data-option="0.1" data-field="field-name:data-option"></div>',
	);
	expect(fp.toJSON()).toStrictEqual({ fieldName: '0.1' });
});

test('toJSON optional attribute field - stringify number - type conversion', () => {
	const fp = new FrozenPatty(
		'<div data-option="0.1" data-field="field-name:data-option"></div>',
		{ typeConvert: true },
	);
	expect(fp.toJSON()).toStrictEqual({ fieldName: 0.1 });
});

test('toJSON optional attribute field - stringify number - type conversion with custom attr name', () => {
	const fp = new FrozenPatty('<div data-foo-num="25" data-foo=":num" ></div>', {
		attr: 'foo',
		typeConvert: true,
	});
	expect(fp.toJSON()).toStrictEqual({ num: 25 });
});

test('toJSON custom attr name', () => {
	const fp = new FrozenPatty('<div data-bge="text">value</div>', { attr: 'bge' });
	expect(fp.toJSON()).toStrictEqual({ text: 'value' });
});

test('Merge data', () => {
	const fp = new FrozenPatty('<div data-field="text">value</div>');
	fp.merge({ text: 'merged' });
	expect(fp.toJSON()).toStrictEqual({ text: 'merged' });
});

test('Merge filtered data', () => {
	const fp = new FrozenPatty('<div data-field="text">value</div>', {
		valueFilter: (v) => v.toUpperCase(),
	});
	fp.merge({ text: 'merged' });
	expect(fp.toJSON()).toStrictEqual({ text: 'MERGED' });
});

test('Full Data', () => {
	const fp = new FrozenPatty(`
		<div>
			<div data-field="prop01">prop01-text</div>
			<div data-field="prop02"><span id="prop02-html">prop02-html</span></div>
			<div data-field="prop03:title" title="prop03-title"></div>
			<div data-field="prop04:data-attr, prop05" data-attr="prop04-data-attr">prop05-text</div>
			<ul data-field-list>
				<li data-field="prop06">prop06-text-01</li>
				<li data-field="prop06">prop06-text-02</li>
				<li data-field="prop06">prop06-text-03</li>
			</ul>
			<ul data-field-list>
				<li><a data-field="prop07:href, prop08" href="prop07-href-01">prop08-text-01</a></li>
				<li><a data-field="prop07:href, prop08" href="prop07-href-02">prop08-text-02</a></li>
			</ul>
			<ul data-field-list>
				<li data-field="prop09">prop09-text-01</li>
			</ul>
			<ul>
				<li data-field="prop10">prop10-text-01</li>
				<li data-field="prop10">prop10-text-02</li>
			</ul>
		</div>
	`);
	expect(fp.toJSON()).toStrictEqual({
		prop01: 'prop01-text',
		prop02: '<span id="prop02-html">prop02-html</span>',
		prop03: 'prop03-title',
		prop04: 'prop04-data-attr',
		prop05: 'prop05-text',
		prop06: ['prop06-text-01', 'prop06-text-02', 'prop06-text-03'],
		prop07: ['prop07-href-01', 'prop07-href-02'],
		prop08: ['prop08-text-01', 'prop08-text-02'],
		prop09: ['prop09-text-01'],
		prop10: 'prop10-text-02',
	});
});

test('Full data merge', () => {
	const fp = new FrozenPatty(`
		<div>
			<div data-field="prop01">prop01-text</div>
			<div data-field="prop02"><span id="prop02-html">prop02-html</span></div>
			<div data-field="prop03:title" title="prop03-title"></div>
			<div data-field="prop03">prop03-multiple-element</div>
			<div data-field="prop04:data-attr, prop05" data-attr="prop04-data-attr"></div>
			<ul data-field-list>
				<li data-field="prop06">prop06-text-01</li>
			</ul>
			<ul data-field-list>
				<li><a data-field="prop07:href, prop08" href="prop07-href-01">prop08-text-01</a></li>
			</ul>
		</div>
	`);
	fp.merge({
		prop01: 'prop01-text-rewrite',
		prop02: '<span id="prop02-html">prop02-html-rewrite</span>',
		prop03: 'prop03-rewrite',
		prop04: 'prop04-data-attr-rewrite',
		prop05: 'prop05-text-write',
		prop06: [
			'prop06-text-01-rewrite',
			'prop06-text-02-add',
			'prop06-text-03-add',
			'prop06-text-04-add',
		],
		prop07: [
			'prop07-href-01-rewrite',
			'prop07-href-02-add',
			// empty item for test
		],
		prop08: ['prop08-text-01-rewrite', 'prop08-text-02-add', 'prop08-text-03-add'],
	});
	expect(fp.toDOM().querySelector('[data-field*="prop01"]')?.innerHTML).toBe(
		'prop01-text-rewrite',
	);
	expect(fp.toDOM().querySelector('[data-field*="prop02"]')?.innerHTML).toBe(
		'<span id="prop02-html">prop02-html-rewrite</span>',
	);
	expect(fp.toDOM().querySelector('#prop02-html')).toBeTruthy();
	expect(
		fp.toDOM().querySelector('[data-field="prop03:title"]')?.getAttribute('title'),
	).toBe('prop03-rewrite');
	expect(fp.toDOM().querySelector('[data-field="prop03"]')?.innerHTML).toBe(
		'prop03-rewrite',
	);
	expect(
		fp
			.toDOM()
			.querySelector('[data-field*="prop04:data-attr"]')
			?.getAttribute('data-attr'),
	).toBe('prop04-data-attr-rewrite');
	expect(fp.toDOM().querySelector('[data-field*="prop05"]')?.innerHTML).toBe(
		'prop05-text-write',
	);
	expect(fp.toDOM().querySelectorAll('[data-field*="prop06"]').length).toBe(4);
	expect(fp.toDOM().querySelectorAll('[data-field*="prop06"]').item(0).innerHTML).toBe(
		'prop06-text-01-rewrite',
	);
	expect(fp.toDOM().querySelectorAll('[data-field*="prop06"]').item(1).innerHTML).toBe(
		'prop06-text-02-add',
	);
	expect(fp.toDOM().querySelectorAll('[data-field*="prop06"]').item(2).innerHTML).toBe(
		'prop06-text-03-add',
	);
	expect(fp.toDOM().querySelectorAll('[data-field*="prop06"]').item(3).innerHTML).toBe(
		'prop06-text-04-add',
	);
	expect(fp.toDOM().querySelectorAll('[data-field*="prop07"]').length).toBe(3);
	expect(
		fp.toDOM().querySelectorAll('[data-field*="prop07"]').item(0).getAttribute('href'),
	).toBe('prop07-href-01-rewrite');
	expect(
		fp.toDOM().querySelectorAll('[data-field*="prop07"]').item(1).getAttribute('href'),
	).toBe('prop07-href-02-add');
	expect(
		fp.toDOM().querySelectorAll('[data-field*="prop07"]').item(2).getAttribute('href'),
	).toBe('prop07-href-01-rewrite'); // empty item for test
	expect(fp.toDOM().querySelectorAll('[data-field*="prop08"]').length).toBe(3);
	expect(fp.toDOM().querySelectorAll('[data-field*="prop08"]').item(0).innerHTML).toBe(
		'prop08-text-01-rewrite',
	);
	expect(fp.toDOM().querySelectorAll('[data-field*="prop08"]').item(1).innerHTML).toBe(
		'prop08-text-02-add',
	);
	expect(fp.toDOM().querySelectorAll('[data-field*="prop08"]').item(2).innerHTML).toBe(
		'prop08-text-03-add',
	);
});

test('List item removes', () => {
	const fp = new FrozenPatty(`
		<div>
			<ul data-field-list>
				<div><span data-field="prop01">prop01-text</span></div>
			</ul>
		</div>
	`);
	fp.merge({
		prop01: ['prop01-text-rewrite', 'prop01-text-add'],
	});
	expect(fp.toDOM().querySelectorAll('[data-field*="prop01"]')[0].innerHTML).toBe(
		'prop01-text-rewrite',
	);
	expect(fp.toDOM().querySelectorAll('[data-field*="prop01"]')[1].innerHTML).toBe(
		'prop01-text-add',
	);

	// list remove
	fp.merge({
		prop01: ['prop01-text-rewrite'],
	});
	expect(fp.toDOM().querySelectorAll('[data-field*="prop01"]')[0].innerHTML).toBe(
		'prop01-text-rewrite',
	);
	expect(!!fp.toDOM().querySelectorAll('[data-field*="prop01"]')[1]).toBeFalsy();
	expect(fp.toDOM().querySelector('[data-field-list]')?.children.length).toBe(1);
});

test('List', () => {
	const fp = new FrozenPatty(`
	<div data-field-list>
		<figure>
			<div>
				<img src="/path/to/1" data-field="path:src">
			</div>
			<figcaption data-field="caption"></figcaption>
		</figure>
		<figure>
			<div>
				<img src="/path/to/2" data-field="path:src">
			</div>
			<figcaption data-field="caption"></figcaption>
		</figure>
		<figure>
			<div>
				<img src="/path/to/3" data-field="path:src">
			</div>
			<figcaption data-field="caption"></figcaption>
		</figure>
		<figure>
			<div>
				<img src="/path/to/4" data-field="path:src">
			</div>
			<figcaption data-field="caption"></figcaption>
		</figure>
		<figure>
			<div>
				<img src="/path/to/5" data-field="path:src">
			</div>
			<figcaption data-field="caption"></figcaption>
		</figure>
	</div>
	`);
	fp.merge({
		caption: ['1', '2', '3'],
		path: ['path/to/1', null, 'path/to/3'],
	});
	expect(fp.toDOM().querySelectorAll('figure').length).toBe(3);
});

test('value', () => {
	const fp = new FrozenPatty('<input data-field="field" value="value">');
	const fp2 = new FrozenPatty(
		'<select data-field="field"><option value="value2" checked>label</option><option value="merged2">label</option></select>',
	);
	const fp3 = new FrozenPatty('<textarea data-field="field">value3</textarea>');
	const fp4 = new FrozenPatty('<input data-field="field">');
	const fp5 = new FrozenPatty(
		'<select data-field="field"><option value="value5" checked>label</option></select>',
	);
	expect(fp.toJSON()).toStrictEqual({ field: 'value' });
	expect(fp2.toJSON()).toStrictEqual({ field: 'value2' });
	expect(fp3.toJSON()).toStrictEqual({ field: 'value3' });
	expect(fp4.toJSON()).toStrictEqual({ field: '' });
	expect(fp5.toJSON()).toStrictEqual({ field: 'value5' });
	expect(fp.merge({ field: 'merged' }).toDOM().children[0].value).toBe('merged');
	expect(fp2.merge({ field: 'merged2' }).toDOM().children[0].value).toBe('merged2');
	expect(fp3.merge({ field: 'merged3' }).toDOM().children[0].value).toBe('merged3');
	expect(fp4.merge({ field: 'merged4' }).toDOM().children[0].value).toBe('merged4');
	// expect(fp5.merge({ field: 'merged5' }).toDOM().children[0].value).toBe('value5');
});

test('typeConvert', () => {
	const fp = new FrozenPatty('<input data-field="field" value="1">', {
		typeConvert: true,
	});
	expect(fp.toJSON()).toStrictEqual({ field: 1 });
	const fp2 = new FrozenPatty('<input data-field="field" value="7.5">', {
		typeConvert: true,
	});
	expect(fp2.toJSON()).toStrictEqual({ field: 7.5 });
	const fp3 = new FrozenPatty('<input data-field="field" value="7.5px">', {
		typeConvert: true,
	});
	expect(fp3.toJSON()).toStrictEqual({ field: '7.5px' });
});

// test('attr: contenteditable', () => {
// 	const fp = new FrozenPatty(
// 		'<div data-field="edit:contenteditable" contenteditable>text</div>',
// 	);
// 	const fp2 = new FrozenPatty('<div data-field="edit:contenteditable">text</div>');
// 	expect(fp.toJSON(), { edit: true });
// 	expect(fp2.toJSON(), { edit: false });
// 	expect(fp.merge({ edit: '' }).toDOM().children[0].isContentEditable).toBe('true');
// 	expect(fp.merge({ edit: 'true' }).toDOM().children[0].isContentEditable).toBe('true');
// 	expect(fp.merge({ edit: true }).toDOM().children[0].isContentEditable).toBe(undefined);
// 	expect(fp.merge({ edit: false }).toDOM().children[0].isContentEditable).toBe(undefined);
// 	expect(fp.merge({ edit: 'abc' }).toDOM().children[0].isContentEditable).toBe(undefined);
// 	expect(fp.merge({ edit: '' }).toDOM().children[0].isContentEditable).toBe(undefined);
// 	expect(fp.merge({ edit: 1 }).toDOM().children[0].isContentEditable).toBe(undefined);
// 	expect(fp.merge({ edit: 0 }).toDOM().children[0].isContentEditable).toBe(undefined);
// 	expect(fp.merge({ edit: null }).toDOM().children[0].isContentEditable).toBe(undefined);
// });

test('attr: checked', () => {
	const fp = new FrozenPatty('<input data-field="checked:checked" checked>');
	const fp2 = new FrozenPatty('<input data-field="checked:checked">');
	expect(fp.toJSON()).toStrictEqual({ checked: true });
	expect(fp2.toJSON()).toStrictEqual({ checked: false });
	expect(fp.merge({ checked: true }).toDOM().children[0].checked).toBe(true);
	expect(fp.merge({ checked: false }).toDOM().children[0].checked).toBe(false);
	expect(fp.merge({ checked: 'abc' }).toDOM().children[0].checked).toBe(true);
	expect(fp.merge({ checked: '' }).toDOM().children[0].checked).toBe(true);
	expect(fp.merge({ checked: 1 }).toDOM().children[0].checked).toBe(true);
	expect(fp.merge({ checked: 0 }).toDOM().children[0].checked).toBe(false);
	expect(fp.merge({ checked: null }).toDOM().children[0].checked).toBe(false);
});

test('attr: disabled', () => {
	const fp = new FrozenPatty('<input disabled data-field="disabled:disabled">');
	const fp2 = new FrozenPatty('<input data-field="disabled:disabled">');
	expect(fp.toJSON()).toStrictEqual({ disabled: true });
	expect(fp2.toJSON()).toStrictEqual({ disabled: false });
});

test('attr: href', () => {
	expect(new FrozenPatty('<a href data-field="href:href"></a>').toJSON()).toStrictEqual({
		href: '',
	});
	expect(
		new FrozenPatty('<a href="" data-field="href:href"></a>').toJSON(),
	).toStrictEqual({
		href: '',
	});
	expect(
		new FrozenPatty('<a href="foo" data-field="href:href"></a>').toJSON(),
	).toStrictEqual({
		href: 'foo',
	});
	expect(
		new FrozenPatty('<a href="abc/?d=e&f=g" data-field="href:href"></a>').toJSON(),
	).toStrictEqual({ href: 'abc/?d=e&f=g' });
	expect(
		new FrozenPatty('<a href="hij/?k=l&amp;m=n" data-field="href:href"></a>').toJSON(),
	).toStrictEqual({ href: 'hij/?k=l&m=n' });
	expect(new FrozenPatty('<a data-field="href:href"></a>').toJSON()).toStrictEqual({
		href: '',
	});
	expect(
		new FrozenPatty('<a data-field="href:href"></a>').merge({ href: '' }).toDOM()
			.children[0].href,
	).toBe('https://www.d-zero.co.jp/');
	expect(
		new FrozenPatty('<a data-field="href:href"></a>').merge({ href: 'abc' }).toDOM()
			.children[0].href,
	).toBe('https://www.d-zero.co.jp/abc');
	expect(
		new FrozenPatty('<a data-field="href:href"></a>').merge({ href: true }).toDOM()
			.children[0].href,
	).toBe('https://www.d-zero.co.jp/true');
	expect(
		new FrozenPatty('<a data-field="href:href"></a>').merge({ href: false }).toDOM()
			.children[0].href,
	).toBe('https://www.d-zero.co.jp/false');
	expect(
		new FrozenPatty('<a data-field="href:href"></a>').merge({ href: 123 }).toDOM()
			.children[0].href,
	).toBe('https://www.d-zero.co.jp/123');
	expect(
		new FrozenPatty('<a data-field="href:href"></a>').merge({ href: 123.1 }).toDOM()
			.children[0].href,
	).toBe('https://www.d-zero.co.jp/123.1');
	expect(
		new FrozenPatty('<a data-field="href:href"></a>').merge({ href: 0.1 }).toDOM()
			.children[0].href,
	).toBe('https://www.d-zero.co.jp/0.1');
	expect(
		new FrozenPatty('<a data-field="href:href"></a>').merge({ href: null }).toDOM()
			.children[0].href,
	).toBe('');
	expect(
		new FrozenPatty('<a data-field="href:href"></a>')
			.merge({ href: null })
			.toDOM()
			.children[0].hasAttribute('href'),
	).toBe(false);
	expect(
		new FrozenPatty('<a data-field="href:href"></a>').merge({}).toDOM().children[0].href,
	).toBe('https://www.d-zero.co.jp/');
	expect(
		new FrozenPatty('<a data-field="href:href"></a>')
			.merge({})
			.toDOM()
			.children[0].hasAttribute('href'),
	).toBe(true);
	expect(
		new FrozenPatty('<a href="foo" data-field="href:href"></a>')
			.merge({ href: '' })
			.toDOM().children[0].href,
	).toBe('https://www.d-zero.co.jp/');
	expect(
		new FrozenPatty('<a href="foo" data-field="href:href"></a>')
			.merge({ href: 'abc' })
			.toDOM().children[0].href,
	).toBe('https://www.d-zero.co.jp/abc');
	expect(
		new FrozenPatty('<a href="foo" data-field="href:href"></a>')
			.merge({ href: 'abc/?d=e&f=g' })
			.toDOM().children[0].href,
	).toBe('https://www.d-zero.co.jp/abc/?d=e&f=g');
	expect(
		new FrozenPatty('<a href="foo" data-field="href:href"></a>')
			.merge({ href: true })
			.toDOM().children[0].href,
	).toBe('https://www.d-zero.co.jp/true');
	expect(
		new FrozenPatty('<a href="foo" data-field="href:href"></a>')
			.merge({ href: false })
			.toDOM().children[0].href,
	).toBe('https://www.d-zero.co.jp/false');
	expect(
		new FrozenPatty('<a href="foo" data-field="href:href"></a>')
			.merge({ href: 123 })
			.toDOM().children[0].href,
	).toBe('https://www.d-zero.co.jp/123');
	expect(
		new FrozenPatty('<a href="foo" data-field="href:href"></a>')
			.merge({ href: 123.1 })
			.toDOM().children[0].href,
	).toBe('https://www.d-zero.co.jp/123.1');
	expect(
		new FrozenPatty('<a href="foo" data-field="href:href"></a>')
			.merge({ href: 0.1 })
			.toDOM().children[0].href,
	).toBe('https://www.d-zero.co.jp/0.1');
	expect(
		new FrozenPatty('<a href="foo" data-field="href:href"></a>')
			.merge({ href: null })
			.toDOM().children[0].href,
	).toBe('');
	expect(
		new FrozenPatty('<a href="foo" data-field="href:href"></a>')
			.merge({ href: null })
			.toDOM()
			.children[0].hasAttribute('href'),
	).toBe(false);
	expect(
		new FrozenPatty('<a href="foo" data-field="href:href"></a>')
			.merge({ href: null })
			.toDOM().children[0].outerHTML,
	).toBe('<a data-field="href:href"></a>');
	expect(
		new FrozenPatty('<a href="foo" data-field="href:href"></a>')
			.merge({ href: 'abc/?d=e&f=g' })
			.toDOM().children[0].outerHTML,
	).toBe('<a href="abc/?d=e&amp;f=g" data-field="href:href"></a>');
	expect(
		new FrozenPatty('<a href="foo" data-field="href:href"></a>').merge({}).toDOM()
			.children[0].href,
	).toBe('https://www.d-zero.co.jp/foo');
	expect(
		new FrozenPatty('<a href="foo" data-field="href:href"></a>')
			.merge({})
			.toDOM()
			.children[0].hasAttribute('href'),
	).toBe(true);
});

test('attr: download', () => {
	expect(
		new FrozenPatty('<a download data-field="download:download"></a>').toJSON(),
	).toStrictEqual({
		download: '',
	});
	expect(
		new FrozenPatty('<a download="" data-field="download:download"></a>').toJSON(),
	).toStrictEqual({ download: '' });
	expect(
		new FrozenPatty(
			'<a download="/path/to" data-field="download:download"></a>',
		).toJSON(),
	).toStrictEqual({ download: '/path/to' });
	expect(
		new FrozenPatty('<a download="names" data-field="download:download"></a>').toJSON(),
	).toStrictEqual({ download: 'names' });
	expect(
		new FrozenPatty('<a data-field="download:download"></a>').toJSON(),
	).toStrictEqual({
		download: null,
	});

	expect(
		new FrozenPatty('<a data-field="download:download"></a>')
			.merge({ download: '' })
			.toDOM().children[0].download,
	).toBe('');
	expect(
		new FrozenPatty('<a data-field="download:download"></a>')
			.merge({ download: 'abc' })
			.toDOM().children[0].download,
	).toBe('abc');
	expect(
		new FrozenPatty('<a data-field="download:download"></a>')
			.merge({ download: true })
			.toDOM().children[0].download,
	).toBe('true');
	expect(
		new FrozenPatty('<a data-field="download:download"></a>')
			.merge({ download: false })
			.toDOM().children[0].download,
	).toBe('');
	expect(
		new FrozenPatty('<a data-field="download:download"></a>')
			.merge({ download: 123 })
			.toDOM().children[0].download,
	).toBe('123');
	expect(
		new FrozenPatty('<a data-field="download:download"></a>')
			.merge({ download: 123.1 })
			.toDOM().children[0].download,
	).toBe('123.1');
	expect(
		new FrozenPatty('<a data-field="download:download"></a>')
			.merge({ download: 0 })
			.toDOM().children[0].download,
	).toBe('');
	expect(
		new FrozenPatty('<a data-field="download:download"></a>')
			.merge({ download: 0.1 })
			.toDOM().children[0].download,
	).toBe('0.1');
	expect(
		new FrozenPatty('<a data-field="download:download"></a>')
			.merge({ download: 0.1 })
			.toDOM().children[0].download,
	).toBe('0.1');
	expect(
		new FrozenPatty('<a data-field="download:download"></a>')
			.merge({ download: null })
			.toDOM().children[0].download,
	).toBe('');
	expect(
		new FrozenPatty('<a data-field="download:download"></a>')
			.merge({ download: null })
			.toDOM()
			.children[0].hasAttribute('download'),
	).toBe(false);
	expect(
		new FrozenPatty('<a data-field="download:download"></a>').merge({}).toDOM()
			.children[0].download,
	).toBe('');
	expect(
		new FrozenPatty('<a data-field="download:download"></a>')
			.merge({})
			.toDOM()
			.children[0].hasAttribute('download'),
	).toBe(false);
	expect(
		new FrozenPatty('<a download="foo" data-field="download:download"></a>')
			.merge({ download: '' })
			.toDOM().children[0].download,
	).toBe('');
	expect(
		new FrozenPatty('<a download="foo" data-field="download:download"></a>')
			.merge({ download: 'abc' })
			.toDOM().children[0].download,
	).toBe('abc');
	expect(
		new FrozenPatty('<a download="foo" data-field="download:download"></a>')
			.merge({ download: true })
			.toDOM().children[0].download,
	).toBe('true');
	expect(
		new FrozenPatty('<a download="foo" data-field="download:download"></a>')
			.merge({ download: false })
			.toDOM().children[0].download,
	).toBe('');
	expect(
		new FrozenPatty('<a download="foo" data-field="download:download"></a>')
			.merge({ download: 123 })
			.toDOM().children[0].download,
	).toBe('123');
	expect(
		new FrozenPatty('<a download="foo" data-field="download:download"></a>')
			.merge({ download: 123.1 })
			.toDOM().children[0].download,
	).toBe('123.1');
	expect(
		new FrozenPatty('<a download="foo" data-field="download:download"></a>')
			.merge({ download: 0 })
			.toDOM().children[0].download,
	).toBe('');
	expect(
		new FrozenPatty('<a download="foo" data-field="download:download"></a>')
			.merge({ download: 0.1 })
			.toDOM().children[0].download,
	).toBe('0.1');
	expect(
		new FrozenPatty('<a download="foo" data-field="download:download"></a>')
			.merge({ download: 0.1 })
			.toDOM().children[0].download,
	).toBe('0.1');
	expect(
		new FrozenPatty('<a download="foo" data-field="download:download"></a>')
			.merge({ download: null })
			.toDOM().children[0].download,
	).toBe('');
	expect(
		new FrozenPatty('<a download="foo" data-field="download:download"></a>')
			.merge({ download: null })
			.toDOM()
			.children[0].hasAttribute('download'),
	).toBe(false);
	expect(
		new FrozenPatty('<a download="foo" data-field="download:download"></a>')
			.merge({ download: null })
			.toDOM().children[0].outerHTML,
	).toBe('<a data-field="download:download"></a>');
	expect(
		new FrozenPatty('<a download="foo" data-field="download:download"></a>')
			.merge({})
			.toDOM().children[0].download,
	).toBe('foo');
	expect(
		new FrozenPatty('<a download="foo" data-field="download:download"></a>')
			.merge({})
			.toDOM()
			.children[0].hasAttribute('download'),
	).toBe(true);
});

test('attr: style', () => {
	expect(
		new FrozenPatty(
			'<div data-field="color:style(color)" style="color: #000"></div>',
		).toJSON(),
	).toStrictEqual({ color: 'rgb(0, 0, 0)' });

	expect(
		new FrozenPatty(
			'<div data-field="bg:style(background-image)" style="background-image: url(/path/to/image.webp)"></div>',
		).toJSON(),
	).toStrictEqual({ bg: '/path/to/image.webp' });

	expect(
		new FrozenPatty(
			'<div data-field="bg:style(background-image)" style="background-image: url(/path/to/image__file--name-01234.zZzZ==.webp)"></div>',
		).toJSON(),
	).toStrictEqual({ bg: '/path/to/image__file--name-01234.zZzZ==.webp' });

	expect(
		new FrozenPatty(
			'<div data-field="bg:style(background-image), other" style="background-image: url(/path/to/image__file--name-01234.zZzZ==.webp)"></div>',
		).toJSON(),
	).toStrictEqual({ other: '', bg: '/path/to/image__file--name-01234.zZzZ==.webp' });

	expect(
		new FrozenPatty(
			'<div data-field="bg:style(background-image), other" style="background-image: url(\'/path/to/image__file--name-01234.zZzZ==.webp\')"></div>',
		).toJSON(),
	).toStrictEqual({ other: '', bg: '/path/to/image__file--name-01234.zZzZ==.webp' });

	expect(
		new FrozenPatty(
			'<div data-field="bg:style(background-image), other" style=\'background-image: url("/path/to/image__file--name-01234.zZzZ==.webp")\'></div>',
		).toJSON(),
	).toStrictEqual({ other: '', bg: '/path/to/image__file--name-01234.zZzZ==.webp' });

	expect(
		new FrozenPatty(
			`
			<a  href="/path/to/image.webp" data-field="path:href">
			<div class="bgi-box__image" data-field="path:style(background-image)" style="background-image: url(/path/to/image.webp)"></div>
			</a>
			`,
		).toJSON(),
	).toStrictEqual({ path: '/path/to/image.webp' });
});

test('picture (Specific case)', () => {
	const fp = new FrozenPatty(
		[
			'<picture data-field-list>',
			'<img src="/path/to/4" alt="" width="100" height="100" data-field="path:src, :alt, :width, :height, :media">',
			'</picture>',
		].join(''),
		{
			typeConvert: true,
		},
	);
	fp.merge({
		path: ['/path/to/1', '/path/to/2', '/path/to/3', '/path/to/4'],
		width: [100, 200, 300, 400],
		height: [10, 20, 30, 40],
		media: [
			'(min-width: 1000px)',
			'(min-width: 2000px)',
			'(min-width: 3000px)',
			'(min-width: 4000px)',
		],
		alt: ['alternative text'],
	});

	const elements = [...fp.toDOM().firstChild.children];

	// 各要素が期待される属性を持っているか確認
	expect(elements.length).toBe(4);

	// source要素の確認
	expect(elements[0].localName).toBe('source');
	expect(elements[0].getAttribute('srcset')).toBe('/path/to/4');
	expect(elements[0].getAttribute('width')).toBe('400');
	expect(elements[0].getAttribute('height')).toBe('40');
	expect(elements[0].getAttribute('media')).toBe('(min-width: 4000px)');
	expect(elements[0].dataset.field).toBe('path:srcset, :width, :height, :media');

	expect(elements[1].localName).toBe('source');
	expect(elements[1].getAttribute('srcset')).toBe('/path/to/3');
	expect(elements[1].getAttribute('width')).toBe('300');
	expect(elements[1].getAttribute('height')).toBe('30');
	expect(elements[1].getAttribute('media')).toBe('(min-width: 3000px)');
	expect(elements[1].dataset.field).toBe('path:srcset, :width, :height, :media');

	expect(elements[2].localName).toBe('source');
	expect(elements[2].getAttribute('srcset')).toBe('/path/to/2');
	expect(elements[2].getAttribute('width')).toBe('200');
	expect(elements[2].getAttribute('height')).toBe('20');
	expect(elements[2].getAttribute('media')).toBe('(min-width: 2000px)');
	expect(elements[2].dataset.field).toBe('path:srcset, :width, :height, :media');

	// img要素の確認
	expect(elements[3].localName).toBe('img');
	expect(elements[3].getAttribute('src')).toBe('/path/to/1');
	expect(elements[3].getAttribute('alt')).toBe('alternative text');
	expect(elements[3].getAttribute('width')).toBe('100');
	expect(elements[3].getAttribute('height')).toBe('10');
	expect(elements[3].dataset.field).toBe('path:src, :alt, :width, :height, :media');

	expect(fp.toJSON()).toStrictEqual({
		alt: ['alternative text'],
		path: ['/path/to/1', '/path/to/2', '/path/to/3', '/path/to/4'],
		width: [100, 200, 300, 400],
		height: [10, 20, 30, 40],
		media: [null, '(min-width: 2000px)', '(min-width: 3000px)', '(min-width: 4000px)'],
	});
});

test('picture with duplicate paths - duplicates are removed', () => {
	const fp = new FrozenPatty(
		[
			'<picture data-field-list>',
			'<img src="/path/to/1" alt="" width="100" height="100" data-field="path:src, :alt, :width, :height, :media">',
			'</picture>',
		].join(''),
		{
			typeConvert: true,
		},
	);
	fp.merge({
		path: ['/path/to/1', '/path/to/2', '/path/to/1', '/path/to/3', '/path/to/2'], // Duplicates: /path/to/1 appears at index 0 and 2, /path/to/2 appears at index 1 and 4
		width: [100, 200, 300, 400, 500],
		height: [10, 20, 30, 40, 50],
		media: [
			null,
			'(min-width: 1000px)',
			'(min-width: 2000px)',
			'(min-width: 3000px)',
			'(min-width: 4000px)',
		],
		alt: ['alternative text'],
	});

	const elements = [...fp.toDOM().firstChild.children];

	// Only 3 elements should be created (unique paths: /path/to/1, /path/to/2, /path/to/3)
	expect(elements.length).toBe(3);

	// source要素の確認 (reversed order)
	expect(elements[0].localName).toBe('source');
	expect(elements[0].getAttribute('srcset')).toBe('/path/to/3');
	expect(elements[0].getAttribute('width')).toBe('400');
	expect(elements[0].getAttribute('height')).toBe('40');
	expect(elements[0].getAttribute('media')).toBe('(min-width: 3000px)');

	expect(elements[1].localName).toBe('source');
	expect(elements[1].getAttribute('srcset')).toBe('/path/to/2');
	expect(elements[1].getAttribute('width')).toBe('200');
	expect(elements[1].getAttribute('height')).toBe('20');
	expect(elements[1].getAttribute('media')).toBe('(min-width: 1000px)');

	// img要素の確認
	expect(elements[2].localName).toBe('img');
	expect(elements[2].getAttribute('src')).toBe('/path/to/1');
	expect(elements[2].getAttribute('alt')).toBe('alternative text');
	expect(elements[2].getAttribute('width')).toBe('100');
	expect(elements[2].getAttribute('height')).toBe('10');

	expect(fp.toJSON()).toStrictEqual({
		alt: ['alternative text'],
		path: ['/path/to/1', '/path/to/2', '/path/to/3'],
		width: [100, 200, 400],
		height: [10, 20, 40],
		media: [null, '(min-width: 1000px)', '(min-width: 3000px)'],
	});
});

test('toHTML()', () => {
	const fp = new FrozenPatty('<div data-foo="bar" data-field="foo:data-foo"></div>');
	expect(fp.toHTML()).toBe('<div data-foo="bar" data-field="foo:data-foo"></div>');
});

test('toHTML()', () => {
	const fp = new FrozenPatty('<div data-foo="bar" data-field="foo:data-foo"></div>');
	expect(fp.merge({ foo: 'bar' }).toHTML()).toBe(
		'<div data-foo="bar" data-field="foo:data-foo"></div>',
	);
});

test('XSS protection - script tags are removed by default', () => {
	const fp = new FrozenPatty('<div data-field="content"></div>');
	fp.merge({ content: '<script>alert("XSS")</script>' });

	expect(fp.toHTML()).not.toContain('<script>');
});

test('XSS protection - script tags are removed when explicitly enabled', () => {
	const fp = new FrozenPatty('<div data-field="content"></div>', { xssSanitize: true });
	fp.merge({ content: '<script>alert("XSS")</script>' });

	expect(fp.toHTML()).not.toContain('<script>');
});

test('XSS protection - script tags are preserved when disabled', () => {
	const fp = new FrozenPatty('<div data-field="content"></div>', { xssSanitize: false });
	fp.merge({ content: '<script>alert("XSS")</script>' });

	expect(fp.toHTML()).toContain('<script>');
});

test('XSS protection - iframe elements are sanitized', () => {
	const fp = new FrozenPatty('<div data-field="content"></div>');
	fp.merge({ content: '<iframe src="javascript:alert(\'XSS\')"></iframe>' });

	expect(fp.toHTML()).not.toContain('<iframe');
});

test('XSS protection - object elements are sanitized', () => {
	const fp = new FrozenPatty('<div data-field="content"></div>');
	fp.merge({ content: '<object data="javascript:alert(\'XSS\')"></object>' });

	expect(fp.toHTML()).not.toContain('<object');
});

test('XSS protection - embed elements are sanitized', () => {
	const fp = new FrozenPatty('<div data-field="content"></div>');
	fp.merge({ content: '<embed src="javascript:alert(\'XSS\')"></embed>' });

	expect(fp.toHTML()).not.toContain('<embed');
});

test('XSS protection - onclick attribute is blocked from being set', () => {
	const fp = new FrozenPatty('<button data-field="button:onclick"></button>');
	fp.merge({ button: 'alert("XSS")' });

	expect(fp.toDOM().querySelector('button').hasAttribute('onclick')).toBe(false);
});

test('XSS protection - onmouseover attribute is blocked from being set', () => {
	const fp = new FrozenPatty('<div data-field="handler:onmouseover"></div>');
	fp.merge({ handler: 'alert("XSS")' });

	expect(fp.toDOM().querySelector('div').hasAttribute('onmouseover')).toBe(false);
});

test('XSS protection - onerror attribute is blocked from being set', () => {
	const fp = new FrozenPatty('<div data-field="handler:onerror"></div>');
	fp.merge({ handler: 'alert("XSS")' });

	expect(fp.toDOM().querySelector('div').hasAttribute('onerror')).toBe(false);
});

test('XSS protection - onload attribute is blocked from being set', () => {
	const fp = new FrozenPatty('<div data-field="handler:onload"></div>');
	fp.merge({ handler: 'alert("XSS")' });

	expect(fp.toDOM().querySelector('div').hasAttribute('onload')).toBe(false);
});

test('XSS protection - javascript protocol in href attribute is blocked', () => {
	const fp = new FrozenPatty('<a data-field="link:href"></a>');
	fp.merge({ link: 'javascript:alert("XSS")' });
	const el = fp.toDOM().querySelector('a');

	expect(el.getAttribute('href')).toBeFalsy();
});

test('XSS protection - regular URLs in href are preserved correctly', () => {
	const fp = new FrozenPatty('<a data-field="link:href"></a>');
	fp.merge({ link: '/safe/path' });
	const href = fp.toDOM().querySelector('a').getAttribute('href');

	expect(href).toBe('/safe/path');
});

test('XSS protection - javascript protocol in src attribute is blocked', () => {
	const fp = new FrozenPatty('<img data-field="image:src">');
	fp.merge({ image: 'javascript:alert("XSS")' });
	const el = fp.toDOM().querySelector('img');

	expect(el.getAttribute('src')).toBeFalsy();
});

test('XSS protection - regular URLs in src are preserved correctly', () => {
	const fp = new FrozenPatty('<img data-field="image:src">');
	fp.merge({ image: '/path/to/image.png' });
	const src = fp.toDOM().querySelector('img').getAttribute('src');

	expect(src).toBe('/path/to/image.png');
});

test('XSS protection - data:text/html scheme in src attribute is blocked', () => {
	const fp = new FrozenPatty('<img data-field="image:src">');
	fp.merge({ image: 'data:text/html,<script>alert("XSS")</script>' });
	const el = fp.toDOM().querySelector('img');

	expect(el.getAttribute('src')).toBeFalsy();
});

test('XSS protection - even safe data:image/png URLs are blocked for security', () => {
	const fp = new FrozenPatty('<img data-field="image:src">');
	const safeDataUrl =
		'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
	fp.merge({ image: safeDataUrl });
	const el = fp.toDOM().querySelector('img');

	expect(el.getAttribute('src')).toBeFalsy();
});

test('XSS protection - https URLs are allowed and preserved', () => {
	const fp = new FrozenPatty('<img data-field="image:src">');
	fp.merge({ image: 'https://example.com/image.png' });
	const src = fp.toDOM().querySelector('img').getAttribute('src');

	expect(src).toBe('https://example.com/image.png');
});

test('XSS protection - http URLs are allowed and preserved', () => {
	const fp = new FrozenPatty('<img data-field="image:src">');
	fp.merge({ image: 'http://example.com/image.png' });
	const src = fp.toDOM().querySelector('img').getAttribute('src');

	expect(src).toBe('http://example.com/image.png');
});

test('XSS protection - changing node type to script element is prevented', () => {
	const fp = new FrozenPatty('<div data-field="element:node"></div>');
	fp.merge({ element: 'script' });

	expect(fp.toHTML()).not.toContain('<script');
});

test('XSS protection - changing node type to safe elements like span is allowed', () => {
	const fp = new FrozenPatty('<div data-field="element:node"></div>');
	fp.merge({ element: 'span' });

	expect(fp.toHTML()).toContain('<span');
});

test('XSS protection - initial HTML content is sanitized by default', () => {
	const fp = new FrozenPatty('<div><script>alert("XSS")</script></div>');

	expect(fp.toHTML()).not.toContain('<script>');
});

test('XSS protection - initial HTML sanitization can be disabled with option', () => {
	const fp = new FrozenPatty('<div><script>alert("XSS")</script></div>', {
		xssSanitize: false,
	});

	expect(fp.toHTML()).toContain('<script>');
});
