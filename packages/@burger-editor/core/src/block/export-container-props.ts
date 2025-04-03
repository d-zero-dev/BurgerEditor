import type { ContainerProps } from './types.js';

import { findValueFromArray } from '../utils/find-value-from-array.js';
import { findValuePatternFromArray } from '../utils/find-value-pattern-from-array.js';

/**
 * コンテナ特性の文字列を解析してオブジェクトに変換する
 * @param containerPropsQuery - コンテナ特性の文字列（例: "grid:1", "inline:center:wrap", "float:start"）
 * @returns コンテナ特性のオブジェクト
 * @description
 * コンテナ特性の文字列をコロン区切りで解析し、以下のプロパティを設定:
 * - type: 'grid' | 'inline' | 'float'（デフォルト: 'inline'）
 * - immutable: オプションに'immutable'が含まれるかどうか
 * - justify: inlineタイプの場合の水平方向の配置（center, start, end, between, around, evenly）
 * - align: inlineタイプの場合の垂直方向の配置（align-center, align-start, align-end, align-stretch, align-baseline）
 * - wrap: inlineタイプの場合の折り返し設定（wrap, nowrap）
 * - columns: gridタイプの場合の列数（1以上の整数）
 * - float: floatタイプの場合の浮動方向（start, end）
 */
export function exportContainerProps(containerPropsQuery?: string): ContainerProps {
	const [type, ...options] =
		containerPropsQuery?.split(':').map((char) => char.trim().toLowerCase()) ?? [];

	return {
		type: findValueFromArray([type ?? 'inline'], ['grid', 'inline', 'float']) ?? 'inline',
		immutable: options.includes('immutable'),
		justify:
			type === 'inline'
				? findValueFromArray(options, [
						'center',
						'start',
						'end',
						'between',
						'around',
						'evenly',
					])
				: null,
		align:
			type === 'inline'
				? findValueFromArray(options, [
						'align-center',
						'align-start',
						'align-end',
						'align-stretch',
						'align-baseline',
					])
				: null,
		wrap: type === 'inline' ? findValueFromArray(options, ['wrap', 'nowrap']) : null,
		columns:
			type === 'grid'
				? (Number.parseInt(findValuePatternFromArray(options, /[1-9]\d*/) ?? '', 10) ?? 1)
				: null,
		float: type === 'float' ? findValueFromArray(options, ['start', 'end']) : null,
	};
}
