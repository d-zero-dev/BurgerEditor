import type {
	FieldDefinition,
	FrozenPattyData,
	FrozenPattyFlattenData,
	PrimitiveDatum,
} from './types.js';

import { parseFields } from './parse-fields.js';

/**
 * Elements (lower-case local names) that are always removed, together with their
 * content, for XSS protection.
 *
 * - `noscript` is parsed as elements when scripting is off (the inert document the
 *   sanitizer parses in) and as raw text when it is on (a published page), so a
 *   `</noscript>` inside an attribute value ends the element only in the page. No
 *   amount of re-parsing in the sanitizer can see that, so the element goes.
 * - `base` rewrites every relative URL of the page.
 *
 * Entries are compared with the lower-cased `localName`.
 *
 * `meta`, `link` and the SVG animation elements (`animate`, `set`, `animateMotion`,
 * `animateTransform`) are not listed: only some of them do harm, depending on their
 * attributes (see {@link isDangerousElement}), so they are decided per element.
 * @example
 * ```ts
 * DANGEROUS_ELEMENTS.includes('noscript'); // true
 * DANGEROUS_ELEMENTS.includes('span'); // false
 * ```
 */
export const DANGEROUS_ELEMENTS = [
	'script',
	'style',
	'template',
	'object',
	'embed',
	'iframe',
	'frame',
	'frameset',
	'applet',
	'noscript',
	'base',
];

/**
 * `data-*-list` の子要素で、DOM 順と配列データの index が逆になる要素。
 * `picture` は HTML 仕様上 `source` が先・`img` が最後だが、配列データでは
 * `img` が index 0（元画像）に対応する。抽出（getComponent）と適用
 * （setComponent）の両方でこの対応関係を共有する
 */
export const REVERSE_LIST_ELEMENTS: readonly string[] = ['picture'];

/**
 * 要素が逆順リスト（{@link REVERSE_LIST_ELEMENTS}）かどうかを判定する
 * @param el
 */
export function isReverseListElement(el: Element): boolean {
	return REVERSE_LIST_ELEMENTS.includes(el.localName);
}

/**
 *
 * @param kvs
 */
export function arrayToHash(kvs: [keyof FrozenPattyData, PrimitiveDatum, boolean][]) {
	const result: { [index: string]: PrimitiveDatum | PrimitiveDatum[] } = {};
	for (const kv of kvs) {
		const k = kv[0];
		const v = kv[1];
		const toArray = kv[2];

		if (!toArray) {
			result[k] = v;
			continue;
		}

		const arrayPropVal = result[k];

		if (Array.isArray(arrayPropVal)) {
			arrayPropVal.push(v);
			continue;
		}

		result[k] = k in result ? [arrayPropVal, v] : [v];
	}
	return result;
}

/**
 * Replaces `el` with an element named `nodeName`, carrying over its children and the
 * attributes that no field is bound to (the bound ones are written later, by the
 * fields).
 *
 * With `xssSanitize`, the original `el` is returned and stays in place when the new
 * element would be dangerous. The name is checked first against {@link DANGEROUS_ELEMENTS}.
 * `meta` and `link` are decided by their attributes, so they are checked again once the
 * attributes are copied; `setComponent` checks them a third time after the fields have
 * written theirs.
 * @param el The element to replace
 * @param nodeName The local name of the new element
 * @param attr Data attribute name for specifying the node that FrozenPatty treats as a field
 * @param xssSanitize Enable XSS protection
 * @returns The new element, or `el` when nothing was replaced
 * @example
 * ```ts
 * replaceNode(document.createElement('div'), 'span', 'bge').localName; // 'span' (when `el` has a parent)
 * replaceNode(el, 'script', 'bge') === el; // true
 * ```
 */
export function replaceNode(
	el: Element,
	nodeName: string,
	attr: string,
	xssSanitize = true,
): Element {
	nodeName = nodeName.toLowerCase();

	const currentName = el.localName ?? el.nodeName.toLowerCase();
	if (currentName === nodeName) {
		return el;
	}

	// Check element name if XSS protection is enabled
	if (
		xssSanitize && // Disallow dangerous elements
		DANGEROUS_ELEMENTS.includes(nodeName)
	) {
		return el;
	}

	const node = (el.ownerDocument ?? document).createElement(nodeName);
	for (const child of el.childNodes) {
		node.append(child.cloneNode(true));
	}

	const fields = getFields(el, attr);
	const attrs = new Set(fields.map((field) => field.propName));

	for (const { name, value } of el.attributes) {
		if (attrs.has(name)) {
			continue;
		}

		// Check attribute value if XSS protection is enabled
		if (xssSanitize) {
			const sanitizedValue = sanitizeAttributeValue(name, value);
			if (sanitizedValue !== null) {
				node.setAttribute(name, sanitizedValue);
			}
			continue;
		}

		node.setAttribute(name, value);
	}

	// `meta` and `link` are dangerous only with some attributes, which are known only now
	if (xssSanitize && isDangerousElement(node)) {
		return el;
	}

	el.replaceWith(node);

	return node;
}

/**
 * The number of parse → clean → serialize rounds {@link sanitizeHtml} tries before it
 * gives up and returns an empty string.
 */
const MAX_SANITIZE_PASSES = 5;

/**
 * Elements whose content is run as script or applied as CSS, so that data written into
 * them is an injection by itself, whatever it contains
 */
const CODE_CONTEXTS = new Set(['script', 'style']);

/**
 * One inert document per `document`, reused by every call: creating one costs more
 * than parsing a field's worth of HTML in it.
 */
const inertDocuments = new WeakMap<Document, Document>();

/**
 * @returns A document in which nothing is loaded and nothing runs
 */
function getInertDocument(): Document {
	let inert = inertDocuments.get(document);
	if (!inert) {
		inert = document.implementation.createHTMLDocument('');
		inertDocuments.set(document, inert);
	}
	return inert;
}

/**
 * Removes what could run script from an HTML string, and returns HTML that parses
 * to the same tree again.
 *
 * - The string is parsed once per round in an inert document (nothing is loaded,
 *   nothing runs), as the children of an element like `context`. The context
 *   matters: `<tr>` and `<td>` survive only inside a table-ish context, and the text
 *   of `<style>` is raw text in HTML but elements in SVG. Pass the element itself, so
 *   its namespace is kept, and what was checked is the tree that gets re-parsed on the
 *   published page.
 * - Rounds repeat until the serialization stops changing (a parse → serialize
 *   round trip of MathML / SVG with `style` is not stable, which is what mXSS
 *   uses). A string that has not settled after {@link MAX_SANITIZE_PASSES}
 *   rounds is dropped entirely rather than returned half-cleaned, and a warning says so.
 * - What is removed: the elements {@link isDangerousElement} reports, with their
 *   content (a microdata `<link itemprop>` without `rel` is content and stays), and
 *   the attributes {@link sanitizeAttributeValue} rejects.
 * - A string without `<` has no markup to clean (a character reference such as `&lt;`
 *   decodes to text, never to an element) and is returned as it is.
 * - Nothing can be made safe to put in a `<script>` or a `<style>` (the data is the
 *   code), so an empty string is returned for such a `context`.
 *
 * The result is only as safe as the place it is inserted: put it in the element, or an
 * element of the same name and namespace, that was passed as `context`.
 * @param html HTML string
 * @param context The element the result is inserted into, or its local name (HTML namespace)
 * @returns Sanitized HTML, an empty string when it cannot be made stable, and an empty
 * string when `html` is not a string or `context` is a `script` or a `style`
 * @example
 * ```ts
 * sanitizeHtml('<a href="java&#x09;script:alert(1)">x</a>'); // '<a>x</a>'
 * sanitizeHtml('a<script>alert(1)</script>b'); // 'ab'
 * sanitizeHtml('<td>x</td>', 'tr'); // '<td>x</td>'
 *
 * const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
 * sanitizeHtml('<tspan>x</tspan><animate attributeName="href"/>', text); // '<tspan>x</tspan>'
 * ```
 */
export function sanitizeHtml(html: string, context: string | Element = 'div'): string {
	if (typeof html !== 'string') {
		return '';
	}

	// The content of these is code, not markup: no string put in them is safe, `alert(1)` included
	if (
		CODE_CONTEXTS.has(
			(typeof context === 'string' ? context : context.localName).toLowerCase(),
		)
	) {
		return '';
	}

	if (!html.includes('<')) {
		return html;
	}

	const inert = getInertDocument();
	let current = html;
	for (let pass = 0; pass < MAX_SANITIZE_PASSES; pass++) {
		const host =
			typeof context === 'string'
				? inert.createElement(context)
				: inert.createElementNS(context.namespaceURI, context.localName);
		host.innerHTML = current;
		// A <template> keeps what is parsed into it in `content`, not in its children.
		// Not `'content' in host`: `<meta>` has a `content` too, and it is a string
		sanitizeChildren(host instanceof HTMLTemplateElement ? host.content : host);
		const next = host.innerHTML;
		if (next === current) {
			return next;
		}
		current = next;
	}

	// eslint-disable-next-line no-console -- the only trace of an HTML string that was dropped
	console.warn(
		`[frozen-patty] An HTML string did not settle within ${MAX_SANITIZE_PASSES} sanitizing rounds and was dropped.`,
	);
	return '';
}

/**
 * Removes dangerous elements and attributes below `parent`
 * @param parent
 */
function sanitizeChildren(parent: ParentNode): void {
	// `children` is live: removing while walking it would skip the sibling after each removal
	const dangerous: Element[] = [];
	for (const child of parent.children) {
		if (isDangerousElement(child)) {
			dangerous.push(child);
			continue;
		}
		sanitizeAttributes(child);
		// A <template> is in DANGEROUS_ELEMENTS, so it is not reached here today. Its content is a
		// tree of its own that `children` does not cover, so it is walked in case that changes
		sanitizeChildren(child instanceof HTMLTemplateElement ? child.content : child);
	}
	for (const child of dangerous) {
		child.remove();
	}
}

/**
 * SVG elements that set an attribute of their target at run time
 */
const ANIMATION_ELEMENTS = new Set([
	'animate',
	'set',
	'animatemotion',
	'animatetransform',
]);

/**
 * Whether an SVG animation element sets `href` or an event handler of its target.
 * The value of what it sets (`to`, `values`, …) is never looked at by the attribute
 * checks, so a `javascript:` URL there reaches a link; the element goes instead. Only
 * `attributeName` decides, read as the SMIL engine does (case ignored, `xlink:` dropped).
 * @param el
 */
function animatesDangerousAttribute(el: Element): boolean {
	for (const { name, value } of el.attributes) {
		if (name.toLowerCase() === 'attributename') {
			const target = value
				.trim()
				.toLowerCase()
				.replace(/^xlink:/, '');
			return target === 'href' || target.startsWith('on');
		}
	}
	return false;
}

/**
 * Whether the XSS protection removes an element together with its content: an element
 * in {@link DANGEROUS_ELEMENTS}, a `<meta>` with `http-equiv` (a redirect), a
 * `<link>` that is not plain microdata (without `itemprop`, or with `rel`, which loads
 * a stylesheet or a resource hint), and an SVG animation element (`animate`, `set`,
 * `animateMotion`, `animateTransform`) whose `attributeName` is `href` or an event
 * handler. Other animations (`attributeName="opacity"`) are content and stay.
 * @param el The element to judge, by its name and its attributes at this moment
 * @returns `true` when the element is removed together with its content
 * @example
 * ```ts
 * isDangerousElement(document.createElement('script')); // true
 * // <meta http-equiv="refresh" content="0;url=…"> redirects the page
 * // <meta itemprop="name" content="x"> is microdata
 * // <link rel="stylesheet" href="…"> and <link href="…"> load a resource
 * // <link itemprop="url" href="…"> is microdata
 * // <animate attributeName="href" to="javascript:…"> rewrites a link
 * // <animate attributeName="opacity" from="0" to="1"> is an animation
 * ```
 */
export function isDangerousElement(el: Element): boolean {
	const name = el.localName.toLowerCase();
	if (DANGEROUS_ELEMENTS.includes(name)) {
		return true;
	}
	if (name === 'meta') {
		return el.hasAttribute('http-equiv');
	}
	if (name === 'link') {
		return !el.hasAttribute('itemprop') || el.hasAttribute('rel');
	}
	if (ANIMATION_ELEMENTS.has(name)) {
		return animatesDangerousAttribute(el);
	}
	return false;
}

/**
 * Attributes whose value is a URL that the browser follows or loads. `poster`, `ping`,
 * `cite` and `background` do not run script in current browsers; they are checked
 * defensively, so that a stored page carries no `javascript:` or `data:` URL in any URL
 * attribute. (`ping` is a list: only its first URL is checked.)
 */
const URL_ATTRIBUTES = new Set([
	'href',
	'src',
	'action',
	'formaction',
	'xlink:href',
	'poster',
	'ping',
	'cite',
	'background',
]);

/**
 * Names of the event handler attributes (`onclick`, `onerror`, …)
 */
const EVENT_HANDLER_NAME = /^on[a-z]+$/;

/**
 * The attributes in which an image is loaded as an image, so that a `data:` URL of a
 * raster image is content and cannot run script
 */
const DATA_IMAGE_ATTRIBUTES = new Set(['src', 'poster']);

/**
 * A `data:` URL of a raster image. SVG is left out: in `<img>` it does not run script,
 * but the same value is no safer for being named `src`.
 */
const SAFE_DATA_IMAGE = /^data:image\/(?:png|jpeg|gif|webp|avif)[;,]/;

/**
 * Reduces a URL attribute value to what the URL parser sees: leading C0 controls and
 * spaces dropped, ASCII tabs and newlines removed anywhere, lower-cased.
 * @param value
 */
function normalizeUrl(value: string): string {
	const noBreaks = value.replaceAll(/[\t\n\r]/g, '');
	// Not `trim()`: that also strips Unicode whitespace, which the URL parser keeps
	let start = 0;
	while (start < noBreaks.length && noBreaks.codePointAt(start)! <= 0x20) {
		start++;
	}
	return noBreaks.slice(start).toLowerCase();
}

/**
 * Judges whether an attribute may be written with the given value.
 *
 * - Event handler attributes (`on` and letters: `onclick`, `onerror`, …) and `manifest`
 *   are never allowed.
 * - For the URL attributes (`href`, `src`, `action`, `formaction`, `xlink:href`,
 *   `poster`, `ping`, `cite`, `background`) a value that starts with `javascript:`,
 *   `data:` or `vbscript:` is not allowed. The value is read the way the URL parser
 *   reads it (leading control characters and spaces dropped, tabs and newlines removed
 *   anywhere, case ignored), because `java&#x09;script:alert(1)` is a `javascript:` URL
 *   to the browser but not to a plain `startsWith`.
 * - The exception is a `data:` URL of a raster image (`png`, `jpeg`, `gif`, `webp`,
 *   `avif`) in `src` or `poster`, which loads as an image and runs nothing.
 * - Anything else, and any value that is not a string, passes.
 * @param name Attribute name (case is ignored)
 * @param value Attribute value
 * @returns The value itself, or `null` when the attribute must not be written
 * @example
 * ```ts
 * sanitizeAttributeValue('href', 'java\tscript:alert(1)'); // null
 * sanitizeAttributeValue('onclick', 'x()'); // null
 * sanitizeAttributeValue('href', 'https://example.com/'); // 'https://example.com/'
 * sanitizeAttributeValue('title', 'javascript: is a language'); // 'javascript: is a language'
 * sanitizeAttributeValue('one-time', 'x'); // 'x'
 * sanitizeAttributeValue('src', 'data:image/png;base64,AAAA'); // 'data:image/png;base64,AAAA'
 * sanitizeAttributeValue('href', 'data:image/png;base64,AAAA'); // null
 * ```
 */
export function sanitizeAttributeValue<T extends PrimitiveDatum>(
	name: string,
	value: T,
): T | null {
	if (typeof value !== 'string') {
		return value;
	}

	name = name.toLowerCase();

	// Disallow event handler attributes. Their names are `on` and letters only, so an
	// attribute such as `one-time` is not one
	if (EVENT_HANDLER_NAME.test(name)) {
		return null;
	}

	// Check for dangerous protocol in link attributes
	if (URL_ATTRIBUTES.has(name)) {
		const url = normalizeUrl(value);
		if (
			url.startsWith('javascript:') ||
			url.startsWith('vbscript:') ||
			(url.startsWith('data:') &&
				!(DATA_IMAGE_ATTRIBUTES.has(name) && SAFE_DATA_IMAGE.test(url)))
		) {
			return null;
		}
	}

	// Other dangerous attributes
	if (['manifest'].includes(name)) {
		return null;
	}

	return value;
}

/**
 * Removes dangerous attributes from an element
 * @param element Target element
 */
function sanitizeAttributes(element: Element): void {
	const dangerousAttrs = [...element.attributes]
		.filter((attr) => sanitizeAttributeValue(attr.name, attr.value) === null)
		.map((attr) => attr.name);

	for (const attrName of dangerousAttrs) {
		element.removeAttribute(attrName);
	}
}

/**
 *
 * @param data
 * @param definedFields
 */
export function maxLengthOf(data: FrozenPattyData, definedFields: string[]) {
	let maxLength = 0;
	for (const key in data) {
		if (definedFields.includes(key) && Array.isArray(data[key])) {
			maxLength = Math.max(maxLength, data[key].length);
		}
	}
	return maxLength;
}

/**
 *
 * @param el
 * @param attr
 */
export function definedFields(el: Element, attr: string) {
	const fieldDefinitions = getFields(el, attr);
	return fieldDefinitions.map((field) => field.fieldName);
}

/**
 *
 * @param el
 * @param attr
 */
export function getFields(el: Element, attr: string) {
	const fields = el.getAttribute(`data-${attr}`);
	if (!fields) {
		return [];
	}
	return parseFields(fields);
}

/**
 *
 * @param el
 * @param attr
 * @param dataKeyName
 */
export function hasField(el: Element, attr: string, dataKeyName: string) {
	const fieldDefinitions = getFields(el, attr);
	return fieldDefinitions.some((field) => field.fieldName === dataKeyName);
}

/**
 *
 * @param fields
 * @param oldPropName
 * @param newPropName
 */
export function replaceProp(
	fields: readonly FieldDefinition[],
	oldPropName: string,
	newPropName: string,
) {
	return fields.map((field) => {
		if (field.propName === oldPropName) {
			return {
				...field,
				propName: newPropName,
			};
		}
		return field;
	});
}

/**
 *
 * @param fields
 * @param propName
 */
export function removeProp(fields: readonly FieldDefinition[], propName: string) {
	return fields.filter((field) => field.propName !== propName);
}

/**
 * - 値が配列の場合は、index に対応する値を返す。
 * - 値が配列でない場合は、そのまま返す。
 * - ⚠️ 値が配列で、index に対応する値が undefined の場合は、配列の最初の値を返す。
 * @param data
 * @param index
 */
export function flattenData(
	data: FrozenPattyData,
	index: number,
): FrozenPattyFlattenData {
	const result: FrozenPattyFlattenData = {};
	for (const key in data) {
		result[key] = Array.isArray(data[key])
			? data[key][index] === undefined
				? data[key][0]
				: data[key][index]
			: data[key];
	}
	return result;
}

/**
 * 特定の要素で、`propName in element`で判定できない属性名
 */
const specificProp: Record<string, string[]> = {
	/*
	 * JSDOMの未実装対策
	 * @see https://github.com/jsdom/jsdom/blob/main/lib/jsdom/living/nodes/HTMLSourceElement.webidl
	 * Living Standardでは実装済み
	 * @see https://html.spec.whatwg.org/multipage/embedded-content.html#htmlsourceelement
	 */
	source: ['width', 'height'],
	/*
	 * JSDOMの未実装対策（Node.js 側の保存で loading を書けるようにする）
	 * @see https://github.com/jsdom/jsdom/blob/main/lib/jsdom/living/nodes/HTMLImageElement.webidl
	 * Living Standardでは実装済み
	 * @see https://html.spec.whatwg.org/multipage/embedded-content.html#dom-img-loading
	 */
	img: ['loading'],
	/*
	 * JSDOMの未実装対策（Node.js 側の保存で、ポップアップの `command="show-modal"` を書けるようにする。
	 * 書けないと、保存した `<button>` は何も起こさず、公開ページの画像モーダルも開かない）
	 * JSDOM が `HTMLButtonElement.command` を実装したら（`'command' in button` が
	 * 真になったら）、この行は消せる。`commandfor` は保存データを持たず、画像モーダルが
	 * 実行時に付けるので、ここには要らない。
	 * @see https://github.com/jsdom/jsdom/blob/main/lib/jsdom/living/nodes/HTMLButtonElement.webidl
	 * Living Standardでは実装済み
	 * @see https://html.spec.whatwg.org/multipage/form-elements.html#dom-button-command
	 */
	button: ['command'],
};

/**
 *
 * @param el
 * @param name
 */
export function propInElement(el: Element, name: string): boolean {
	const has = name in el;
	if (has) {
		return true;
	}

	return specificProp[el.localName]?.includes(name) ?? false;
}
