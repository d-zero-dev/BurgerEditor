import type { SelectableValue } from '@burger-editor/core';

import { useId } from 'react';

/**
 * Controlled radio group following the editor form markup convention
 * (`div[role=radiogroup] > label > input + text`).
 * @param root0
 * @param root0.label
 * @param root0.value
 * @param root0.onChange
 * @param root0.options
 * @param root0.name
 * @param root0.disabled
 */
export function RadioGroup({
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
	const labelId = useId();
	return (
		<div role="radiogroup" aria-labelledby={labelId}>
			<div id={labelId}>{label}</div>
			{options.map((option) => (
				<label key={option.value}>
					<input
						type="radio"
						name={name}
						value={option.value}
						checked={value === option.value}
						disabled={disabled}
						onChange={(e) => {
							if (e.currentTarget.checked) {
								onChange(option.value);
							}
						}}
					/>
					{option.label}
				</label>
			))}
		</div>
	);
}
