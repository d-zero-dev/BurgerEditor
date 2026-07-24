import type { ReactNode } from 'react';

/**
 * Grouping fieldset following the editor form markup convention
 * (`fieldset > legend`).
 * @param root0
 * @param root0.legend
 * @param root0.id
 * @param root0.disabled
 * @param root0.children
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
