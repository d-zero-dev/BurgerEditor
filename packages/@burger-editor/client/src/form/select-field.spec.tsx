import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';

import { SelectField } from './select-field.js';

afterEach(cleanup);

const options = [
	{ value: 'a', label: 'A' },
	{ value: 'b', label: 'B' },
];

describe('SelectField', () => {
	test('describedBy を渡すと、select の aria-describedby になる', () => {
		render(
			<>
				<SelectField
					label="種類"
					value="a"
					options={options}
					onChange={() => {}}
					disabled
					describedBy="note"
				/>
				<small id="note">先に画像を選択してください。</small>
			</>,
		);

		const select = screen.getByRole('combobox', { name: '種類' });
		expect(select.getAttribute('aria-describedby')).toBe('note');
	});

	test('describedBy を渡さなければ、aria-describedby を付けない', () => {
		render(<SelectField label="種類" value="a" options={options} onChange={() => {}} />);

		expect(screen.getByRole('combobox').hasAttribute('aria-describedby')).toBe(false);
	});
});
