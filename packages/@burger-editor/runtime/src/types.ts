import type { CarouselConfig } from './carousel/index.js';
import type { ImageModalConfig } from './image-modal/index.js';

/**
 * BurgerEditor Runtime Configuration
 */
export interface BurgerEditorRuntimeConfig {
	/**
	 * Enable image modal functionality
	 * @default true
	 */
	imageModal?: boolean | ImageModalConfig;

	/**
	 * Enable carousel functionality
	 * @default true
	 */
	carousel?: boolean | CarouselConfig;
}
