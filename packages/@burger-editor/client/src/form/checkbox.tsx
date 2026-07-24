import type { ReactNode } from 'react';

/**
 * Controlled checkbox following the editor form markup convention
 * (`label > input + text`).
 *
 * The structure is a styling contract: `ui.css` turns
 * `label:not([for]):has(input[type='checkbox'])` into a flex row, so it
 * must be preserved.
 * @param root0
 * @param root0.label
 * @param root0.checked
 * @param root0.onChange
 * @param root0.name
 * @param root0.disabled
 * @param root0.describedBy
 * @example
 * ```tsx
 * <Checkbox
 * 	label={<span>横スクロール可能</span>}
 * 	name="bge-scrollable"
 * 	checked={state.scrollable ?? false}
 * 	onChange={(scrollable) => setState({ ...state, scrollable })}
 * />
 * ```
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
