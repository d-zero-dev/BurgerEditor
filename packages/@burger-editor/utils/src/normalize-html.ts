/**
 * HTMLの構造を正規化して比較する
 * 空白や属性順序の違いを無視し、タグ構造のみを比較する
 * @param html1 比較対象のHTML文字列1
 * @param html2 比較対象のHTML文字列2
 * @returns 構造が同じ場合true、異なる場合false
 */
export function normalizeHtmlStructure(html1: string, html2: string): boolean {
	const doc1 = new Range().createContextualFragment(html1);
	const doc2 = new Range().createContextualFragment(html2);

	return compareElements(doc1, doc2);
}

/**
 * 2つの要素の構造を比較する
 * @param el1 比較対象の要素1
 * @param el2 比較対象の要素2
 * @returns 構造が同じ場合true、異なる場合false
 */
function compareElements(
	el1: DocumentFragment | Element,
	el2: DocumentFragment | Element,
): boolean {
	// 子要素の数を取得（テキストノードは無視）
	const children1 = [...el1.children];
	const children2 = [...el2.children];

	// 子要素の数が異なる場合は構造が異なる
	if (children1.length !== children2.length) {
		return false;
	}

	// 子要素がない場合（テキストのみまたは空要素）
	if (children1.length === 0) {
		// テキスト内容を正規化して比較
		const text1 = normalizeText(el1.textContent ?? '');
		const text2 = normalizeText(el2.textContent ?? '');
		return text1 === text2;
	}

	// 各子要素を比較
	for (const [i, child1] of children1.entries()) {
		const child2 = children2[i];

		if (!child1 || !child2 || !compareElementStructure(child1, child2)) {
			return false;
		}
	}

	return true;
}

/**
 * 2つの要素の構造を詳細に比較する
 * @param el1 比較対象の要素1
 * @param el2 比較対象の要素2
 * @returns 構造が同じ場合true、異なる場合false
 */
function compareElementStructure(el1: Element, el2: Element): boolean {
	// タグ名が異なる場合は構造が異なる
	if (el1.tagName !== el2.tagName) {
		return false;
	}

	// 属性を比較（順序は無視）
	const attrs1 = getNormalizedAttributes(el1);
	const attrs2 = getNormalizedAttributes(el2);

	if (!compareAttributes(attrs1, attrs2)) {
		return false;
	}

	// 子要素を再帰的に比較
	return compareElements(el1, el2);
}

/**
 * 要素の属性を正規化して取得する
 * @param el 対象の要素
 * @returns 属性名をキー、属性値を値とするオブジェクト
 */
function getNormalizedAttributes(el: Element): Record<string, string> {
	const attrs: Record<string, string> = {};

	for (const attr of el.attributes) {
		attrs[attr.name] = attr.value;
	}

	return attrs;
}

/**
 * 2つの属性オブジェクトを比較する
 * @param attrs1 比較対象の属性1
 * @param attrs2 比較対象の属性2
 * @returns 属性が同じ場合true、異なる場合false
 */
function compareAttributes(
	attrs1: Record<string, string>,
	attrs2: Record<string, string>,
): boolean {
	const keys1 = Object.keys(attrs1).toSorted();
	const keys2 = Object.keys(attrs2).toSorted();

	// 属性名の数が異なる場合は異なる
	if (keys1.length !== keys2.length) {
		return false;
	}

	// 各属性を比較
	for (const [i, key1] of keys1.entries()) {
		const key2 = keys2[i];

		// 属性名が異なる場合は異なる
		if (key1 !== key2) {
			return false;
		}

		// 属性値が異なる場合は異なる
		if (attrs1[key1] !== attrs2[key2]) {
			return false;
		}
	}

	return true;
}

/**
 * テキストを正規化する（空白文字を統一）
 * @param text 対象のテキスト
 * @returns 正規化されたテキスト
 */
function normalizeText(text: string): string {
	return text.replaceAll(/\s+/g, ' ').trim();
}
