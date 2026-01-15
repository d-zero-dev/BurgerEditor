/**
 * Image Modal Configuration
 */
export interface ImageModalConfig {
	/**
	 * CSS selector for target containers
	 * @default '[data-bge]'
	 */
	selector?: string;

	/**
	 * Close button label
	 * @default '閉じる'
	 */
	closeButtonLabel?: string;

	/**
	 * Dialog closedby attribute value
	 * Controls how the dialog can be closed
	 * - "any": ESC key or backdrop click (default)
	 * - "closerequest": ESC key only
	 * - "none": Programmatically only
	 * @default 'any'
	 */
	closedby?: 'any' | 'closerequest' | 'none';
}

/**
 * Initialize image modal functionality using Invoker Commands API
 *
 * This function creates dialog elements for each image with show-modal command
 * and associates them with buttons using commandfor attribute.
 * @param config - Configuration options
 * @example
 * ```typescript
 * import { initImageModal } from '@burger-editor/runtime';
 *
 * // Basic usage
 * initImageModal();
 *
 * // With custom configuration
 * initImageModal({
 *   closeButtonLabel: '閉じる',
 *   closedby: 'closerequest' // ESC key only
 * });
 * ```
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API
 */
export function initImageModal(config: ImageModalConfig = {}): void {
	const {
		selector = '[data-bge]',
		closeButtonLabel = '閉じる',
		closedby = 'any',
	} = config;

	// Find all buttons with command="show-modal"
	const buttons = document.querySelectorAll<HTMLButtonElement>('[command="show-modal"]');

	for (const button of buttons) {
		// Find associated container (search from parent to avoid button itself)
		const container = button.parentElement?.closest(selector);
		if (!container) {
			// eslint-disable-next-line no-console
			console.warn('[Image Modal] Container not found for button:', button);
			continue;
		}

		// Find picture element in container
		const picture = container.querySelector('picture');
		if (!picture) {
			// eslint-disable-next-line no-console
			console.warn('[Image Modal] Picture element not found in container:', container);
			continue;
		}

		// Generate unique dialog ID
		const dialogId = `bge-modal-${Math.random().toString(36).slice(2, 11)}`;

		// Create and configure dialog
		const dialog = createDialog(picture, {
			dialogId,
			closeButtonLabel,
			closedby,
		});

		// Add dialog to container (item)
		container.append(dialog);

		// Associate button with dialog using commandfor
		button.setAttribute('commandfor', dialogId);
	}
}

/**
 * Create dialog element with image
 * @param picture - Picture element to display in modal
 * @param options - Dialog configuration options
 * @param options.dialogId
 * @param options.closeButtonLabel
 * @param options.closedby
 * @returns Created dialog element
 */
function createDialog(
	picture: HTMLPictureElement,
	options: {
		dialogId: string;
		closeButtonLabel: string;
		closedby: 'any' | 'closerequest' | 'none';
	},
): HTMLDialogElement {
	const { dialogId, closeButtonLabel, closedby } = options;

	// Create dialog element
	const dialog = document.createElement('dialog');
	dialog.id = dialogId;
	dialog.setAttribute('closedby', closedby);

	// Clone picture element
	const pictureClone = picture.cloneNode(true) as HTMLPictureElement;

	// Create close button with Invoker Commands API
	const closeButton = document.createElement('button');
	closeButton.setAttribute('command', 'close');
	closeButton.setAttribute('commandfor', dialogId);
	closeButton.type = 'button';

	// Create span for button label
	const span = document.createElement('span');
	span.textContent = closeButtonLabel;
	closeButton.append(span);

	// Assemble dialog
	dialog.append(closeButton, pictureClone);

	return dialog;
}
