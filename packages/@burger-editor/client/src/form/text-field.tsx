/**
 * Controlled single-line text input following the editor form markup
 * convention (`label > span + input`).
 *
 * The structure is a styling contract: `ui.css` lays out fields with
 * structural selectors (`label:not([for]) > span:has(+ input)`) instead
 * of `for`/`id` wiring, so it must be preserved.
 * @param root0
 * @param root0.label
 * @param root0.value
 * @param root0.onChange
 * @param root0.type
 * @param root0.name
 * @param root0.disabled
 * @param root0.placeholder
 * @example
 * ```tsx
 * <TextField
 * 	label="URL"
 * 	name="bge-link"
 * 	value={state.href ?? ''}
 * 	onChange={(href) => setState({ ...state, href })}
 * />
 * ```
 */
export function TextField({
	label,
	value,
	onChange,
	type = 'text',
	name,
	disabled,
	placeholder,
}: {
	readonly label: string;
	readonly value: string;
	readonly onChange: (value: string) => void;
	readonly type?: 'text' | 'url' | 'email';
	readonly name?: string;
	readonly disabled?: boolean;
	readonly placeholder?: string;
}) {
	return (
		<label>
			<span>{label}</span>
			<input
				type={type}
				name={name}
				value={value}
				disabled={disabled}
				placeholder={placeholder}
				onChange={(e) => onChange(e.currentTarget.value)}
			/>
		</label>
	);
}
