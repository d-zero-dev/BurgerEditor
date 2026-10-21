import { IconPhoto } from '@tabler/icons-react';

import styles from './thumbnail-button.module.css';
import { Thumbnail } from './thumbnail.js';

/**
 * Thumbnail that is itself a button. Pressing it invokes `command` on the
 * `commandfor` target (like every other button in the editor UI, no click
 * handler). The `label` is hidden until the pointer hovers it or it gets
 * keyboard focus, so the thumbnail stays uncluttered but the action is
 * discoverable.
 *
 * An empty `src` renders a placeholder of the same size, so a row of
 * thumbnails keeps its layout while some of them have no file yet.
 *
 * `aria-label` is the accessible name. It must contain `label` and say what
 * the button acts on, since several of these buttons sit side by side.
 * @param root0
 * @param root0.src - File URL to preview; empty for "no file yet"
 * @param root0.label - Text shown on hover / focus (e.g. `編集`)
 * @param root0.command - Command name invoked on the `commandfor` target (a custom `--`-prefixed command or a built-in one)
 * @param root0.commandfor - The id of the element that receives the command; it must be in the same document as the button
 * @param root0.value - Passed to the command handler as `source.value`
 * @example
 * ```tsx
 * <ThumbnailButton
 * 	src={slide.path}
 * 	label="編集"
 * 	aria-label={`スライド${index + 1}を編集`}
 * 	command="--edit-slide"
 * 	commandfor={rootId}
 * 	value={String(index)}
 * />
 * ```
 */
export function ThumbnailButton({
	src,
	label,
	'aria-label': ariaLabel,
	command,
	commandfor,
	value,
}: {
	readonly src: string;
	readonly label: string;
	readonly 'aria-label': string;
	readonly command: string;
	readonly commandfor: string;
	readonly value?: string;
}) {
	return (
		<button
			type="button"
			className={styles['button']}
			aria-label={ariaLabel}
			command={command}
			commandfor={commandfor}
			value={value}>
			<span className={styles['image']}>
				{src ? (
					<Thumbnail src={src} />
				) : (
					<span className={styles['placeholder']} data-bge-thumbnail-placeholder="">
						<IconPhoto aria-hidden="true" />
						<span>画像未選択</span>
					</span>
				)}
			</span>
			<span className={styles['label']} aria-hidden="true">
				{label}
			</span>
		</button>
	);
}
