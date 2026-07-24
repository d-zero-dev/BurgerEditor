/**
 * Controlled single-line text input following the editor form markup
 * convention (`label > span + input`).
 * @param root0
 * @param root0.label
 * @param root0.value
 * @param root0.onChange
 * @param root0.type
 * @param root0.name
 * @param root0.disabled
 * @param root0.placeholder
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
