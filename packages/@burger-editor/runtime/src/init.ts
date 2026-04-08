import type { BurgerEditorRuntimeConfig } from './types.js';

import { initImageModal } from './image-modal/index.js';

/**
 * Initialize BurgerEditor runtime with all features
 *
 * This is a convenience function that initializes all runtime features
 * with a single call. You can also import and initialize features individually.
 * @param config - Configuration options for runtime features
 * @example
 * ```typescript
 * import { initBurgerEditorRuntime } from '@burger-editor/runtime';
 *
 * // Initialize all features with defaults
 * initBurgerEditorRuntime();
 *
 * // Initialize with custom configuration
 * initBurgerEditorRuntime({
 *   imageModal: {
 *     closeButtonLabel: '閉じる',
 *   }
 * });
 *
 * // Disable a feature
 * initBurgerEditorRuntime({
 *   imageModal: false,
 * });
 * ```
 */
export function initBurgerEditorRuntime(config: BurgerEditorRuntimeConfig = {}): void {
	const { imageModal = true } = config;

	// Initialize image modal
	if (imageModal !== false) {
		const imageModalConfig = typeof imageModal === 'object' ? imageModal : undefined;
		initImageModal(imageModalConfig);
	}
}

/**
 * Initialize runtime on DOMContentLoaded
 *
 * This is a convenience function that automatically initializes the runtime
 * when the DOM is ready. Use this for simple setups.
 * @param config - Configuration options for runtime features
 * @example
 * ```typescript
 * import { autoInit } from '@burger-editor/runtime';
 *
 * // Auto-initialize with defaults
 * autoInit();
 *
 * // Auto-initialize with custom configuration
 * autoInit({
 *   imageModal: {
 *     closeButtonLabel: '閉じる',
 *   }
 * });
 * ```
 */
export function autoInit(config: BurgerEditorRuntimeConfig = {}): void {
	if (document.readyState === 'loading') {
		// eslint-disable-next-line no-restricted-syntax
		document.addEventListener('DOMContentLoaded', () => {
			initBurgerEditorRuntime(config);
		});
	} else {
		initBurgerEditorRuntime(config);
	}
}
