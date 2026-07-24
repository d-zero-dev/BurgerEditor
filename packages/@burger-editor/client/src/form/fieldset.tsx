import type { ReactNode } from 'react';

/**
 * Grouping fieldset following the editor form markup convention
 * (`fieldset > legend`).
 *
 * The structure is a styling contract: `ui.css` draws the group border
 * and spacing on the `fieldset` element itself, so it must be preserved.
 * @param root0
 * @param root0.legend
 * @param root0.id
 * @param root0.disabled
 * @param root0.children
 * @example
 * ```tsx
 * <Fieldset legend="リンク設定" disabled={!state.useLink}>
 * 	<TextField
 * 		label="URL"
 * 		name="bge-href"
 * 		value={state.href ?? ''}
 * 		onChange={(href) => setState({ ...state, href })}
 * 	/>
 * </Fieldset>
 * ```
 */
export function Fieldset({
	legend,
	id,
	disabled,
	children,
}: {
	readonly legend: string;
	readonly id?: string;
	readonly disabled?: boolean;
	readonly children: ReactNode;
}) {
	return (
		<fieldset id={id} disabled={disabled}>
			<legend>{legend}</legend>
			{children}
		</fieldset>
	);
}
