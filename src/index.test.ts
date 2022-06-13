import FrozenPatty from './';

test('constructor', () => {
	const fp = FrozenPatty('<div data-field="text">value</div>');
	expect(fp.toHTML()).toBe('<div data-field="text">value</div>');
});

test('setValue', () => {
	const el = document.createElement('div');
	el.setAttribute('data-field', 'hoge:data-hoge');
	expect(el.getAttribute('data-hoge')).toBe(null);
	FrozenPatty.setValue(el, 'hoge', 'fuga');
	expect(el.getAttribute('data-hoge')).toBe('fuga');
});

test('getValue', () => {
	const el = document.createElement('div');
	el.setAttribute('data-field', 'hoge:data-hoge');
	el.setAttribute('data-hoge', 'fuga');
	expect(FrozenPatty.getValue(el, 'hoge')).toBe('fuga');
});
