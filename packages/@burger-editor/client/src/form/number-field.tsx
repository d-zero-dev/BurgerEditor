/**
 * Controlled numeric input following the editor form markup convention.
 *
 * The `label > span + input` structure is a styling contract: `ui.css`
 * lays out fields with structural selectors
 * (`label:not([for]) > span:has(+ input)`), so it must be preserved.
 * @param root0
 * @param root0.label
 * @param root0.value
 * @param root0.onChange
 * @param root0.name
 * @param root0.min
 * @param root0.max
 * @param root0.step
 * @param root0.disabled
 * @example
 * ```tsx
 * <NumberField
 * 	label="表示件数"
 * 	name="bge-count"
 * 	value={state.count ?? 1}
 * 	min={1}
 * 	onChange={(count) => setState({ ...state, count })}
 * />
 * ```
 */
export function NumberField({
	label,
	value,
	onChange,
	name,
	min,
	max,
	step,
	disabled,
}: {
	readonly label: string;
	readonly value: number;
	readonly onChange: (value: number) => void;
	readonly name?: string;
	readonly min?: number;
	readonly max?: number;
	readonly step?: number;
	readonly disabled?: boolean;
}) {
	return (
		<label>
			<span>{label}</span>
			<input
				type="number"
				name={name}
				value={Number.isFinite(value) ? value : ''}
				min={min}
				max={max}
				step={step}
				disabled={disabled}
				onChange={(e) => onChange(e.currentTarget.valueAsNumber)}
			/>
		</label>
	);
}
