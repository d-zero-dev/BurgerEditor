import test from 'ava';
import FrozenPatty from '../lib/frozen-patty';

test('toDOM', t => {
	const fp = new FrozenPatty('<div data-field="text">value</div>');
	t.is(fp.toHTML(), '<div data-field="text">value</div>');
});

test('toJSON basic', t => {
	const fp = new FrozenPatty('<div data-field="text">value</div>');
	t.deepEqual(fp.toJSON(), { text: 'value' });
});

test('toJSON filter', t => {
	const fp = new FrozenPatty('<div data-field="text">value</div>', {
		valueFilter: v => v.toUpperCase(),
	});
	t.deepEqual(fp.toJSON(), { text: 'VALUE' });
});

test('toJSON attribute field', t => {
	const fp = new FrozenPatty(
		'<a href="http://localhost" data-field="href:href">link</a>',
	);
	t.deepEqual(fp.toJSON(), { href: 'http://localhost' });
});

test('toJSON optional field name', t => {
	const fp = new FrozenPatty('<div data-field="field-name">value</div>');
	t.deepEqual(fp.toJSON(), { 'field-name': 'value' });
});

test('toJSON optional attribute field', t => {
	const fp = new FrozenPatty(
		'<div data-option="value" data-field="field-name:data-option"></div>',
	);
	t.deepEqual(fp.toJSON(), { 'field-name': 'value' });
});

test('toJSON optional attribute field - empty string', t => {
	const fp = new FrozenPatty(
		'<div data-option="" data-field="field-name:data-option"></div>',
	);
	t.deepEqual(fp.toJSON(), { 'field-name': '' });
});

test('toJSON optional attribute field - no value', t => {
	const fp = new FrozenPatty(
		'<div data-option data-field="field-name:data-option"></div>',
	);
	t.deepEqual(fp.toJSON(), { 'field-name': '' });
});

test('toJSON optional attribute field - stringify true', t => {
	const fp = new FrozenPatty(
		'<div data-option="true" data-field="field-name:data-option"></div>',
	);
	t.deepEqual(fp.toJSON(), { 'field-name': 'true' });
});

test('toJSON optional attribute field - stringify false', t => {
	const fp = new FrozenPatty(
		'<div data-option="false" data-field="field-name:data-option"></div>',
	);
	t.deepEqual(fp.toJSON(), { 'field-name': 'false' });
});

test('toJSON optional attribute field - stringify true - type conversion', t => {
	const fp = new FrozenPatty(
		'<div data-option="true" data-field="field-name:data-option"></div>',
		{ typeConvert: true },
	);
	t.deepEqual(fp.toJSON(), { 'field-name': true });
});

test('toJSON optional attribute field - stringify false - type conversion', t => {
	const fp = new FrozenPatty(
		'<div data-option="false" data-field="field-name:data-option"></div>',
		{ typeConvert: true },
	);
	t.deepEqual(fp.toJSON(), { 'field-name': false });
});

test('toJSON optional attribute field - stringify number', t => {
	const fp = new FrozenPatty(
		'<div data-option="0" data-field="field-name:data-option"></div>',
	);
	t.deepEqual(fp.toJSON(), { 'field-name': '0' });
});

test('toJSON optional attribute field - stringify number - type conversion', t => {
	const fp = new FrozenPatty(
		'<div data-option="0" data-field="field-name:data-option"></div>',
		{ typeConvert: true },
	);
	t.deepEqual(fp.toJSON(), { 'field-name': 0 });
});

test('toJSON optional attribute field - stringify number', t => {
	const fp = new FrozenPatty(
		'<div data-option="1" data-field="field-name:data-option"></div>',
	);
	t.deepEqual(fp.toJSON(), { 'field-name': '1' });
});

test('toJSON optional attribute field - stringify number - type conversion', t => {
	const fp = new FrozenPatty(
		'<div data-option="1" data-field="field-name:data-option"></div>',
		{ typeConvert: true },
	);
	t.deepEqual(fp.toJSON(), { 'field-name': 1 });
});

test('toJSON optional attribute field - stringify number', t => {
	const fp = new FrozenPatty(
		'<div data-option="1.0" data-field="field-name:data-option"></div>',
	);
	t.deepEqual(fp.toJSON(), { 'field-name': '1.0' });
});

test('toJSON optional attribute field - stringify number - type conversion', t => {
	const fp = new FrozenPatty(
		'<div data-option="1.0" data-field="field-name:data-option"></div>',
		{ typeConvert: true },
	);
	t.deepEqual(fp.toJSON(), { 'field-name': 1 });
});

test('toJSON optional attribute field - stringify number', t => {
	const fp = new FrozenPatty(
		'<div data-option="0.1" data-field="field-name:data-option"></div>',
	);
	t.deepEqual(fp.toJSON(), { 'field-name': '0.1' });
});

test('toJSON optional attribute field - stringify number - type conversion', t => {
	const fp = new FrozenPatty(
		'<div data-option="0.1" data-field="field-name:data-option"></div>',
		{ typeConvert: true },
	);
	t.deepEqual(fp.toJSON(), { 'field-name': 0.1 });
});

test('toJSON custom attr name', t => {
	const fp = new FrozenPatty('<div data-bge="text">value</div>', { attr: 'bge' });
	t.deepEqual(fp.toJSON(), { text: 'value' });
});

test('Merge data', t => {
	const fp = new FrozenPatty('<div data-field="text">value</div>');
	fp.merge({ text: 'merged' });
	t.deepEqual(fp.toJSON(), { text: 'merged' });
});

test('Merge filtered data', t => {
	const fp = new FrozenPatty('<div data-field="text">value</div>', {
		valueFilter: v => v.toUpperCase(),
	});
	fp.merge({ text: 'merged' });
	t.deepEqual(fp.toJSON(), { text: 'MERGED' });
});

test('Full Data', t => {
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
	t.deepEqual(fp.toJSON(), {
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

test('Full data merge', t => {
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
	t.is(
		fp.toDOM().querySelector('[data-field*="prop01"]').innerHTML,
		'prop01-text-rewrite',
	);
	t.is(
		fp.toDOM().querySelector('[data-field*="prop02"]').innerHTML,
		'<span id="prop02-html">prop02-html-rewrite</span>',
	);
	t.truthy(fp.toDOM().querySelector('#prop02-html'));
	t.is(
		fp
			.toDOM()
			.querySelector('[data-field="prop03:title"]')
			.getAttribute('title'),
		'prop03-rewrite',
	);
	t.is(fp.toDOM().querySelector('[data-field="prop03"]').innerHTML, 'prop03-rewrite');
	t.is(
		fp
			.toDOM()
			.querySelector('[data-field*="prop04:data-attr"]')
			.getAttribute('data-attr'),
		'prop04-data-attr-rewrite',
	);
	t.is(
		fp.toDOM().querySelector('[data-field*="prop05"]').innerHTML,
		'prop05-text-write',
	);
	t.is(fp.toDOM().querySelectorAll('[data-field*="prop06"]').length, 4);
	t.is(
		fp
			.toDOM()
			.querySelectorAll('[data-field*="prop06"]')
			.item(0).innerHTML,
		'prop06-text-01-rewrite',
	);
	t.is(
		fp
			.toDOM()
			.querySelectorAll('[data-field*="prop06"]')
			.item(1).innerHTML,
		'prop06-text-02-add',
	);
	t.is(
		fp
			.toDOM()
			.querySelectorAll('[data-field*="prop06"]')
			.item(2).innerHTML,
		'prop06-text-03-add',
	);
	t.is(
		fp
			.toDOM()
			.querySelectorAll('[data-field*="prop06"]')
			.item(3).innerHTML,
		'prop06-text-04-add',
	);
	t.is(fp.toDOM().querySelectorAll('[data-field*="prop07"]').length, 3);
	t.is(
		fp
			.toDOM()
			.querySelectorAll('[data-field*="prop07"]')
			.item(0)
			.getAttribute('href'),
		'prop07-href-01-rewrite',
	);
	t.is(
		fp
			.toDOM()
			.querySelectorAll('[data-field*="prop07"]')
			.item(1)
			.getAttribute('href'),
		'prop07-href-02-add',
	);
	t.is(
		fp
			.toDOM()
			.querySelectorAll('[data-field*="prop07"]')
			.item(2)
			.getAttribute('href'),
		'prop07-href-01-rewrite',
	); // empty item for test
	t.is(fp.toDOM().querySelectorAll('[data-field*="prop08"]').length, 3);
	t.is(
		fp
			.toDOM()
			.querySelectorAll('[data-field*="prop08"]')
			.item(0).innerHTML,
		'prop08-text-01-rewrite',
	);
	t.is(
		fp
			.toDOM()
			.querySelectorAll('[data-field*="prop08"]')
			.item(1).innerHTML,
		'prop08-text-02-add',
	);
	t.is(
		fp
			.toDOM()
			.querySelectorAll('[data-field*="prop08"]')
			.item(2).innerHTML,
		'prop08-text-03-add',
	);
});

test('List item removes', t => {
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
	t.is(
		fp.toDOM().querySelectorAll('[data-field*="prop01"]')[0].innerHTML,
		'prop01-text-rewrite',
	);
	t.is(
		fp.toDOM().querySelectorAll('[data-field*="prop01"]')[1].innerHTML,
		'prop01-text-add',
	);

	// list remove
	fp.merge({
		prop01: ['prop01-text-rewrite'],
	});
	t.is(
		fp.toDOM().querySelectorAll('[data-field*="prop01"]')[0].innerHTML,
		'prop01-text-rewrite',
	);
	t.false(!!fp.toDOM().querySelectorAll('[data-field*="prop01"]')[1]);
	t.is(fp.toDOM().querySelector('[data-field-list]').children.length, 1);
});

test('List', t => {
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
	t.is(fp.toDOM().querySelectorAll('figure').length, 3);
});

test('value', t => {
	const fp = new FrozenPatty('<input data-field="field" value="value">');
	const fp2 = new FrozenPatty(
		'<select data-field="field"><option value="value2" checked>label</option><option value="merged2">label</option></select>',
	);
	const fp3 = new FrozenPatty('<textarea data-field="field">value3</textarea>');
	const fp4 = new FrozenPatty('<input data-field="field">');
	const fp5 = new FrozenPatty(
		'<select data-field="field"><option value="value5" checked>label</option></select>',
	);
	t.deepEqual(fp.toJSON(), { field: 'value' });
	t.deepEqual(fp2.toJSON(), { field: 'value2' });
	t.deepEqual(fp3.toJSON(), { field: 'value3' });
	t.deepEqual(fp4.toJSON(), { field: '' });
	t.deepEqual(fp5.toJSON(), { field: 'value5' });
	t.is(fp.merge({ field: 'merged' }).toDOM().children[0].value, 'merged');
	t.is(fp2.merge({ field: 'merged2' }).toDOM().children[0].value, 'merged2');
	t.is(fp3.merge({ field: 'merged3' }).toDOM().children[0].value, 'merged3');
	t.is(fp4.merge({ field: 'merged4' }).toDOM().children[0].value, 'merged4');
	t.is(fp5.merge({ field: 'merged5' }).toDOM().children[0].value, 'value5');
});

test('attr: contenteditable', t => {
	t.pass('⚰ JSDom is unsupported contenteditable.');
	// const fp = new FrozenPatty('<div data-field="edit:contenteditable" contenteditable>text</div>');
	// const fp2 = new FrozenPatty('<div data-field="edit:contenteditable">text</div>');
	// t.deepEqual(fp.toJSON(), { edit: true });
	// t.deepEqual(fp2.toJSON(), { edit: false });
	// t.is(fp.merge({ edit: '' }).toDOM().children[0].isContentEditable, 'true');
	// t.is(fp.merge({ edit: 'true' }).toDOM().children[0].isContentEditable, 'true');
	// t.is(fp.merge({ edit: true }).toDOM().children[0].isContentEditable, undefined);
	// t.is(fp.merge({ edit: false }).toDOM().children[0].isContentEditable, undefined);
	// t.is(fp.merge({ edit: 'abc' }).toDOM().children[0].isContentEditable, undefined);
	// t.is(fp.merge({ edit: '' }).toDOM().children[0].isContentEditable, undefined);
	// t.is(fp.merge({ edit: 1 }).toDOM().children[0].isContentEditable, undefined);
	// t.is(fp.merge({ edit: 0 }).toDOM().children[0].isContentEditable, undefined);
	// t.is(fp.merge({ edit: null }).toDOM().children[0].isContentEditable, undefined);
});

test('attr: checked', t => {
	const fp = new FrozenPatty('<input data-field="checked:checked" checked>');
	const fp2 = new FrozenPatty('<input data-field="checked:checked">');
	t.deepEqual(fp.toJSON(), { checked: true });
	t.deepEqual(fp2.toJSON(), { checked: false });
	t.is(fp.merge({ checked: true }).toDOM().children[0].checked, true);
	t.is(fp.merge({ checked: false }).toDOM().children[0].checked, false);
	t.is(fp.merge({ checked: 'abc' }).toDOM().children[0].checked, true);
	t.is(fp.merge({ checked: '' }).toDOM().children[0].checked, true);
	t.is(fp.merge({ checked: 1 }).toDOM().children[0].checked, true);
	t.is(fp.merge({ checked: 0 }).toDOM().children[0].checked, false);
	t.is(fp.merge({ checked: null }).toDOM().children[0].checked, false);
});

test('attr: disabled', t => {
	const fp = new FrozenPatty('<input disabled data-field="disabled:disabled">');
	const fp2 = new FrozenPatty('<input data-field="disabled:disabled">');
	t.deepEqual(fp.toJSON(), { disabled: true });
	t.deepEqual(fp2.toJSON(), { disabled: false });
});

test('attr: href', t => {
	t.deepEqual(new FrozenPatty('<a href data-field="href:href"></a>').toJSON(), {
		href: '',
	});
	t.deepEqual(new FrozenPatty('<a href="" data-field="href:href"></a>').toJSON(), {
		href: '',
	});
	t.deepEqual(new FrozenPatty('<a href="hoge" data-field="href:href"></a>').toJSON(), {
		href: 'hoge',
	});
	t.deepEqual(
		new FrozenPatty('<a href="abc/?d=e&f=g" data-field="href:href"></a>').toJSON(),
		{ href: 'abc/?d=e&f=g' },
	);
	t.deepEqual(
		new FrozenPatty(
			'<a href="hij/?k=l&amp;m=n" data-field="href:href"></a>',
		).toJSON(),
		{ href: 'hij/?k=l&m=n' },
	);
	t.deepEqual(new FrozenPatty('<a data-field="href:href"></a>').toJSON(), { href: '' });
	t.deepEqual(
		new FrozenPatty('<a data-field="href:href"></a>').merge({ href: '' }).toDOM()
			.children[0].href,
		'',
	);
	t.deepEqual(
		new FrozenPatty('<a data-field="href:href"></a>').merge({ href: 'abc' }).toDOM()
			.children[0].href,
		'abc',
	);
	t.deepEqual(
		new FrozenPatty('<a data-field="href:href"></a>').merge({ href: true }).toDOM()
			.children[0].href,
		'true',
	);
	t.deepEqual(
		new FrozenPatty('<a data-field="href:href"></a>').merge({ href: false }).toDOM()
			.children[0].href,
		'false',
	);
	t.deepEqual(
		new FrozenPatty('<a data-field="href:href"></a>').merge({ href: 123 }).toDOM()
			.children[0].href,
		'123',
	);
	t.deepEqual(
		new FrozenPatty('<a data-field="href:href"></a>').merge({ href: 123.1 }).toDOM()
			.children[0].href,
		'123.1',
	);
	t.deepEqual(
		new FrozenPatty('<a data-field="href:href"></a>').merge({ href: 0.1 }).toDOM()
			.children[0].href,
		'0.1',
	);
	t.deepEqual(
		new FrozenPatty('<a data-field="href:href"></a>').merge({ href: 0.1 }).toDOM()
			.children[0].href,
		'0.1',
	);
	t.deepEqual(
		new FrozenPatty('<a data-field="href:href"></a>').merge({ href: null }).toDOM()
			.children[0].href,
		'',
	);
	t.deepEqual(
		new FrozenPatty('<a data-field="href:href"></a>')
			.merge({ href: null })
			.toDOM()
			.children[0].hasAttribute('href'),
		false,
	);
	t.deepEqual(
		new FrozenPatty('<a data-field="href:href"></a>').merge({}).toDOM().children[0]
			.href,
		'',
	);
	t.deepEqual(
		new FrozenPatty('<a data-field="href:href"></a>')
			.merge({})
			.toDOM()
			.children[0].hasAttribute('href'),
		true,
	);
	t.deepEqual(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>')
			.merge({ href: '' })
			.toDOM().children[0].href,
		'',
	);
	t.deepEqual(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>')
			.merge({ href: 'abc' })
			.toDOM().children[0].href,
		'abc',
	);
	t.deepEqual(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>')
			.merge({ href: 'abc/?d=e&f=g' })
			.toDOM().children[0].href,
		'abc/?d=e&f=g',
	);
	t.deepEqual(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>')
			.merge({ href: true })
			.toDOM().children[0].href,
		'true',
	);
	t.deepEqual(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>')
			.merge({ href: false })
			.toDOM().children[0].href,
		'false',
	);
	t.deepEqual(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>')
			.merge({ href: 123 })
			.toDOM().children[0].href,
		'123',
	);
	t.deepEqual(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>')
			.merge({ href: 123.1 })
			.toDOM().children[0].href,
		'123.1',
	);
	t.deepEqual(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>')
			.merge({ href: 0.1 })
			.toDOM().children[0].href,
		'0.1',
	);
	t.deepEqual(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>')
			.merge({ href: 0.1 })
			.toDOM().children[0].href,
		'0.1',
	);
	t.deepEqual(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>')
			.merge({ href: null })
			.toDOM().children[0].href,
		'',
	);
	t.deepEqual(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>')
			.merge({ href: null })
			.toDOM()
			.children[0].hasAttribute('href'),
		false,
	);
	t.deepEqual(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>')
			.merge({ href: null })
			.toDOM().children[0].outerHTML,
		'<a data-field="href:href"></a>',
	);
	t.deepEqual(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>')
			.merge({ href: 'abc/?d=e&f=g' })
			.toDOM().children[0].outerHTML,
		'<a href="abc/?d=e&amp;f=g" data-field="href:href"></a>',
	);
	t.deepEqual(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>').merge({}).toDOM()
			.children[0].href,
		'hoge',
	);
	t.deepEqual(
		new FrozenPatty('<a href="hoge" data-field="href:href"></a>')
			.merge({})
			.toDOM()
			.children[0].hasAttribute('href'),
		true,
	);
});

test('attr: download', t => {
	t.deepEqual(
		new FrozenPatty('<a download data-field="download:download"></a>').toJSON(),
		{ download: '' },
	);
	t.deepEqual(
		new FrozenPatty('<a download="" data-field="download:download"></a>').toJSON(),
		{ download: '' },
	);
	t.deepEqual(
		new FrozenPatty(
			'<a download="/path/to" data-field="download:download"></a>',
		).toJSON(),
		{ download: '/path/to' },
	);
	t.deepEqual(
		new FrozenPatty(
			'<a download="names" data-field="download:download"></a>',
		).toJSON(),
		{ download: 'names' },
	);
	t.deepEqual(new FrozenPatty('<a data-field="download:download"></a>').toJSON(), {
		download: null,
	});

	t.deepEqual(
		new FrozenPatty('<a data-field="download:download"></a>')
			.merge({ download: '' })
			.toDOM().children[0].download,
		'',
	);
	t.deepEqual(
		new FrozenPatty('<a data-field="download:download"></a>')
			.merge({ download: 'abc' })
			.toDOM().children[0].download,
		'abc',
	);
	t.deepEqual(
		new FrozenPatty('<a data-field="download:download"></a>')
			.merge({ download: true })
			.toDOM().children[0].download,
		'true',
	);
	t.deepEqual(
		new FrozenPatty('<a data-field="download:download"></a>')
			.merge({ download: false })
			.toDOM().children[0].download,
		'',
	);
	t.deepEqual(
		new FrozenPatty('<a data-field="download:download"></a>')
			.merge({ download: 123 })
			.toDOM().children[0].download,
		'123',
	);
	t.deepEqual(
		new FrozenPatty('<a data-field="download:download"></a>')
			.merge({ download: 123.1 })
			.toDOM().children[0].download,
		'123.1',
	);
	t.deepEqual(
		new FrozenPatty('<a data-field="download:download"></a>')
			.merge({ download: 0 })
			.toDOM().children[0].download,
		'',
	);
	t.deepEqual(
		new FrozenPatty('<a data-field="download:download"></a>')
			.merge({ download: 0.1 })
			.toDOM().children[0].download,
		'0.1',
	);
	t.deepEqual(
		new FrozenPatty('<a data-field="download:download"></a>')
			.merge({ download: 0.1 })
			.toDOM().children[0].download,
		'0.1',
	);
	t.deepEqual(
		new FrozenPatty('<a data-field="download:download"></a>')
			.merge({ download: null })
			.toDOM().children[0].download,
		'',
	);
	t.deepEqual(
		new FrozenPatty('<a data-field="download:download"></a>')
			.merge({ download: null })
			.toDOM()
			.children[0].hasAttribute('download'),
		false,
	);
	t.deepEqual(
		new FrozenPatty('<a data-field="download:download"></a>').merge({}).toDOM()
			.children[0].download,
		'',
	);
	t.deepEqual(
		new FrozenPatty('<a data-field="download:download"></a>')
			.merge({})
			.toDOM()
			.children[0].hasAttribute('download'),
		false,
	);
	t.deepEqual(
		new FrozenPatty('<a download="hoge" data-field="download:download"></a>')
			.merge({ download: '' })
			.toDOM().children[0].download,
		'',
	);
	t.deepEqual(
		new FrozenPatty('<a download="hoge" data-field="download:download"></a>')
			.merge({ download: 'abc' })
			.toDOM().children[0].download,
		'abc',
	);
	t.deepEqual(
		new FrozenPatty('<a download="hoge" data-field="download:download"></a>')
			.merge({ download: true })
			.toDOM().children[0].download,
		'true',
	);
	t.deepEqual(
		new FrozenPatty('<a download="hoge" data-field="download:download"></a>')
			.merge({ download: false })
			.toDOM().children[0].download,
		'',
	);
	t.deepEqual(
		new FrozenPatty('<a download="hoge" data-field="download:download"></a>')
			.merge({ download: 123 })
			.toDOM().children[0].download,
		'123',
	);
	t.deepEqual(
		new FrozenPatty('<a download="hoge" data-field="download:download"></a>')
			.merge({ download: 123.1 })
			.toDOM().children[0].download,
		'123.1',
	);
	t.deepEqual(
		new FrozenPatty('<a download="hoge" data-field="download:download"></a>')
			.merge({ download: 0 })
			.toDOM().children[0].download,
		'',
	);
	t.deepEqual(
		new FrozenPatty('<a download="hoge" data-field="download:download"></a>')
			.merge({ download: 0.1 })
			.toDOM().children[0].download,
		'0.1',
	);
	t.deepEqual(
		new FrozenPatty('<a download="hoge" data-field="download:download"></a>')
			.merge({ download: 0.1 })
			.toDOM().children[0].download,
		'0.1',
	);
	t.deepEqual(
		new FrozenPatty('<a download="hoge" data-field="download:download"></a>')
			.merge({ download: null })
			.toDOM().children[0].download,
		'',
	);
	t.deepEqual(
		new FrozenPatty('<a download="hoge" data-field="download:download"></a>')
			.merge({ download: null })
			.toDOM()
			.children[0].hasAttribute('download'),
		false,
	);
	t.deepEqual(
		new FrozenPatty('<a download="hoge" data-field="download:download"></a>')
			.merge({ download: null })
			.toDOM().children[0].outerHTML,
		'<a data-field="download:download"></a>',
	);
	t.deepEqual(
		new FrozenPatty('<a download="hoge" data-field="download:download"></a>')
			.merge({})
			.toDOM().children[0].download,
		'hoge',
	);
	t.deepEqual(
		new FrozenPatty('<a download="hoge" data-field="download:download"></a>')
			.merge({})
			.toDOM()
			.children[0].hasAttribute('download'),
		true,
	);
});

test('toHTML()', t => {
	const fp = new FrozenPatty(
		'<div data-hoge="fuga" data-field="hoge:data-hoge"></div>',
	);
	t.is(fp.toHTML(), '<div data-hoge="fuga" data-field="hoge:data-hoge"></div>');
});

test('toHTML()', t => {
	const fp = new FrozenPatty(
		'<div data-hoge="fuga" data-field="hoge:data-hoge"></div>',
	);
	t.is(
		fp.merge({ hoge: 'piyo' }).toHTML(),
		'<div data-hoge="piyo" data-field="hoge:data-hoge"></div>',
	);
});
