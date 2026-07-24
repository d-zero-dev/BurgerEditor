/**
 * Controlled multi-line text input following the editor form markup
 * convention.
 *
 * The `label > span + textarea` structure is a styling contract: `ui.css`
 * lays out fields with structural selectors
 * (`label:not([for]) > span:has(+ textarea)`), so it must be preserved.
 * @param root0
 * @param root0.label
 * @param root0.value
 * @param root0.onChange
 * @param root0.name
 * @param root0.rows
 * @param root0.disabled
 * @example
 * ```tsx
 * <TextArea
 * 	label="説明文"
 * 	name="bge-text"
 * 	value={state.text ?? ''}
 * 	onChange={(text) => setState({ ...state, text })}
 * />
 * ```
 */
export function TextArea({
	label,
	value,
	onChange,
	name,
	rows,
	disabled,
}: {
	readonly label: string;
	readonly value: string;
	readonly onChange: (value: string) => void;
	readonly name?: string;
	readonly rows?: number;
	readonly disabled?: boolean;
}) {
	return (
		<label>
			<span>{label}</span>
			<textarea
				name={name}
				value={value}
				rows={rows}
				disabled={disabled}
				onChange={(e) => onChange(e.currentTarget.value)}
			/>
		</label>
	);
}
