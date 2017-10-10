import test from 'ava';
import FrozenPatty from '../lib/frozen-patty';

test('toDOM', (t) => {
	const fp = new FrozenPatty('<div data-field="text">value</div>');
	t.is(fp.toHTML(), '<div data-field="text">value</div>');
});

test('toJSON basic', (t) => {
	const fp = new FrozenPatty('<div data-field="text">value</div>');
	t.deepEqual(fp.toJSON(), { text: 'value' });
});

test('toJSON attribute field', (t) => {
	const fp = new FrozenPatty('<a href="http://localhost" data-field="href:href">link</a>');
	t.deepEqual(fp.toJSON(), { href: 'http://localhost' });
});

test('toJSON optional field name', (t) => {
	const fp = new FrozenPatty('<div data-field="field-name">value</div>');
	t.deepEqual(fp.toJSON(), { 'field-name': 'value' });
});


test('toJSON custom attr name', (t) => {
	const fp = new FrozenPatty('<div data-bge="text">value</div>', { attr: 'bge' });
	t.deepEqual(fp.toJSON(), { text: 'value' });
});

test('Merge data', (t) => {
	const fp = new FrozenPatty('<div data-field="text">value</div>');
	fp.merge({ text: 'merged' });
	t.deepEqual(fp.toJSON(), { text: 'merged' });
});

test('Full Data', (t) => {
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
	t.deepEqual(
		fp.toJSON(),
		{
			prop01: 'prop01-text',
			prop02: '<span id="prop02-html">prop02-html</span>',
			prop03: 'prop03-title',
			prop04: 'prop04-data-attr',
			prop05: 'prop05-text',
			prop06: [
				'prop06-text-01',
				'prop06-text-02',
				'prop06-text-03',
			],
			prop07: [
				'prop07-href-01',
				'prop07-href-02',
			],
			prop08: [
				'prop08-text-01',
				'prop08-text-02',
			],
			prop09: [
				'prop09-text-01',
			],
			prop10: 'prop10-text-02',
		}
	);
});

test('Full data merge', (t) => {
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
			'prop07-herf-02-add',
			// empty item for test
		],
		prop08: [
			'prop08-text-01-rewrite',
			'prop08-text-02-add',
			'prop08-text-03-add',
		],
	});
	t.is(fp.toDOM().querySelector('[data-field*="prop01"]').innerHTML, 'prop01-text-rewrite');
	t.is(fp.toDOM().querySelector('[data-field*="prop02"]').innerHTML, '<span id="prop02-html">prop02-html-rewrite</span>');
	t.truthy(fp.toDOM().querySelector('#prop02-html'));
	t.is(fp.toDOM().querySelector('[data-field="prop03:title"]').getAttribute('title'), 'prop03-rewrite');
	t.is(fp.toDOM().querySelector('[data-field="prop03"]').innerHTML, 'prop03-rewrite');
	t.is(fp.toDOM().querySelector('[data-field*="prop04:data-attr"]').getAttribute('data-attr'), 'prop04-data-attr-rewrite');
	t.is(fp.toDOM().querySelector('[data-field*="prop05"]').innerHTML, 'prop05-text-write');
	t.is(fp.toDOM().querySelectorAll('[data-field*="prop06"]').length, 4);
	t.is(fp.toDOM().querySelectorAll('[data-field*="prop06"]').item(0).innerHTML, 'prop06-text-01-rewrite');
	t.is(fp.toDOM().querySelectorAll('[data-field*="prop06"]').item(1).innerHTML, 'prop06-text-02-add');
	t.is(fp.toDOM().querySelectorAll('[data-field*="prop06"]').item(2).innerHTML, 'prop06-text-03-add');
	t.is(fp.toDOM().querySelectorAll('[data-field*="prop06"]').item(3).innerHTML, 'prop06-text-04-add');
	t.is(fp.toDOM().querySelectorAll('[data-field*="prop07"]').length, 3);
	t.is(fp.toDOM().querySelectorAll('[data-field*="prop07"]').item(0).getAttribute('href'), 'prop07-href-01-rewrite');
	t.is(fp.toDOM().querySelectorAll('[data-field*="prop07"]').item(1).getAttribute('href'), 'prop07-herf-02-add');
	t.is(fp.toDOM().querySelectorAll('[data-field*="prop07"]').item(2).getAttribute('href'), 'prop07-href-01-rewrite'); // empty item for test
	t.is(fp.toDOM().querySelectorAll('[data-field*="prop08"]').length, 3);
	t.is(fp.toDOM().querySelectorAll('[data-field*="prop08"]').item(0).innerHTML, 'prop08-text-01-rewrite');
	t.is(fp.toDOM().querySelectorAll('[data-field*="prop08"]').item(1).innerHTML, 'prop08-text-02-add');
	t.is(fp.toDOM().querySelectorAll('[data-field*="prop08"]').item(2).innerHTML, 'prop08-text-03-add');
});

test('List item removes', (t) => {
	const fp = new FrozenPatty(`
		<div>
			<ul data-field-list>
				<div><span data-field="prop01">prop01-text</span></div>
			</ul>
		</div>
	`);
	fp.merge({
		prop01: [
			'prop01-text-rewrite',
			'prop01-text-add',
		],
	});
	t.is(fp.toDOM().querySelectorAll('[data-field*="prop01"]')[0].innerHTML, 'prop01-text-rewrite');
	t.is(fp.toDOM().querySelectorAll('[data-field*="prop01"]')[1].innerHTML, 'prop01-text-add');

	// list remove
	fp.merge({
		prop01: [
			'prop01-text-rewrite',
		],
	});
	t.is(fp.toDOM().querySelectorAll('[data-field*="prop01"]')[0].innerHTML, 'prop01-text-rewrite');
	t.false(!!fp.toDOM().querySelectorAll('[data-field*="prop01"]')[1]);
	t.is(fp.toDOM().querySelector('[data-field-list]').children.length, 1);
});
