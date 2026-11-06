import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { TextField } from './text-field.js';

afterEach(cleanup);

describe('TextField', () => {
	test('入力欄からフォーカスが外れると onBlur が呼ばれる', () => {
		const onBlur = vi.fn();
		render(
			<TextField label="メディアクエリー" value="" onChange={() => {}} onBlur={onBlur} />,
		);

		fireEvent.blur(screen.getByRole('textbox'));

		expect(onBlur).toHaveBeenCalledTimes(1);
	});

	test('フォーカスが外れても onChange は呼ばれず、値も変わらない（値を変えるのは onBlur を渡した呼び出し元）', () => {
		const onChange = vi.fn();
		const onBlur = vi.fn();
		render(
			<TextField
				label="メディアクエリー"
				value="abc"
				onChange={onChange}
				onBlur={onBlur}
			/>,
		);

		fireEvent.blur(screen.getByRole('textbox'));

		expect(onBlur).toHaveBeenCalledTimes(1);
		expect(onChange).not.toHaveBeenCalled();
		expect(screen.getByRole<HTMLInputElement>('textbox').value).toBe('abc');
	});
});
