import type { EditableContent } from '../editable-content.js';
import type { EditableAreaType } from '../types.js';

export type ConfirmCallback = () => Promise<boolean> | boolean;

/**
 * 編集エリア間のコンテンツコピー（下書き⇄本稿）を安全に実行する
 *
 * コピー元が空（コピー先を消してしまう）または両者が同一（コピーする
 * 意味がない）の場合は、確認を出さずに何もしない
 * @param source コピー元の編集エリア
 * @param destination コピー先の編集エリア
 * @param confirm 上書き前のユーザー確認。falseを返すと中止する
 * @returns コピーを実行した場合はtrue
 */
export async function copyEditableArea<
	T extends EditableAreaType,
	T2 extends Exclude<EditableAreaType, T>,
>(
	source: EditableContent<T>,
	destination: EditableContent<T2>,
	confirm?: ConfirmCallback,
): Promise<boolean> {
	if (source.isEmpty() || source.isSame(destination)) {
		return false;
	}

	// confirm省略時は確認不要とみなして実行する
	if (confirm && !(await confirm())) {
		return false;
	}

	await source.copyTo(destination);
	return true;
}
