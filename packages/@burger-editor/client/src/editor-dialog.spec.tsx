import { narrowElement } from '@burger-editor/utils';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { EditorDialog } from './editor-dialog.js';

afterEach(cleanup);

describe('同一documentに同名の複数EditorDialogが存在しても互いを侵さない', () => {
	test('dialogのidはuseId由来で一意になる', () => {
		const { container: containerA } = render(
			<EditorDialog name="options" open={false} onClose={() => {}}>
				A
			</EditorDialog>,
		);
		const { container: containerB } = render(
			<EditorDialog name="options" open={false} onClose={() => {}}>
				B
			</EditorDialog>,
		);

		const dialogA = containerA.querySelector('dialog')!;
		const dialogB = containerB.querySelector('dialog')!;

		expect(dialogA.id).not.toBe(dialogB.id);
		expect(dialogA.id).not.toBe('');
	});

	test('closeボタンのcommandforと決定ボタンのformは自分自身のdialog/formを指す', () => {
		const { container } = render(
			<EditorDialog
				name="options"
				open={false}
				onClose={() => {}}
				buttons={{ close: 'キャンセル', complete: '決定' }}>
				body
			</EditorDialog>,
		);

		const dialog = container.querySelector('dialog')!;
		const form = container.querySelector('form')!;
		const closeButton = container.querySelector('button[command="close"]')!;
		const completeButton = container.querySelector('button[type="submit"]')!;

		expect(closeButton.getAttribute('commandfor')).toBe(dialog.id);
		expect(completeButton.getAttribute('form')).toBe(form.id);
	});

	test('data-bge-componentはnameベースの種別フックのまま維持される', () => {
		const { container: containerA } = render(
			<EditorDialog name="options" open={false} onClose={() => {}}>
				A
			</EditorDialog>,
		);
		const { container: containerB } = render(
			<EditorDialog name="options" open={false} onClose={() => {}}>
				B
			</EditorDialog>,
		);

		expect(
			containerA.querySelectorAll('[data-bge-component="options-dialog"]'),
		).toHaveLength(1);
		expect(
			containerB.querySelectorAll('[data-bge-component="options-dialog"]'),
		).toHaveLength(1);
	});
});

describe('action ベースの送信', () => {
	test('成功時はactionを呼び、エラー表示は出ない', async () => {
		const action = vi.fn(async () => {});
		render(
			<EditorDialog
				name="options"
				open
				onClose={() => {}}
				action={action}
				buttons={{ close: 'キャンセル', complete: '決定' }}>
				body
			</EditorDialog>,
		);
		const form = document.querySelector('form')!;

		await act(async () => {
			fireEvent.submit(form);
			await Promise.resolve();
		});

		expect(action).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole('alert')).toBeNull();
	});

	test('失敗時はrole=alertでエラーメッセージを表示する', async () => {
		const action = vi.fn().mockRejectedValue(new Error('保存に失敗しました'));
		render(
			<EditorDialog
				name="options"
				open
				onClose={() => {}}
				action={action}
				buttons={{ close: 'キャンセル', complete: '決定' }}>
				body
			</EditorDialog>,
		);
		const form = document.querySelector('form')!;

		await act(async () => {
			fireEvent.submit(form);
			await Promise.resolve();
		});

		const alert = await screen.findByRole('alert');
		expect(alert.textContent).toBe('保存に失敗しました');
	});

	test('キャンセル後に別の対象で開き直すと前回の失敗メッセージは残らない（regression）', async () => {
		const failingAction = vi.fn().mockRejectedValue(new Error('Aの保存に失敗しました'));
		const { rerender } = render(
			<EditorDialog
				name="options"
				open
				onClose={() => {}}
				action={failingAction}
				buttons={{ close: 'キャンセル', complete: '決定' }}>
				A
			</EditorDialog>,
		);
		const form = document.querySelector('form')!;

		await act(async () => {
			fireEvent.submit(form);
			await Promise.resolve();
		});
		await screen.findByRole('alert');

		// キャンセル（EditorDialog自体はアンマウントされず、openがfalseに
		// なるだけ）
		rerender(
			<EditorDialog
				name="options"
				open={false}
				onClose={() => {}}
				action={failingAction}
				buttons={{ close: 'キャンセル', complete: '決定' }}>
				A
			</EditorDialog>,
		);

		// 別の対象（Bブロック）で再度開く。同じEditorDialogインスタンスが
		// openをtrueへ戻すだけなので、useActionStateのerrorが残っていると
		// Bの何も送信していないフォームにAの失敗メッセージが即座に出る
		rerender(
			<EditorDialog
				name="options"
				open
				onClose={() => {}}
				action={vi.fn(async () => {})}
				buttons={{ close: 'キャンセル', complete: '決定' }}>
				B
			</EditorDialog>,
		);

		expect(screen.queryByRole('alert')).toBeNull();
	});

	test('送信中は決定ボタンがdisabled/aria-busyになり、完了後に戻る', async () => {
		let resolveAction!: () => void;
		const action = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					resolveAction = resolve;
				}),
		);
		render(
			<EditorDialog
				name="options"
				open
				onClose={() => {}}
				action={action}
				buttons={{ close: 'キャンセル', complete: '決定' }}>
				body
			</EditorDialog>,
		);
		const form = document.querySelector('form')!;
		const submitButton = narrowElement(
			screen.getByRole('button', { name: '決定' }),
			HTMLButtonElement,
			'決定',
		);

		act(() => {
			fireEvent.submit(form);
		});
		expect(submitButton.disabled).toBe(true);
		expect(submitButton.getAttribute('aria-busy')).toBe('true');

		await act(async () => {
			resolveAction();
			await Promise.resolve();
		});
		expect(submitButton.disabled).toBe(false);
		expect(submitButton.getAttribute('aria-busy')).toBe('false');
	});
});
