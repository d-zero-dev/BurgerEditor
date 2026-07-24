import { render, screen, fireEvent } from '@testing-library/react';
import { test, expect, describe, vi } from 'vitest';

import {
	Checkbox,
	Fieldset,
	NumberField,
	RadioGroup,
	SelectField,
	TextField,
} from '../form/index.js';

/**
 * label文字列から要素を型安全に取得する
 * @param label
 * @param ctor
 */
function getAs<T extends HTMLElement>(label: string, ctor: new () => T): T {
	const el = screen.getByLabelText(label);
	if (!(el instanceof ctor)) {
		throw new TypeError(`unexpected element for: ${label}`);
	}
	return el;
}

describe('TextField', () => {
	test('renders label > span + input and lifts changes', () => {
		const onChange = vi.fn();
		render(<TextField label="URL" name="bge-link" value="" onChange={onChange} />);

		const input = screen.getByLabelText('URL');
		expect(input).toBeInstanceOf(HTMLInputElement);
		expect((input as HTMLInputElement).name).toBe('bge-link');

		fireEvent.change(input, { target: { value: 'https://example.com' } });
		expect(onChange).toHaveBeenCalledWith('https://example.com');
	});
});

describe('NumberField', () => {
	test('lifts numeric values', () => {
		const onChange = vi.fn();
		render(<NumberField label="幅" value={100} min={1} max={400} onChange={onChange} />);

		const input = screen.getByLabelText('幅');
		fireEvent.change(input, { target: { value: '250' } });
		expect(onChange).toHaveBeenCalledWith(250);
	});
});

describe('Checkbox', () => {
	test('lifts checked state', () => {
		const onChange = vi.fn();
		render(<Checkbox label="遅延読み込み" checked={false} onChange={onChange} />);

		const checkbox = screen.getByLabelText('遅延読み込み');
		fireEvent.click(checkbox);
		expect(onChange).toHaveBeenCalledWith(true);
	});
});

describe('SelectField', () => {
	test('renders options and lifts selection', () => {
		const onChange = vi.fn();
		render(
			<SelectField
				label="区切り線の種類"
				value="primary"
				onChange={onChange}
				options={[
					{ value: 'primary', label: '標準' },
					{ value: 'dashed', label: '破線' },
				]}
			/>,
		);

		const select = getAs('区切り線の種類', HTMLSelectElement);
		expect(select.options).toHaveLength(2);

		fireEvent.change(select, { target: { value: 'dashed' } });
		expect(onChange).toHaveBeenCalledWith('dashed');
	});
});

describe('RadioGroup', () => {
	test('renders a radiogroup and lifts the selected value', () => {
		const onChange = vi.fn();
		render(
			<RadioGroup
				label="基準"
				name="bge-scale-type"
				value="original"
				onChange={onChange}
				options={[
					{ value: 'container', label: 'コンテナ' },
					{ value: 'original', label: '画像基準' },
				]}
			/>,
		);

		expect(screen.getByRole('radiogroup')).toBeTruthy();
		const original = getAs('画像基準', HTMLInputElement);
		expect(original.checked).toBe(true);

		fireEvent.click(screen.getByLabelText('コンテナ'));
		expect(onChange).toHaveBeenCalledWith('container');
	});
});

describe('Fieldset', () => {
	test('renders legend and children', () => {
		render(
			<Fieldset legend="リンク">
				<p>content</p>
			</Fieldset>,
		);

		expect(screen.getByRole('group', { name: 'リンク' })).toBeTruthy();
		expect(screen.getByText('content')).toBeTruthy();
	});
});
