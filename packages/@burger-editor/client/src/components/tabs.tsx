import { useEffect, useId, useRef } from 'react';

import { useCommand } from '../use-command.js';

import styles from './tabs.module.css';

/**
 * Controlled tab list. Selection is lifted to the parent via
 * `current`/`onChange`; tab buttons declare a local command instead of a
 * click handler. Arrow keys move the selection.
 * @param root0
 * @param root0.current
 * @param root0.onChange
 * @param root0.contentId
 * @param root0.length
 * @param root0.createLabel
 * @example
 * ```tsx
 * <Tabs current={currentIndex} onChange={setCurrentIndex} contentId="tab-content" />
 * <div id="tab-content" role="tabpanel">
 * 	{currentIndex === 0 ? <PcForm /> : <SpForm />}
 * </div>
 * ```
 */
export function Tabs({
	current,
	onChange,
	contentId,
	length = 2,
	createLabel = (index) => `画像${index + 1}`,
}: {
	readonly current: number;
	readonly onChange: (index: number) => void;
	readonly contentId: string;
	readonly length?: number;
	readonly createLabel?: (index: number) => string;
}) {
	const listId = useId();
	const refs = useRef<(HTMLButtonElement | null)[]>([]);

	const update = (index: number) => {
		refs.current[index]?.focus();
		onChange(index);
	};

	const rootRef = useCommand<HTMLDivElement>({
		'--select-tab': (e) => {
			const value = (e.source as HTMLButtonElement | null)?.value;
			update(Number(value));
		},
	});

	useEffect(() => {
		const tabPanel = document.getElementById(contentId);
		if (!tabPanel) {
			throw new Error('Tab panel not found');
		}
		tabPanel.setAttribute('aria-label', createLabel(current));
	}, [contentId, current, createLabel]);

	const onKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === 'ArrowLeft') {
			update(Math.max(0, current - 1));
		} else if (event.key === 'ArrowRight') {
			update(Math.min(length - 1, current + 1));
		}
	};

	return (
		<div role="tablist" ref={rootRef} id={listId} className={styles['tablist']}>
			{Array.from({ length }, (_, index) => (
				<button
					key={index}
					ref={(el) => {
						refs.current[index] = el;
					}}
					type="button"
					role="tab"
					aria-controls={contentId}
					aria-selected={current === index}
					tabIndex={current === index ? 0 : -1}
					command="--select-tab"
					commandfor={listId}
					value={index}
					onKeyDown={onKeyDown}>
					{createLabel(index)}
				</button>
			))}
		</div>
	);
}
