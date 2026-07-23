import type { SelectableValue } from '@burger-editor/core';

/**
 * Controlled select following the editor form markup convention
 * (`label > span + select`).
 * @param root0
 * @param root0.label
 * @param root0.value
 * @param root0.onChange
 * @param root0.options
 * @param root0.name
 * @param root0.disabled
 */
export function SelectField({
	label,
	value,
	onChange,
	options,
	name,
	disabled,
}: {
	readonly label: string;
	readonly value: string;
	readonly onChange: (value: string) => void;
	readonly options: readonly SelectableValue[];
	readonly name?: string;
	readonly disabled?: boolean;
}) {
	return (
		<label>
			<span>{label}</span>
			<select
				name={name}
				value={value}
				disabled={disabled}
				onChange={(e) => onChange(e.currentTarget.value)}>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</label>
	);
}
