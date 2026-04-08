/**
 * Runtime library for BurgerEditor generated content in the browser.
 * This package provides client-side functionality for interactive features
 * like image modals.
 */

// Export individual features
export { initImageModal } from './image-modal/index.js';
export type { ImageModalConfig } from './image-modal/index.js';

// Export initialization functions
export { autoInit, initBurgerEditorRuntime } from './init.js';

// Export types
export type { BurgerEditorRuntimeConfig } from './types.js';
