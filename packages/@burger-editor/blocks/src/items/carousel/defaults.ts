import type { CarouselData } from './definition.js';
import type { Config } from '@burger-editor/core';

import { Item } from '@burger-editor/core';

import template from './template.html';

/**
 * テンプレートを読むだけの設定。サンプル画像のパスなどの置換値は、既定値に
 * 使わない項目（`path` / `alt`）にしか入らない
 */
const TEMPLATE_CONFIG: Config = {
	classList: [],
	googleMapsApiKey: null,
	sampleImagePath: '',
	sampleFilePath: '',
	stylesheets: [],
};

let cache: CarouselData | undefined;

/**
 * `template.html` が持つ値（全体設定と、スライド 1 枚目の値）。
 *
 * 既定値の正は `template.html` ひとつだけにする。コードにも同じ値を
 * 書き写すと、片方だけ直したときに、挿入した直後と編集した後で値が
 * 変わってしまう。テンプレートを読むには DOM が要るので、モジュールの
 * 読み込み時（Node.js からも import される）ではなく、初めて使うときに読む。
 * @returns テンプレートから読んだ値。呼び出し側で書き換えない
 * @example
 * ```ts
 * const { perView } = templateDefaults(); // 1
 * ```
 */
export function templateDefaults(): Readonly<CarouselData> {
	cache ??= readTemplate();
	return cache;
}

/**
 * テンプレートだけを持つ最小のアイテムを作って、値を読む
 */
function readTemplate(): CarouselData {
	const seeds = new Map([
		['carousel', { version: '0', name: 'carousel', template, style: '' }],
	]);
	return Item.create<CarouselData, {}>('carousel', seeds, TEMPLATE_CONFIG).export();
}
