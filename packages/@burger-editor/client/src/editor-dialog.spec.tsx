import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';

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
