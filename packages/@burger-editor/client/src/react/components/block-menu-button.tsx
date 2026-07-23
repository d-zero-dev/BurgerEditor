import type { CSSProperties, ReactNode } from 'react';

import { useId } from 'react';

import styles from './block-menu-button.module.css';

/**
 * Icon button of the block menu with an anchored tooltip. The action is
 * declared with the Invoker Commands API instead of a click handler.
 * @param root0
 * @param root0.label
 * @param root0.command
 * @param root0.commandfor
 * @param root0.value
 * @param root0.children
 */
export function BlockMenuButton({
	label,
	command,
	commandfor,
	value,
	children,
}: {
	readonly label: string;
	readonly command: string;
	readonly commandfor: string;
	readonly value?: string;
	readonly children: ReactNode;
}) {
	const uid = useId();
	return (
		<div
			className={styles['wrapper']}
			style={{ '--name': `--anchor-${CSS.escape(uid)}` } as CSSProperties}>
			<button
				type="button"
				aria-labelledby={uid}
				command={command}
				commandfor={commandfor}
				value={value}>
				{children}
			</button>
			<span id={uid}>{label}</span>
		</div>
	);
}
