// @ts-nocheck

import FrozenPatty from './frozen-patty';

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
	expect(fp.toJSON()).toStrictEqual({ 'field-name': 'value' });
});

test('toJSON optional attribute field', () => {
	const fp = new FrozenPatty(
		'<div data-option="value" data-field="field-name:data-option"></div>',
	);
	expect(fp.toJSON()).toStrictEqual({ 'field-name': 'value' });
});

test('toJSON optional attribute field - empty string', () => {
	const fp = new FrozenPatty(
		'<div data-option="" data-field="field-name:data-option"></div>',
	);
	expect(fp.toJSON()).toStrictEqual({ 'field-name': '' });
});

test('toJSON optional attribute field - no value', () => {
	const fp = new FrozenPatty(
		'<div data-option data-field="field-name:data-option"></div>',
	);
	expect(fp.toJSON()).toStrictEqual({ 'field-name': '' });
});

test('toJSON optional attribute field - stringify true', () => {
	const fp = new FrozenPatty(
		'<div data-option="true" data-field="field-name:data-option"></div>',
	);
	expect(fp.toJSON()).toStrictEqual({ 'field-name': 'true' });
});

test('toJSON optional attribute field - stringify false', () => {
	const fp = new FrozenPatty(
		'<div data-option="false" data-field="field-name:data-option"></div>',
	);
	expect(fp.toJSON()).toStrictEqual({ 'field-name': 'false' });
});

test('toJSON optional attribute field - stringify true - type conversion', () => {
	const fp = new FrozenPatty(
		'<div data-option="true" data-field="field-name:data-option"></div>',
		{ typeConvert: true },
	);
	expect(fp.toJSON()).toStrictEqual({ 'field-name': true });
});

test('toJSON optional attribute field - stringify false - type conversion', () => {
	const fp = new FrozenPatty(
		'<div data-option="false" data-field="field-name:data-option"></div>',
		{ typeConvert: true },
	);
	expect(fp.toJSON()).toStrictEqual({ 'field-name': false });
});

test('toJSON optional attribute field - stringify number', () => {
	const fp = new FrozenPatty(
		'<div data-option="0" data-field="field-name:data-option"></div>',
	);
	expect(fp.toJSON()).toStrictEqual({ 'field-name': '0' });
});

test('toJSON optional attribute field - stringify number - type conversion', () => {
	const fp = new FrozenPatty(
		'<div data-option="0" data-field="field-name:data-option"></div>',
		{ typeConvert: true },
	);
	expect(fp.toJSON()).toStrictEqual({ 'field-name': 0 });
});

test('toJSON optional attribute field - stringify number', () => {
	const fp = new FrozenPatty(
		'<div data-option="1" data-field="field-name:data-option"></div>',
	);
	expect(fp.toJSON()).toStrictEqual({ 'field-name': '1' });
});

test('toJSON optional attribute field - stringify number - type conversion', () => {
	const fp = new FrozenPatty(
		'<div data-option="1" data-field="field-name:data-option"></div>',
		{ typeConvert: true },
	);
	expect(fp.toJSON()).toStrictEqual({ 'field-name': 1 });
});

test('toJSON optional attribute field - stringify number', () => {
	const fp = new FrozenPatty(
		'<div data-option="1.0" data-field="field-name:data-option"></div>',
	);
	expect(fp.toJSON()).toStrictEqual({ 'field-name': '1.0' });
});

test('toJSON optional attribute field - stringify number - type conversion', () => {
	const fp = new FrozenPatty(
		'<div data-option="1.0" data-field="field-name:data-option"></div>',
		{ typeConvert: true },
	);
	expect(fp.toJSON()).toStrictEqual({ 'field-name': 1 });
});

test('toJSON optional attribute field - stringify number', () => {
	const fp = new FrozenPatty(
		'<div data-option="0.1" data-field="field-name:data-option"></div>',
	);
	expect(fp.toJSON()).toStrictEqual({ 'field-name': '0.1' });
});

test('toJSON optional attribute field - stringify number - type conversion', () => {
	const fp = new FrozenPatty(
		'<div data-option="0.1" data-field="field-name:data-option"></div>',
		{ typeConvert: true },
	);
	expect(fp.toJSON()).toStrictEqual({ 'field-name': 0.1 });
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
		fp
			.toDOM()
			.querySelectorAll('[data-field*="prop07"]')
			.item(0)
			.getAttribute('href'),
	).toBe('prop07-href-01-rewrite');
	expect(
		fp
			.toDOM()
			.querySelectorAll('[data-field*="prop07"]')
			.item(1)
			.getAttribute('href'),
	).toBe('prop07-href-02-add');
	expect(
		fp
			.toDOM()
			.querySelectorAll('[data-field*="prop07"]')
			.item(2)
			.getAttribute('href'),
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

test('attr: contenteditable', () => {
	// jest.('⚰ JSDom is unsupported contenteditable.');
	// const fp = new FrozenPatty('<div data-field="edit:contenteditable" contenteditable>text</div>');
	// const fp2 = new FrozenPatty('<div data-field="edit:contenteditable">text</div>');
	// expect(fp.toJSON(), { edit: true });
	// expect(fp2.toJSON(), { edit: false });
	// expect(fp.merge({ edit: '' }).toDOM().children[0].isContentEditable).toBe('true');
	// expect(fp.merge({ edit: 'true' }).toDOM().children[0].isContentEditable).toBe('true');
	// expect(fp.merge({ edit: true }).toDOM().children[0].isContentEditable).toBe(
	// 	undefined,
	// );
	// expect(fp.merge({ edit: false }).toDOM().children[0].isContentEditable).toBe(
	// 	undefined,
	// );
	// expect(fp.merge({ edit: 'abc' }).toDOM().children[0].isContentEditable).toBe(
	// 	undefined,
	// );
	// expect(fp.merge({ edit: '' }).toDOM().children[0].isContentEditable).toBe(undefined);
	// expect(fp.merge({ edit: 1 }).toDOM().children[0].isContentEditable).toBe(undefined);
	// expect(fp.merge({ edit: 0 }).toDOM().children[0].isContentEditable).toBe(undefined);
	// expect(fp.merge({ edit: null }).toDOM().children[0].isContentEditable).toBe(
	// 	undefined,
	// );
});

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
	expect(new FrozenPatty('<a href data-field="href:href"></a>').toJSON()).toStrictEqual(
		{
			href: '',
		},
	);
	expect(
		new FrozenPatty('<a href="" data-field="href:href"></a>').toJSON(),
	).toStrictEqual({
		href: '',
	});
	expect(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>').toJSON(),
	).toStrictEqual({
		href: 'hoge',
	});
	expect(
		new FrozenPatty('<a href="abc/?d=e&f=g" data-field="href:href"></a>').toJSON(),
	).toStrictEqual({ href: 'abc/?d=e&f=g' });
	expect(
		new FrozenPatty(
			'<a href="hij/?k=l&amp;m=n" data-field="href:href"></a>',
		).toJSON(),
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
		new FrozenPatty('<a data-field="href:href"></a>').merge({}).toDOM().children[0]
			.href,
	).toBe('https://www.d-zero.co.jp/');
	expect(
		new FrozenPatty('<a data-field="href:href"></a>')
			.merge({})
			.toDOM()
			.children[0].hasAttribute('href'),
	).toBe(true);
	expect(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>')
			.merge({ href: '' })
			.toDOM().children[0].href,
	).toBe('https://www.d-zero.co.jp/');
	expect(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>')
			.merge({ href: 'abc' })
			.toDOM().children[0].href,
	).toBe('https://www.d-zero.co.jp/abc');
	expect(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>')
			.merge({ href: 'abc/?d=e&f=g' })
			.toDOM().children[0].href,
	).toBe('https://www.d-zero.co.jp/abc/?d=e&f=g');
	expect(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>')
			.merge({ href: true })
			.toDOM().children[0].href,
	).toBe('https://www.d-zero.co.jp/true');
	expect(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>')
			.merge({ href: false })
			.toDOM().children[0].href,
	).toBe('https://www.d-zero.co.jp/false');
	expect(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>')
			.merge({ href: 123 })
			.toDOM().children[0].href,
	).toBe('https://www.d-zero.co.jp/123');
	expect(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>')
			.merge({ href: 123.1 })
			.toDOM().children[0].href,
	).toBe('https://www.d-zero.co.jp/123.1');
	expect(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>')
			.merge({ href: 0.1 })
			.toDOM().children[0].href,
	).toBe('https://www.d-zero.co.jp/0.1');
	expect(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>')
			.merge({ href: null })
			.toDOM().children[0].href,
	).toBe('');
	expect(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>')
			.merge({ href: null })
			.toDOM()
			.children[0].hasAttribute('href'),
	).toBe(false);
	expect(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>')
			.merge({ href: null })
			.toDOM().children[0].outerHTML,
	).toBe('<a data-field="href:href"></a>');
	expect(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>')
			.merge({ href: 'abc/?d=e&f=g' })
			.toDOM().children[0].outerHTML,
	).toBe('<a href="abc/?d=e&amp;f=g" data-field="href:href"></a>');
	expect(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>').merge({}).toDOM()
			.children[0].href,
	).toBe('https://www.d-zero.co.jp/hoge');
	expect(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>')
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
		new FrozenPatty(
			'<a download="names" data-field="download:download"></a>',
		).toJSON(),
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
		new FrozenPatty('<a download="hoge" data-field="download:download"></a>')
			.merge({ download: '' })
			.toDOM().children[0].download,
	).toBe('');
	expect(
		new FrozenPatty('<a download="hoge" data-field="download:download"></a>')
			.merge({ download: 'abc' })
			.toDOM().children[0].download,
	).toBe('abc');
	expect(
		new FrozenPatty('<a download="hoge" data-field="download:download"></a>')
			.merge({ download: true })
			.toDOM().children[0].download,
	).toBe('true');
	expect(
		new FrozenPatty('<a download="hoge" data-field="download:download"></a>')
			.merge({ download: false })
			.toDOM().children[0].download,
	).toBe('');
	expect(
		new FrozenPatty('<a download="hoge" data-field="download:download"></a>')
			.merge({ download: 123 })
			.toDOM().children[0].download,
	).toBe('123');
	expect(
		new FrozenPatty('<a download="hoge" data-field="download:download"></a>')
			.merge({ download: 123.1 })
			.toDOM().children[0].download,
	).toBe('123.1');
	expect(
		new FrozenPatty('<a download="hoge" data-field="download:download"></a>')
			.merge({ download: 0 })
			.toDOM().children[0].download,
	).toBe('');
	expect(
		new FrozenPatty('<a download="hoge" data-field="download:download"></a>')
			.merge({ download: 0.1 })
			.toDOM().children[0].download,
	).toBe('0.1');
	expect(
		new FrozenPatty('<a download="hoge" data-field="download:download"></a>')
			.merge({ download: 0.1 })
			.toDOM().children[0].download,
	).toBe('0.1');
	expect(
		new FrozenPatty('<a download="hoge" data-field="download:download"></a>')
			.merge({ download: null })
			.toDOM().children[0].download,
	).toBe('');
	expect(
		new FrozenPatty('<a download="hoge" data-field="download:download"></a>')
			.merge({ download: null })
			.toDOM()
			.children[0].hasAttribute('download'),
	).toBe(false);
	expect(
		new FrozenPatty('<a download="hoge" data-field="download:download"></a>')
			.merge({ download: null })
			.toDOM().children[0].outerHTML,
	).toBe('<a data-field="download:download"></a>');
	expect(
		new FrozenPatty('<a download="hoge" data-field="download:download"></a>')
			.merge({})
			.toDOM().children[0].download,
	).toBe('hoge');
	expect(
		new FrozenPatty('<a download="hoge" data-field="download:download"></a>')
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
			<div class="bgt-box__image" data-field="path:style(background-image)" style="background-image: url(/path/to/image.webp)"></div>
			</a>
			`,
		).toJSON(),
	).toStrictEqual({ path: '/path/to/image.webp' });
});

test('toHTML()', () => {
	const fp = new FrozenPatty(
		'<div data-hoge="fuga" data-field="hoge:data-hoge"></div>',
	);
	expect(fp.toHTML()).toBe('<div data-hoge="fuga" data-field="hoge:data-hoge"></div>');
});

test('toHTML()', () => {
	const fp = new FrozenPatty(
		'<div data-hoge="fuga" data-field="hoge:data-hoge"></div>',
	);
	expect(fp.merge({ hoge: 'piyo' }).toHTML()).toBe(
		'<div data-hoge="piyo" data-field="hoge:data-hoge"></div>',
	);
});
