import type { BurgerEditorEngine } from './engine/engine.js';

import { BurgerBlock } from './block/block.js';
import { getCSSPropertyAsNumber } from './dom-helpers/get-css-property-as-number.js';
import { EditorUI } from './editor-ui.js';

export class BlockMenu extends EditorUI {
	#engine: BurgerEditorEngine;
	#mouseX = 0;
	#mouseY = 0;
	#raf = 0;

	constructor(
		engine: BurgerEditorEngine,
		el: HTMLElement,
		create: (el: HTMLElement) => void,
	) {
		super('block-menu', el, {
			stylesheet: `
				[data-bge-component='block-menu'] {
					position: absolute;
					z-index: 2147483647;
					pointer-events: none;

					> * {
						pointer-events: auto;
					}
				}
			`,
		});
		create(this.el);
		this.#engine = engine;

		const update = () => {
			cancelAnimationFrame(this.#raf);

			if (engine.isProcessed) {
				this.hide();
				return;
			}

			this.#raf = requestAnimationFrame(() => {
				this.#updatePosition();
			});
		};

		this.el.ownerDocument.body.addEventListener('mousemove', (e) => {
			this.#mouseX = e.pageX;
			this.#mouseY = e.pageY;
			update();
		});

		globalThis.addEventListener('resize', this.hide.bind(this));
		this.el.ownerDocument.body.addEventListener('mouseleave', this.hide.bind(this));
		this.el.ownerDocument.addEventListener('mouseleave', this.hide.bind(this));
		this.el.ownerDocument.defaultView?.addEventListener(
			'mouseleave',
			this.hide.bind(this),
		);

		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const node of mutation.addedNodes) {
					if (!(node instanceof HTMLElement)) {
						continue;
					}
					const images = node.querySelectorAll('img');
					for (const img of images) {
						img.addEventListener('load', update, { once: true });
						img.addEventListener('error', update, { once: true });
						img.addEventListener('abort', update, { once: true });
					}
				}
			}
		});
		observer.observe(this.el.ownerDocument, { childList: true, subtree: true });

		engine.el.addEventListener('bge:saved', update);
	}

	#getSelectedBlock() {
		const $blocks = [
			...this.el.ownerDocument.body.querySelectorAll<HTMLElement>('[data-bge-container]'),
		];

		for (const $block of $blocks) {
			const rect = $block.getBoundingClientRect();
			const marginBlockEnd = getCSSPropertyAsNumber($block, 'margin-block-end');

			const onMouse =
				rect.left <= this.#mouseX &&
				this.#mouseX <= rect.right &&
				rect.top <= this.#mouseY &&
				this.#mouseY <= rect.bottom + marginBlockEnd;
			if (onMouse) {
				const block = BurgerBlock.getBlock($block);
				return { block, rect, marginBlockEnd };
			}
		}

		return null;
	}

	#updatePosition() {
		const selected = this.#getSelectedBlock();

		if (!selected) {
			this.hide();
			return;
		}

		this.show();

		const { block, rect, marginBlockEnd } = selected;

		this.#engine.componentObserver.notify('select-block', {
			block,
			width: rect.width,
			height: rect.height,
			x: rect.left,
			y: rect.top,
			marginBlockEnd,
		});
	}

	override hide() {
		super.hide();
		this.#mouseX = 0;
		this.#mouseY = 0;
		this.#engine.clearCurrentBlock();
	}
}
