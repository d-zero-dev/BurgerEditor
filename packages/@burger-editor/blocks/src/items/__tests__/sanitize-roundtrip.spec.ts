// 標準アイテムのテンプレートが、保存時の XSS サニタイズ（itemImport の既定）で変わらないこと。
// サニタイズ無しの書き込み（`dangerouslySetInnerHTML: true`）と同じ結果になることで見る。
// アイテムを足したとき、サニタイザーが落とす要素・属性をテンプレートに書いてしまえば、
// 保存済みのページを編集し直したときに消えるので、ここで気づける
import { itemExport, itemImport } from '@burger-editor/core';
import { describe, expect, test } from 'vitest';

import { items } from '../items.js';

describe('標準アイテムのテンプレートはサニタイザーで変わらない', () => {
	test.each(Object.entries(items))('%s（空のデータ）', (_name, definition) => {
		const data = itemExport(definition.template);

		expect(itemImport(definition.template, data)).toBe(
			itemImport(definition.template, { ...data, dangerouslySetInnerHTML: true }),
		);
	});

	test.each(Object.entries(items))('%s（すべての欄に値がある）', (_name, definition) => {
		const filled = Object.fromEntries(
			Object.keys(itemExport(definition.template)).map((key) => [
				key,
				/src|href|path|url/i.test(key) ? 'https://example.com/a.png' : 'テキスト',
			]),
		);

		expect(itemImport(definition.template, filled)).toBe(
			itemImport(definition.template, { ...filled, dangerouslySetInnerHTML: true }),
		);
	});
});
