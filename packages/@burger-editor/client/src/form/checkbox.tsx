import type { ReactNode } from 'react';

/**
 * Controlled checkbox following the editor form markup convention
 * (`label > input + text`).
 * @param root0
 * @param root0.label
 * @param root0.checked
 * @param root0.onChange
 * @param root0.name
 * @param root0.disabled
 * @param root0.describedBy
 */
export function Checkbox({
	label,
	checked,
	onChange,
	name,
	disabled,
	describedBy,
}: {
	readonly label: ReactNode;
	readonly checked: boolean;
	readonly onChange: (checked: boolean) => void;
	readonly name?: string;
	readonly disabled?: boolean;
	readonly describedBy?: string;
}) {
	return (
		<label>
			<input
				type="checkbox"
				name={name}
				checked={checked}
				disabled={disabled}
				aria-describedby={describedBy}
				onChange={(e) => onChange(e.currentTarget.checked)}
			/>
			{label}
		</label>
	);
}
