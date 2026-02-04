import type { BlockData } from '@burger-editor/core';

import { items } from '@burger-editor/blocks';
import { render } from '@burger-editor/core';

import { initBurgerEditorRuntime } from '../src/index.js';
import '@burger-editor/css';

/**
 * Sample image URL
 */
const SAMPLE_IMAGE_URL =
	'https://placehold.co/800x600/e2e8f0/334155?text=Click+to+open+modal';

/**
 * Create test blocks with image items
 */
async function createTestBlocks() {
	const app = document.getElementById('app');

	if (!app) {
		throw new Error('App container not found');
	}

	// Test 1: Image with show-modal
	const imageSection = document.createElement('div');
	imageSection.className = 'test-section';
	imageSection.innerHTML =
		'<h2>Test 1: Image Modal (click to open)</h2><p>Click the image to open a modal dialog. Close with button, backdrop click, or ESC key.</p>';

	const imageBlockData: BlockData = {
		name: 'image-modal-test',
		containerProps: {
			type: 'grid',
		},
		items: [
			[
				{
					name: 'image',
					data: {
						path: [SAMPLE_IMAGE_URL],
						alt: ['Test Image - Click to open modal'],
						width: [800],
						height: [600],
						loading: ['lazy'],
						media: [''],
						style: '--css-width: 100cqi; --object-fit: cover; --aspect-ratio: revert',
						cssWidth: '100cqi',
						scaleType: 'container',
						scale: 100,
						aspectRatio: 'revert',
						caption: 'Sample image with modal functionality',
						node: 'button',
						command: 'show-modal',
						href: '',
						target: null,
					},
				},
			],
		],
	};

	const imageBlock = await render(imageBlockData, { items });
	imageSection.append(imageBlock);
	app.append(imageSection);
}

/**
 * Initialize the test page
 */
async function main() {
	try {
		// Create test blocks
		await createTestBlocks();

		// Initialize BurgerEditor runtime
		initBurgerEditorRuntime({
			imageModal: {
				closeButtonLabel: 'テストモーダルを閉じる',
			},
		});

		// eslint-disable-next-line no-console
		console.log('✅ BurgerEditor Runtime initialized successfully');
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('❌ Failed to initialize:', error);
	}
}

// Run when DOM is ready
void main();
