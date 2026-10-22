import type { BurgerEditorRuntimeConfig } from './types.js';

import { initCarousel } from './carousel/index.js';
import { initImageModal } from './image-modal/index.js';

/**
 * Initialize BurgerEditor runtime with all features
 *
 * This is a convenience function that initializes all runtime features
 * with a single call. You can also import and initialize features individually.
 * It does not return a way to undo the carousel; call `initCarousel()` with
 * `carousel: false` here when you need its `destroy()` (e.g. for content that is
 * replaced on the client).
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
 *   },
 *   carousel: {
 *     interval: 8000,
 *   },
 * });
 *
 * // Disable a feature
 * initBurgerEditorRuntime({
 *   imageModal: false,
 *   carousel: false,
 * });
 * ```
 */
export function initBurgerEditorRuntime(config: BurgerEditorRuntimeConfig = {}): void {
	const { imageModal = true, carousel = true } = config;

	// Initialize image modal
	if (imageModal !== false) {
		const imageModalConfig = typeof imageModal === 'object' ? imageModal : undefined;
		initImageModal(imageModalConfig);
	}

	// Initialize carousel
	if (carousel !== false) {
		const carouselConfig = typeof carousel === 'object' ? carousel : undefined;
		initCarousel(carouselConfig);
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
 *   },
 *   carousel: {
 *     interval: 8000,
 *   },
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
