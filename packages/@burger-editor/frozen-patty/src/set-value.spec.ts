import { test, expect, describe } from 'vitest';

import { setValue, setContent } from './set-value.js';

describe('setValue', () => {
	test('basic', () => {
		const el = document.createElement('div');
		el.dataset.field = 'foo:data-foo';
		expect(el.dataset.foo).toBeUndefined();
		setValue(el, 'foo', 'bar');
		expect(el.dataset.foo).toBe('bar');
	});

	test('attr', () => {
		const el = document.createElement('a');
		el.dataset.field = 'foo:href';
		expect(el.href).toBe('');
		const url = 'https://example.com/path/to/file.html';
		setValue(el, 'foo', url);
		expect(el.href).toBe(url);
	});

	test('style attr', () => {
		const el = document.createElement('div');
		el.dataset.field = 'foo:style';
		expect(el.style.cssText).toBe('');
		const style = '--foo: var(--bar);';
		setValue(el, 'foo', style);
		expect(el.style.cssText).toBe(style);
	});

	test('shorthand', () => {
		const el = document.createElement('a');
		el.dataset.field = ':href';
		expect(el.href).toBe('');
		const url = 'https://example.com/path/to/file.html';
		setValue(el, 'href', url);
		expect(el.href).toBe(url);
	});

	test('text', () => {
		const el = document.createElement('a');
		el.dataset.field = 'href';
		expect(el.href).toBe('');
		const url = 'https://example.com/path/to/file.html';
		setValue(el, 'href', url);
		expect(el.textContent).toBe(url);
	});

	test('text', () => {
		const el = document.createElement('a');
		el.dataset.field = 'foo:text';
		expect(el.textContent).toBe('');
		const url = 'https://example.com/path/to/file.html';
		setValue(el, 'foo', url);
		expect(el.textContent).toBe(url);
	});

	test('text shorthand', () => {
		const el = document.createElement('a');
		el.dataset.field = 'foo';
		expect(el.textContent).toBe('');
		const url = 'https://example.com/path/to/file.html';
		setValue(el, 'foo', url);
		expect(el.textContent).toBe(url);
	});

	test('attr (XSS protection)', () => {
		const el = document.createElement('a');
		el.href = 'default';
		// Host is defined from environmentOptions in vitest.config.ts
		expect(el.href).toBe('https://www.d-zero.co.jp/default');
		el.dataset.field = 'foo:href';
		const url = 'javascript:alert("XSS")';
		setValue(el, 'foo', url);
		expect(el.href).toBe('https://www.d-zero.co.jp/default');
	});

	test('html (XSS protection)', () => {
		const el = document.createElement('div');
		el.dataset.field = 'foo:html';
		expect(el.innerHTML).toBe('');
		const dangerousHtml = '<script>alert("XSS")</script>';
		setValue(el, 'foo', dangerousHtml);
		expect(el.innerHTML).toBe('alert("XSS")');
	});

	test('html (XSS protection)', () => {
		const el = document.createElement('div');
		el.dataset.field = 'foo:html';
		expect(el.innerHTML).toBe('');
		const dangerousHtml = '<template><script>alert("XSS")</script></template>';
		setValue(el, 'foo', dangerousHtml);
		expect(el.innerHTML).toBe('alert("XSS")');
	});

	test('html (XSS protection)', () => {
		const el = document.createElement('div');
		el.dataset.field = 'foo:html';
		expect(el.innerHTML).toBe('');
		const dangerousHtml = '<style><span>XSS</span></style>';
		setValue(el, 'foo', dangerousHtml);
		expect(el.innerHTML).toBe('<span>XSS</span>');
		expect(el.firstElementChild?.localName).toBe('span');
	});
});

describe('setValue — style(property) syntax', () => {
	test('style(background-image) should set url() with encoded URI', () => {
		const el = document.createElement('div');
		el.dataset.field = 'bg:style(background-image)';
		setValue(el, 'bg', 'https://example.com/image.png');
		expect(el.getAttribute('style')).toBe(
			'background-image: url(https://example.com/image.png)',
		);
	});

	test('style(color) should set raw value', () => {
		const el = document.createElement('div');
		el.dataset.field = 'c:style(color)';
		setValue(el, 'c', 'red');
		expect(el.getAttribute('style')).toBe('color: red');
	});
});

describe('setValue — null datum removes attribute', () => {
	test('should remove attribute when datum is null', () => {
		const el = document.createElement('input');
		el.dataset.field = 'foo:placeholder';
		el.setAttribute('placeholder', 'old');
		setValue(el, 'foo', null as never);
		expect(el.hasAttribute('placeholder')).toBe(false);
	});
});

describe('setValue — set() switch branches', () => {
	/**
	 * Helper: creates an element and calls setValue via data-field binding
	 * @param tag
	 * @param attrName
	 * @param value
	 */
	function setAttr<T extends HTMLElement>(
		tag: string,
		attrName: string,
		value: string | number | boolean,
	): T {
		const el = document.createElement(tag) as T;
		el.dataset.field = `v:${attrName}`;
		setValue(el, 'v', value);
		return el;
	}

	describe('text / html / node special cases', () => {
		test('text should set textContent', () => {
			const el = setAttr<HTMLDivElement>('div', 'text', 'Hello');
			expect(el.textContent).toBe('Hello');
		});

		test('html should set innerHTML', () => {
			const el = setAttr<HTMLDivElement>('div', 'html', '<b>Bold</b>');
			expect(el.innerHTML).toBe('<b>Bold</b>');
		});
	});

	// NOTE: Some switch cases (contenteditable, tabindex, ismap, novalidate,
	// readonly, maxlength, colspan, rowspan, etc.) are unreachable in jsdom
	// because propInElement uses `name in el` which is case-sensitive —
	// e.g. 'contenteditable' in div is false (property is contentEditable).
	// These branches are tested via getAttribute where possible.

	describe('dir', () => {
		test('should set "ltr"', () => {
			const el = setAttr<HTMLDivElement>('div', 'dir', 'ltr');
			expect(el.dir).toBe('ltr');
		});

		test('should set "rtl"', () => {
			const el = setAttr<HTMLDivElement>('div', 'dir', 'rtl');
			expect(el.dir).toBe('rtl');
		});

		test('should remove attribute for other values', () => {
			const el = document.createElement('div');
			el.dir = 'ltr';
			el.dataset.field = 'v:dir';
			setValue(el, 'v', 'invalid');
			expect(el.hasAttribute('dir')).toBe(false);
		});
	});

	describe('draggable', () => {
		test('should set true for boolean true', () => {
			const el = setAttr<HTMLDivElement>('div', 'draggable', true);
			expect(el.draggable).toBe(true);
		});

		test('should set true for string "true"', () => {
			const el = setAttr<HTMLDivElement>('div', 'draggable', 'true');
			expect(el.draggable).toBe(true);
		});

		test('should set false for string "false"', () => {
			const el = setAttr<HTMLDivElement>('div', 'draggable', 'false');
			expect(el.draggable).toBe(false);
		});
	});

	describe('hidden', () => {
		test('should set hidden to true', () => {
			const el = setAttr<HTMLDivElement>('div', 'hidden', true);
			expect(el.hidden).toBe(true);
		});

		test('should handle "until-found" value', () => {
			const el = setAttr<HTMLDivElement>('div', 'hidden', 'until-found');
			expect(el.getAttribute('hidden')).toBe('until-found');
		});
	});

	// NOTE: 'spellcheck' is not reachable via propInElement in jsdom
	// (jsdom may not expose spellcheck as an enumerable property)

	describe('boolean attributes (propInElement reachable)', () => {
		test('autofocus on input', () => {
			const el = setAttr<HTMLInputElement>('input', 'autofocus', '');
			expect(el.autofocus).toBe(true);
		});

		test('autoplay on video', () => {
			const el = setAttr<HTMLVideoElement>('video', 'autoplay', true);
			expect(el.autoplay).toBe(true);
		});

		test('checked on input', () => {
			const el = setAttr<HTMLInputElement>('input', 'checked', '');
			expect(el.checked).toBe(true);
		});

		test('controls on video', () => {
			const el = setAttr<HTMLVideoElement>('video', 'controls', true);
			expect(el.controls).toBe(true);
		});

		test('default on track', () => {
			const el = setAttr<HTMLTrackElement>('track', 'default', '');
			expect(el.default).toBe(true);
		});

		test('defer on script', () => {
			const el = setAttr<HTMLScriptElement>('script', 'defer', true);
			expect(el.defer).toBe(true);
		});

		test('disabled on button', () => {
			const el = setAttr<HTMLButtonElement>('button', 'disabled', '');
			expect(el.disabled).toBe(true);
		});

		test('disabled on select', () => {
			const el = setAttr<HTMLSelectElement>('select', 'disabled', true);
			expect(el.disabled).toBe(true);
		});

		test('loop on audio', () => {
			const el = setAttr<HTMLAudioElement>('audio', 'loop', true);
			expect(el.loop).toBe(true);
		});

		test('multiple on select', () => {
			const el = setAttr<HTMLSelectElement>('select', 'multiple', '');
			expect(el.multiple).toBe(true);
		});

		test('open on details', () => {
			const el = setAttr<HTMLDetailsElement>('details', 'open', '');
			expect(el.open).toBe(true);
		});

		test('required on input', () => {
			const el = setAttr<HTMLInputElement>('input', 'required', '');
			expect(el.required).toBe(true);
		});

		test('reversed on ol', () => {
			const el = setAttr<HTMLOListElement>('ol', 'reversed', true);
			expect(el.reversed).toBe(true);
		});
	});

	describe('boolean attributes — emptyIsTrue=false (defer)', () => {
		// 'defer' in scriptEl is true in jsdom, 'async' is not
		test('defer with empty string should be false (emptyIsTrue=false)', () => {
			const el = setAttr<HTMLScriptElement>('script', 'defer', '');
			expect(el.defer).toBe(false);
		});
	});

	describe('propInElement gatekeeper — unknown props on non-matching elements', () => {
		// When propInElement returns false, the attribute never reaches the
		// switch statement. Nothing is set — this is correct behavior because
		// the attribute name is not a known property on the element.
		test('checked on div does nothing (propInElement returns false)', () => {
			const el = setAttr<HTMLDivElement>('div', 'checked', 'true');
			expect(el.hasAttribute('checked')).toBe(false);
		});

		test('cols on div does nothing (propInElement returns false)', () => {
			const el = setAttr<HTMLDivElement>('div', 'cols', '5');
			expect(el.hasAttribute('cols')).toBe(false);
		});
	});

	describe('special attr fallback — non-matching element uses setAttribute', () => {
		// setSpecialAttr handles these cases and always returns true,
		// falling back to setAttribute when the element type doesn't match.
		// But these only reach setSpecialAttr if propInElement returns true.
		// In jsdom, properties like 'target', 'download' are only on their
		// respective elements, so propInElement returns false on <div>.
		// We test via elements that DO have the property but go through
		// the else branch in setSpecialAttr.
		test('autocomplete on textarea uses setAttribute', () => {
			const el = setAttr<HTMLTextAreaElement>('textarea', 'autocomplete', 'name');
			expect(el.getAttribute('autocomplete')).toBe('name');
		});
	});

	describe('integer attributes (propInElement reachable)', () => {
		test('cols on textarea', () => {
			const el = setAttr<HTMLTextAreaElement>('textarea', 'cols', 40);
			expect(el.cols).toBe(40);
		});

		test('max on input (string prop)', () => {
			const el = setAttr<HTMLInputElement>('input', 'max', 100);
			expect(el.max).toBe('100');
		});

		test('min on input (string prop)', () => {
			const el = setAttr<HTMLInputElement>('input', 'min', 0);
			expect(el.min).toBe('0');
		});

		test('rows on textarea', () => {
			const el = setAttr<HTMLTextAreaElement>('textarea', 'rows', 10);
			expect(el.rows).toBe(10);
		});

		test('size on input', () => {
			const el = setAttr<HTMLInputElement>('input', 'size', 20);
			expect(el.size).toBe(20);
		});

		test('start on ol', () => {
			const el = setAttr<HTMLOListElement>('ol', 'start', 5);
			expect(el.start).toBe(5);
		});

		test('integer attr should remove on NaN', () => {
			const el = document.createElement('textarea');
			el.cols = 40;
			el.dataset.field = 'v:cols';
			setValue(el, 'v', 'abc');
			expect(el.hasAttribute('cols')).toBe(false);
		});
	});

	describe('step attribute', () => {
		test('should set numeric step', () => {
			const el = setAttr<HTMLInputElement>('input', 'step', 0.5);
			expect(el.step).toBe('0.5');
		});

		test('should set "any" step', () => {
			const el = setAttr<HTMLInputElement>('input', 'step', 'any');
			expect(el.step).toBe('any');
		});

		test('should remove on NaN', () => {
			const el = document.createElement('input');
			el.step = '1';
			el.dataset.field = 'v:step';
			setValue(el, 'v', 'invalid');
			expect(el.hasAttribute('step')).toBe(false);
		});
	});

	describe('autocomplete', () => {
		test('should set on input', () => {
			const el = setAttr<HTMLInputElement>('input', 'autocomplete', 'email');
			expect(el.autocomplete).toBe('email');
		});

		test('should set "off" for falsy value on input', () => {
			const el = setAttr<HTMLInputElement>('input', 'autocomplete', '');
			expect(el.autocomplete).toBe('off');
		});
	});

	describe('download', () => {
		test('should set download attribute on anchor', () => {
			const el = setAttr<HTMLAnchorElement>('a', 'download', 'file.pdf');
			expect(el.download).toBe('file.pdf');
		});

		test('should set empty download for empty string', () => {
			const el = setAttr<HTMLAnchorElement>('a', 'download', '');
			expect(el.download).toBe('');
		});

		test('should remove download for false', () => {
			const el = document.createElement('a');
			el.download = 'file.pdf';
			el.dataset.field = 'v:download';
			setValue(el, 'v', false);
			expect(el.hasAttribute('download')).toBe(false);
		});
	});

	describe('preload', () => {
		test('should set "auto" on video', () => {
			const el = setAttr<HTMLVideoElement>('video', 'preload', 'auto');
			expect(el.preload).toBe('auto');
		});

		test('should set "metadata" on video', () => {
			const el = setAttr<HTMLVideoElement>('video', 'preload', 'metadata');
			expect(el.preload).toBe('metadata');
		});

		test('should default to "none" for unknown values', () => {
			const el = setAttr<HTMLVideoElement>('video', 'preload', 'unknown');
			expect(el.preload).toBe('none');
		});
	});

	describe('target', () => {
		test('should set target on anchor', () => {
			const el = setAttr<HTMLAnchorElement>('a', 'target', '_blank');
			expect(el.target).toBe('_blank');
		});

		test('should remove target for falsy value', () => {
			const el = document.createElement('a');
			el.target = '_blank';
			el.dataset.field = 'v:target';
			setValue(el, 'v', '');
			expect(el.hasAttribute('target')).toBe(false);
		});
	});

	describe('custom elements fallback', () => {
		test('should use setAttribute for custom elements', () => {
			const el = document.createElement('my-component');
			el.dataset.field = 'v:custom-prop';
			setValue(el, 'v', 'custom-value');
			expect(el.getAttribute('custom-prop')).toBe('custom-value');
		});
	});

	describe('XSS protection in set()', () => {
		test('should block event handler attributes', () => {
			const el = document.createElement('div');
			el.dataset.field = 'v:onclick';
			setValue(el, 'v', 'alert(1)');
			expect(el.hasAttribute('onclick')).toBe(false);
		});
	});

	describe('default fallback', () => {
		test('should use setAttribute for unhandled attributes', () => {
			const el = setAttr<HTMLDivElement>('div', 'title', 'my title');
			expect(el.title).toBe('my title');
		});

		test('should use setAttribute for data-* attributes', () => {
			const el = setAttr<HTMLDivElement>('div', 'data-custom', 'value');
			expect(el.dataset.custom).toBe('value');
		});
	});
});

describe('setContent', () => {
	test('checkbox without value attribute (switch-like behavior)', () => {
		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		// No value attribute

		// Boolean values
		setContent(checkbox, true);
		expect(checkbox.checked).toBe(true);

		setContent(checkbox, false);
		expect(checkbox.checked).toBe(false);

		// String "true"/"false"
		setContent(checkbox, 'true');
		expect(checkbox.checked).toBe(true);

		setContent(checkbox, 'false');
		expect(checkbox.checked).toBe(false);

		// Case variations - should NOT be treated as boolean
		setContent(checkbox, 'TRUE');
		expect(checkbox.checked).toBe(false); // Uppercase should be false

		setContent(checkbox, 'True');
		expect(checkbox.checked).toBe(false); // CamelCase should be false

		setContent(checkbox, 'FALSE');
		expect(checkbox.checked).toBe(false); // Uppercase should be false

		// Other values - should be false
		setContent(checkbox, '');
		expect(checkbox.checked).toBe(false); // Empty string should be false

		setContent(checkbox, '1');
		expect(checkbox.checked).toBe(false); // Numeric string should be false

		setContent(checkbox, '0');
		expect(checkbox.checked).toBe(false); // Numeric string should be false

		setContent(checkbox, 'random');
		expect(checkbox.checked).toBe(false);
	});

	test('radio button without value attribute (switch-like behavior)', () => {
		const radio = document.createElement('input');
		radio.type = 'radio';

		setContent(radio, true);
		expect(radio.checked).toBe(true);

		setContent(radio, false);
		expect(radio.checked).toBe(false);

		setContent(radio, 'true');
		expect(radio.checked).toBe(true);

		setContent(radio, 'false');
		expect(radio.checked).toBe(false);

		setContent(radio, '');
		expect(radio.checked).toBe(false);
	});

	test('radio button with value attribute (value comparison)', () => {
		const radio = document.createElement('input');
		radio.type = 'radio';
		radio.value = 'option-a';

		setContent(radio, 'option-a');
		expect(radio.checked).toBe(true);

		setContent(radio, 'option-b');
		expect(radio.checked).toBe(false);

		// Boolean true always sets directly
		setContent(radio, true);
		expect(radio.checked).toBe(true);
	});

	test('checkbox with value attribute (traditional behavior)', () => {
		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.value = 'test-value';

		// Matching value
		setContent(checkbox, 'test-value');
		expect(checkbox.checked).toBe(true);

		// Non-matching values
		setContent(checkbox, 'other-value');
		expect(checkbox.checked).toBe(false);

		setContent(checkbox, 'true');
		expect(checkbox.checked).toBe(false); // "true" !== "test-value"

		setContent(checkbox, true);
		expect(checkbox.checked).toBe(true); // Boolean values are set directly regardless of value attribute
	});
});
