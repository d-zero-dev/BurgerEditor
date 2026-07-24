import { narrowElement } from '@burger-editor/utils';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { test, expect, describe, afterEach, vi } from 'vitest';

import {
	Checkbox,
	Fieldset,
	NumberField,
	RadioGroup,
	SelectField,
	TextArea,
	TextField,
} from '../form/index.js';

// vitestはglobals無効のためtesting-libraryの自動cleanupが効かない。
// レンダー結果がテスト間でリークしないよう明示的に登録する
afterEach(cleanup);

/**
 * label文字列から要素を型安全に取得する
 * @param label
 * @param ctor
 */
function getAs<T extends HTMLElement>(label: string, ctor: new () => T): T {
	return narrowElement(screen.getByLabelText(label), ctor, label);
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

describe('TextArea', () => {
	test('renders label > span + textarea and lifts changes', () => {
		const onChange = vi.fn();
		render(
			<TextArea label="説明" name="bge-caption" value="前の値" onChange={onChange} />,
		);

		const textarea = getAs('説明', HTMLTextAreaElement);
		expect(textarea.name).toBe('bge-caption');
		expect(textarea.value).toBe('前の値');

		fireEvent.change(textarea, { target: { value: '複数行の\nテキスト' } });
		expect(onChange).toHaveBeenCalledWith('複数行の\nテキスト');
	});

	test('disabled disables the textarea', () => {
		render(<TextArea label="説明" value="" disabled onChange={() => {}} />);

		expect(getAs('説明', HTMLTextAreaElement).disabled).toBe(true);
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

		expect(screen.getByRole('radiogroup', { name: '基準' })).toBeInstanceOf(HTMLElement);
		const original = getAs('画像基準', HTMLInputElement);
		expect(original.checked).toBe(true);
		expect(getAs('コンテナ', HTMLInputElement).checked).toBe(false);

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

		const fieldset = narrowElement(
			screen.getByRole('group', { name: 'リンク' }),
			HTMLFieldSetElement,
		);
		expect(fieldset.disabled).toBe(false);
		expect(screen.getByText('content').tagName).toBe('P');
	});
});
