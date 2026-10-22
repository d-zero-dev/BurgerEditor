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
 * @param root0.describedBy
 * @param root0.required - Marks the field as required for assistive
 * technology via `aria-required`. The native `required` attribute is not
 * used: `type` is dynamic here, so markup linting cannot tell it is valid.
 * The dialog form is `noValidate`, so the browser never blocks submission;
 * the item's `toItemData` is what rejects an empty value.
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
	describedBy,
	required,
}: {
	readonly label: string;
	readonly value: string;
	readonly onChange: (value: string) => void;
	readonly type?: 'text' | 'url' | 'email';
	readonly name?: string;
	readonly disabled?: boolean;
	readonly placeholder?: string;
	readonly describedBy?: string;
	readonly required?: boolean;
}) {
	return (
		<label>
			<span>{label}</span>
			<input
				type={type}
				name={name}
				value={value}
				disabled={disabled}
				aria-required={required || undefined}
				placeholder={placeholder}
				aria-describedby={describedBy}
				onChange={(e) => onChange(e.currentTarget.value)}
			/>
		</label>
	);
}
