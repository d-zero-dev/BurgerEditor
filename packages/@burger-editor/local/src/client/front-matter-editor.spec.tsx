/* @jsxImportSource react */
import type { FrontMatterEditorHandle } from './front-matter-editor.js';

import { fireEvent, screen } from '@testing-library/react';
import { act } from 'react';
import { test, expect, beforeEach, afterEach, vi, describe } from 'vitest';

import { createFrontMatterEditor } from './front-matter-editor.js';

// React 18+のact環境フラグ（Testing LibraryのrenderではなくcreateRootを
// 直接使うため自前で立てる）
(globalThis as Record<string, unknown>)['IS_REACT_ACT_ENVIRONMENT'] = true;

// jsdomのHTMLDialogElementはshowModal未実装のバージョンがあるため、
// open属性の付け外しだけの最小スタブを差し込む
if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
	HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
		this.setAttribute('open', '');
	};
	HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
		this.removeAttribute('open');
		this.dispatchEvent(new Event('close'));
	};
}

let container: HTMLElement;
let editor: FrontMatterEditorHandle | null = null;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
});

afterEach(() => {
	act(() => {
		editor?.unmount();
	});
	editor = null;
	document.body.innerHTML = '';
});

/**
 * エディタをマウントする
 * @param initialData - 初期Front Matter
 * @param onUpdated - 更新コールバック
 * @param hasFrontMatter - Front Matterが元から存在したか
 */
function mount(
	initialData: Record<string, unknown>,
	onUpdated?: (data: Record<string, unknown>) => void,
	hasFrontMatter = true,
) {
	act(() => {
		editor = createFrontMatterEditor({
			container,
			initialData,
			hasFrontMatter,
			onUpdated,
		});
	});
	return editor as unknown as FrontMatterEditorHandle;
}

/**
 * jsdomはInvoker Commands API未実装のため、commandfor先へ合成command
 * イベントを送ってボタン起動を再現する
 * @param button
 */
function invokeCommand(button: HTMLElement) {
	const targetId = button.getAttribute('commandfor');
	const target = targetId ? document.getElementById(targetId) : null;
	if (!target) {
		throw new Error('commandfor target not found');
	}
	const event = new Event('command');
	Object.assign(event, { command: button.getAttribute('command'), source: button });
	act(() => {
		target.dispatchEvent(event);
	});
}

/**
 * label文字列からフィールド入力要素を取得する
 * @param label
 */
function getField(label: string) {
	return screen.getByLabelText<HTMLInputElement>(label);
}

describe('レンダリング', () => {
	test('初期データから型別のinputが描画される', () => {
		mount({
			title: 'ページタイトル',
			count: 42,
			published: true,
			date: '2026-01-15',
			tags: ['a', 'b'],
		});

		expect(getField('title').type).toBe('text');
		expect(getField('title').value).toBe('ページタイトル');
		expect(getField('count').type).toBe('number');
		expect(getField('count').value).toBe('42');
		expect(getField('published').type).toBe('checkbox');
		expect(getField('published').checked).toBe(true);
		expect(getField('date').type).toBe('date');
		expect(getField('date').value).toBe('2026-01-15');
		const tags = screen.getByLabelText<HTMLTextAreaElement>('tags');
		expect(tags.tagName).toBe('TEXTAREA');
		expect(JSON.parse(tags.value)).toEqual(['a', 'b']);
	});

	test('フィールドが無い場合は空メッセージを表示する', () => {
		mount({});
		expect(
			screen.getByText(
				'フィールドがありません。「+ 追加」ボタンでフィールドを追加してください。',
			),
		).toBeTruthy();
	});
});

describe('focus保持', () => {
	test('入力途中に別フィールドを削除してもinput要素とフォーカスが維持される', () => {
		mount({ title: 'A', body: 'B' });

		const input = getField('title');
		act(() => {
			input.focus();
		});
		fireEvent.change(input, { target: { value: 'A追記' } });
		expect(document.activeElement).toBe(input);

		// bodyフィールドを削除（フィールド一覧が更新される操作）
		const deleteButtons = screen.getAllByRole('button', { name: '×' });
		invokeCommand(deleteButtons[1] as HTMLElement);

		// 全再描画（innerHTML消去→再構築）ではフィールドが作り直されて
		// 入力中のfocus/caret/IMEが失われる。Reactの差分更新では同一要素が残る
		const inputAfter = getField('title');
		expect(inputAfter).toBe(input);
		expect(inputAfter.value).toBe('A追記');
		expect(document.activeElement).toBe(input);
	});
});

describe('編集', () => {
	test('値の変更がonUpdatedとgetData()に反映される', () => {
		const onUpdated = vi.fn();
		const handle = mount({ title: 'A' }, onUpdated);

		fireEvent.change(getField('title'), { target: { value: '新タイトル' } });

		expect(onUpdated).toHaveBeenCalledWith({ title: '新タイトル' });
		expect(handle.getData()).toEqual({ title: '新タイトル' });
	});

	test('数値フィールドを空にするとnullになる', () => {
		const handle = mount({ count: 10 });

		fireEvent.change(getField('count'), { target: { value: '' } });

		expect(handle.getData()).toEqual({ count: null });
	});

	test('不正なJSONの間は確定値を変えずエラー表示し、修正すると反映される', () => {
		const handle = mount({ tags: ['a'] });
		const textarea = screen.getByLabelText<HTMLTextAreaElement>('tags');

		fireEvent.change(textarea, { target: { value: '["a",' } });

		expect(textarea.value).toBe('["a",');
		expect(textarea.classList.contains('fm-editor-error')).toBe(true);
		expect(handle.getData()).toEqual({ tags: ['a'] });

		fireEvent.change(textarea, { target: { value: '["a","b"]' } });

		expect(textarea.classList.contains('fm-editor-error')).toBe(false);
		expect(handle.getData()).toEqual({ tags: ['a', 'b'] });
	});
});

describe('フィールドの追加と削除', () => {
	test('ダイアログのsubmitでフィールドが追加されonUpdatedが発火する', () => {
		const onUpdated = vi.fn();
		const handle = mount({}, onUpdated);

		invokeCommand(screen.getByRole('button', { name: '+ 追加' }));

		const keyInput = screen.getByLabelText('キー名');
		fireEvent.change(keyInput, { target: { value: 'author' } });
		act(() => {
			fireEvent.submit(keyInput.closest('form') as HTMLFormElement);
		});

		expect(handle.getData()).toEqual({ author: '' });
		expect(onUpdated).toHaveBeenCalledWith({ author: '' });
		expect(getField('author')).toBeTruthy();
	});

	test('既存キーと重複するフィールドは追加されない', () => {
		const handle = mount({ title: '既存' });

		invokeCommand(screen.getByRole('button', { name: '+ 追加' }));

		const keyInput = screen.getByLabelText('キー名');
		fireEvent.change(keyInput, { target: { value: 'title' } });
		act(() => {
			fireEvent.submit(keyInput.closest('form') as HTMLFormElement);
		});

		expect(handle.getData()).toEqual({ title: '既存' });
	});

	test('削除ボタンで該当フィールドだけが消える', () => {
		const onUpdated = vi.fn();
		const handle = mount({ title: 'A', body: 'B' }, onUpdated);

		invokeCommand(screen.getAllByRole('button', { name: '×' })[0] as HTMLElement);

		expect(handle.getData()).toEqual({ body: 'B' });
		expect(onUpdated).toHaveBeenCalledWith({ body: 'B' });
	});

	test('削除したJSONフィールドの未確定ドラフトは同名で再追加しても復活しない（regression）', () => {
		mount({ tags: ['a'] });
		const textarea = screen.getByLabelText<HTMLTextAreaElement>('tags');

		// 不正なJSONを入力してドラフトを残す
		fireEvent.change(textarea, { target: { value: '["a",' } });
		expect(textarea.classList.contains('fm-editor-error')).toBe(true);

		// tagsフィールドを削除
		invokeCommand(screen.getByRole('button', { name: '×' }));
		expect(screen.queryByLabelText('tags')).toBeNull();

		// 同名のjsonフィールドを再追加
		invokeCommand(screen.getByRole('button', { name: '+ 追加' }));
		fireEvent.change(screen.getByLabelText('キー名'), { target: { value: 'tags' } });
		fireEvent.change(screen.getByLabelText('型'), { target: { value: 'json' } });
		act(() => {
			fireEvent.submit(
				screen.getByLabelText('キー名').closest('form') as HTMLFormElement,
			);
		});

		const newTextarea = screen.getByLabelText<HTMLTextAreaElement>('tags');
		// 古い（無効な）ドラフト文字列ではなく、新フィールドの既定値が出る
		expect(newTextarea.value).toBe('[]');
		expect(newTextarea.classList.contains('fm-editor-error')).toBe(false);
	});
});

describe('handle', () => {
	test('hasFrontMatter時はgetOriginalFrontMatterが元のJSON文字列を返す', () => {
		const handle = mount({ title: 'A' }, undefined, true);
		expect(handle.getOriginalFrontMatter()).toBe(JSON.stringify({ title: 'A' }));
	});

	test('Front Matterが元から無い場合はgetOriginalFrontMatterがundefined', () => {
		const handle = mount({}, undefined, false);
		expect(handle.getOriginalFrontMatter()).toBeUndefined();
	});
});
