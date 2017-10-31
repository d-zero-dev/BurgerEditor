import test from 'ava';
import FrozenPatty from '../lib/';

test('constructor', (t) => {
	const fp = FrozenPatty('<div data-field="text">value</div>');
	t.is(fp.toHTML(), '<div data-field="text">value</div>');
});

test('setValue', (t) => {
	const el = document.createElement('div');
	el.setAttribute('data-field', 'hoge:data-hoge');
	t.is(el.getAttribute('data-hoge'), null);
	FrozenPatty.setValue(el, 'hoge', 'fuga');
	t.is(el.getAttribute('data-hoge'), 'fuga');
});

test('getValue', (t) => {
	const el = document.createElement('div');
	el.setAttribute('data-field', 'hoge:data-hoge');
	el.setAttribute('data-hoge', 'fuga');
	t.is(FrozenPatty.getValue(el, 'hoge'), 'fuga');
});
