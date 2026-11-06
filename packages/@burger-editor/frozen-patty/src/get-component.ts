/**
 * HTML からデータを読む。
 *
 * リストの中のリスト（`data-*-list` の入れ子）にあるフィールドは、外側の項目ごとの
 * 配列の配列として読む。書き出し（`setComponent`）が外側の項目ごとに配列を 1 段
 * 剥がして内側のリストに渡すので、その逆にあたる。最も内側のリストの値は文書順に
 * 積み（深さ 1 のリストと同じ）、外側の段は項目の位置で置く。値を持たない外側の
 * 項目は `[]` にして、後ろの項目の位置がずれないようにする。
 *
 * Why not: 同じキーが別の深さにある場合や、兄弟のリストが内側のキーを共有する
 * 場合は区別しない。書き出し側がどちらも区別できず、往復しないため。
 */
import type { Filter, FrozenPattyData, PrimitiveData, PrimitiveDatum } from './types.js';

import { getValues } from './get-values.js';
import { REVERSE_LIST_ELEMENTS } from './utils.js';

/**
 * 要素を含むリストの中での位置（直下の子のうち、要素を含むものの index と子の数）
 */
type ListPosition = { readonly index: number; readonly length: number };

type ListedValue = readonly [
	key: keyof FrozenPattyData,
	value: PrimitiveDatum,
	forceArray: boolean,
	positions: readonly ListPosition[],
];

/**
 *
 * @param el
 * @param attr
 * @param typeConvert
 * @param filter
 */
export function getComponent(
	el: Element,
	attr: string,
	typeConvert: boolean,
	filter?: Filter,
): FrozenPattyData {
	el = el.cloneNode(true) as Element;

	const reverseListElements = el.querySelectorAll(
		`:is(${REVERSE_LIST_ELEMENTS.join(',')})[data-${attr}-list]`,
	);
	for (const reverseListElement of reverseListElements) {
		const children: Element[] = [];
		while (reverseListElement.lastElementChild) {
			children.push(reverseListElement.lastElementChild);
			reverseListElement.lastElementChild.remove();
		}
		reverseListElement.append(...children);
	}

	const listAttr = `data-${attr}-list`;
	const filedElements = el.querySelectorAll(`[data-${attr}]`);
	const values: ListedValue[] = [];
	const childIndexes = new Map<Element, Map<Element, number>>();
	for (const _el of filedElements) {
		const positions = listPositions(_el, listAttr, childIndexes);
		for (const [key, value, forceArray] of getValues(_el, typeConvert, attr, filter)) {
			values.push([key, value, forceArray, positions]);
		}
	}
	return nestedArrayToHash(values);
}

/**
 * 要素を含むリスト（祖先のみ。自分自身は含まない）ごとの位置を、外側から順に返す。
 * `picture` の子は呼び出し側が先に反転しているので、DOM の順がデータの順になる
 * @param el
 * @param listAttr
 * @param childIndexes - リストの根ごとの、子の位置。フィールドの要素ごとに子を数え直さない
 * （数え直すと、リストの項目数とフィールド数の積の手間になる）よう、読み取り 1 回の間で使い回す
 */
function listPositions(
	el: Element,
	listAttr: string,
	childIndexes: Map<Element, Map<Element, number>>,
): ListPosition[] {
	const positions: ListPosition[] = [];
	let child = el;
	let parent = child.parentElement;
	while (parent) {
		if (parent.hasAttribute(listAttr)) {
			let indexes = childIndexes.get(parent);
			if (!indexes) {
				indexes = new Map([...parent.children].map((item, index) => [item, index]));
				childIndexes.set(parent, indexes);
			}
			positions.unshift({
				index: indexes.get(child) ?? -1,
				length: parent.children.length,
			});
		}
		child = parent;
		parent = parent.parentElement;
	}
	return positions;
}

/**
 * 値をキーごとにまとめる。入れ子でない値（リストの外・深さ 1 のリスト）は
 * `arrayToHash` と同じ規則で、入れ子の値は外側の項目の位置ごとの配列に置く
 * @param values
 */
function nestedArrayToHash(values: readonly ListedValue[]): FrozenPattyData {
	const result: FrozenPattyData = {};
	for (const [key, value, forceArray, positions] of values) {
		if (!forceArray) {
			result[key] = value;
			continue;
		}
		const outer = positions.slice(0, -1);
		const current = result[key];
		if (outer.length === 0) {
			if (Array.isArray(current)) {
				current.push(value);
				continue;
			}
			result[key] = key in result ? [current, value] : [value];
			continue;
		}
		let container: PrimitiveData[];
		if (Array.isArray(current)) {
			container = current;
		} else {
			container = key in result ? [current] : [];
			result[key] = container;
		}
		place(container, outer, value);
	}
	return result;
}

/**
 * 外側の段の位置に従って、値を入れ子の配列に置く。最も内側では文書順に積む
 * @param container
 * @param outer
 * @param value
 */
function place(
	container: PrimitiveData[],
	outer: readonly ListPosition[],
	value: PrimitiveDatum,
) {
	const [position, ...rest] = outer;
	if (!position) {
		container.push(value);
		return;
	}
	while (container.length < position.length) {
		container.push([]);
	}
	let slot = container[position.index];
	if (!Array.isArray(slot)) {
		slot = slot === undefined ? [] : [slot];
		container[position.index] = slot;
	}
	place(slot, rest, value);
}
