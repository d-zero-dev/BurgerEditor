<script lang="ts">
	import type { BurgerBlock, BurgerEditorEngine } from '@burger-editor/core';

	import { getBlockAtPosition } from '@burger-editor/core';
	import IconArrowBigDownLine from '@tabler/icons-svelte/icons/arrow-big-down-line';
	import IconArrowBigUpLine from '@tabler/icons-svelte/icons/arrow-big-up-line';
	import IconClipboardPlus from '@tabler/icons-svelte/icons/clipboard-plus';
	import IconLayoutGridAdd from '@tabler/icons-svelte/icons/layout-grid-add';
	import IconLayoutGridRemove from '@tabler/icons-svelte/icons/layout-grid-remove';
	import IconRowInsertBottom from '@tabler/icons-svelte/icons/row-insert-bottom';
	import IconRowInsertTop from '@tabler/icons-svelte/icons/row-insert-top';
	import IconSettings from '@tabler/icons-svelte/icons/settings';
	import IconTrash from '@tabler/icons-svelte/icons/trash';

	import BlockMenuButton from './block-menu-button.svelte';
	import { replaceElement } from './replace-element.js';

	const {
		engine,
		container,
		onHide,
	}: { engine: BurgerEditorEngine; container: HTMLElement; onHide: () => void } =
		$props();

	let currentBlock = $state<BurgerBlock | null>(null);
	let visible = $state(false);

	const isMutable = $derived(currentBlock?.isMutable());

	let _width = $state(0);
	let _height = $state(0);
	let _x = $state(0);
	let _y = $state(0);
	let _marginBlockEnd = $state(0);
	let marginBlockEndValue = $state('0px');

	engine.blockOptionsDialog.onChangeBlock((block) => {
		currentBlock = block;
	});

	/**
	 *
	 */
	function hide() {
		visible = false;
		currentBlock = null;
		onHide();
	}

	let mouseX = 0;
	let mouseY = 0;
	let raf = 0;

	/**
	 *
	 */
	function updatePosition() {
		const doc = container.ownerDocument;
		const selected = getBlockAtPosition(doc, mouseX, mouseY);

		if (!selected) {
			hide();
			return;
		}

		visible = true;

		const { block, rect, marginBlockEnd } = selected;
		currentBlock = block;
		_width = rect.width;
		_height = rect.height;
		_x = rect.left;
		_y = rect.top;
		_marginBlockEnd = marginBlockEnd;
		marginBlockEndValue = window
			.getComputedStyle(block.el)
			.getPropertyValue('--bge-block-margin');

		engine.componentObserver.notify('select-block', {
			block,
			width: rect.width,
			height: rect.height,
			x: rect.left,
			y: rect.top,
			marginBlockEnd,
		});
	}

	/**
	 *
	 */
	function scheduleUpdate() {
		cancelAnimationFrame(raf);

		if (engine.isProcessed) {
			hide();
			return;
		}

		raf = requestAnimationFrame(() => {
			updatePosition();
		});
	}

	$effect(() => {
		const doc = container.ownerDocument;
		const body = doc.body;
		const win = doc.defaultView;

		const onMouseMove = (e: MouseEvent) => {
			mouseX = e.pageX;
			mouseY = e.pageY;
			scheduleUpdate();
		};

		const onHideEvent = () => hide();

		body.addEventListener('mousemove', onMouseMove);
		body.addEventListener('mouseleave', onHideEvent);
		doc.addEventListener('mouseleave', onHideEvent);
		win?.addEventListener('mouseleave', onHideEvent);
		globalThis.addEventListener('resize', onHideEvent);
		engine.el.addEventListener('bge:saved', scheduleUpdate);

		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const node of mutation.addedNodes) {
					if (!(node instanceof HTMLElement)) {
						continue;
					}
					const images = node.querySelectorAll('img');
					for (const img of images) {
						img.addEventListener('load', scheduleUpdate, { once: true });
						img.addEventListener('error', scheduleUpdate, { once: true });
						img.addEventListener('abort', scheduleUpdate, { once: true });
					}
				}
			}
		});
		observer.observe(doc, { childList: true, subtree: true });

		return () => {
			body.removeEventListener('mousemove', onMouseMove);
			body.removeEventListener('mouseleave', onHideEvent);
			doc.removeEventListener('mouseleave', onHideEvent);
			win?.removeEventListener('mouseleave', onHideEvent);
			globalThis.removeEventListener('resize', onHideEvent);
			engine.el.removeEventListener('bge:saved', scheduleUpdate);
			observer.disconnect();
			cancelAnimationFrame(raf);
		};
	});

	/**
	 *
	 * @param toTop
	 */
	function insert(toTop: boolean) {
		if (!currentBlock) {
			return;
		}
		engine.content.insertionPoint.set(currentBlock, toTop);
		engine.blockCatalogDialog.open();
	}

	/**
	 *
	 */
	function openConfig() {
		engine.blockOptionsDialog.open();
	}

	/**
	 *
	 * @param toTop
	 */
	async function move(toTop: boolean) {
		if (engine.isProcessed || !currentBlock) {
			return;
		}

		let fromEl: HTMLElement | null;
		let toEl: HTMLElement | null;
		if (toTop) {
			fromEl = currentBlock.el.previousElementSibling as HTMLElement;
			toEl = currentBlock.el;
		} else {
			fromEl = currentBlock.el;
			toEl = currentBlock.el.nextElementSibling as HTMLElement;
		}

		if (!fromEl || !toEl) {
			return;
		}

		engine.isProcessed = true;

		await replaceElement(fromEl, toEl);

		engine.isProcessed = false;
		engine.save();
	}

	/**
	 *
	 */
	async function remove() {
		if (engine.isProcessed || !currentBlock) {
			return;
		}

		if (
			!confirm(
				'ブロックを削除します。\n削除したブロックはもとに戻すことはできません。\n削除してもよろしいですか？',
			)
		) {
			return;
		}

		engine.isProcessed = true;

		await Promise.resolve();

		currentBlock.remove();
		currentBlock = null;

		engine.isProcessed = false;
		engine.save();
	}

	/**
	 *
	 * @param addOrRemove
	 */
	function updateGridItems(addOrRemove: 1 | -1) {
		if (engine.isProcessed || !currentBlock) {
			return;
		}

		if (
			addOrRemove === -1 &&
			!confirm(
				'ブロック内の最後の要素を削除します。\n削除した要素はもとに戻すことはできません。\n削除してもよろしいですか？',
			)
		) {
			return;
		}

		currentBlock.updateGridItems(addOrRemove, engine);

		engine.save();
	}

	/**
	 *
	 */
	function copy() {
		if (engine.isProcessed || !currentBlock) {
			return;
		}

		// if (currentBlock.name === 'unknown') {
		// 	alert(
		// 		'このブロックをコピーするには、ブロックのアップデートが必要です。\nブロックをアップロードしてください。',
		// 	);
		// 	return;
		// }

		const json = currentBlock.toJSONStringify();

		sessionStorage.setItem(engine.storageKey.blockClipboard, json);

		alert(
			'ブロックをコピーしました。\nブロックの追加ボタンからペースト（貼り付け）することができます。',
		);
	}
</script>

{#if visible}
	<div
		class="bge-menu-base"
		style={`
	--width:${_width}px;
	--height:${_height}px;
	--x:${_x}px;
	--y:${_y}px;
	--margin-block-end:${_marginBlockEnd ?? '0'}px`}>
		<div class="bge-menu">
			<div class="bge-move-group">
				<BlockMenuButton label="ひとつ上へ移動" action={() => move(true)}>
					<IconArrowBigUpLine />
				</BlockMenuButton>
				<BlockMenuButton label="ひとつ下へ移動" action={() => move(false)}>
					<IconArrowBigDownLine />
				</BlockMenuButton>
			</div>
			<div class="bge-standard-group">
				<BlockMenuButton label="上にブロックを追加" action={() => insert(true)}>
					<IconRowInsertTop />
				</BlockMenuButton>
				<BlockMenuButton label="下にブロックを追加" action={() => insert(false)}>
					<IconRowInsertBottom />
				</BlockMenuButton>
				{#if isMutable}
					<BlockMenuButton
						label="ブロック内に要素を追加"
						action={() => updateGridItems(+1)}>
						<IconLayoutGridAdd />
					</BlockMenuButton>
					<BlockMenuButton
						label="ブロック内の要素を削除"
						action={() => updateGridItems(-1)}>
						<IconLayoutGridRemove />
					</BlockMenuButton>
				{/if}
				<BlockMenuButton label="オプション設定" action={() => openConfig()}>
					<IconSettings />
				</BlockMenuButton>
				<BlockMenuButton label="ブロックをコピー" action={() => copy()}>
					<IconClipboardPlus />
				</BlockMenuButton>
				<BlockMenuButton label="ブロックを削除" action={() => remove()}>
					<IconTrash />
				</BlockMenuButton>
			</div>
		</div>
		<div class="bge-menu-margin">
			<span>余白: {marginBlockEndValue} ({_marginBlockEnd}px)</span>
		</div>
	</div>
{/if}

<style>
	.bge-menu-base {
		position: absolute;
		inset-block-start: var(--y);
		inset-inline-start: var(--x);
		inline-size: var(--width);
		block-size: calc(var(--height) + var(--margin-block-end));
		pointer-events: none;
	}

	.bge-menu-margin {
		--_line-color: rgb(from var(--bge-ui-primary-color) r g b / 10%);
		position: absolute;
		inset-block-end: 0;
		inset-inline-start: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		inline-size: 100%;
		block-size: var(--margin-block-end);
		container: margin-view / size;
		font-size: 0.8em;
		font-weight: bold;
		color: var(--bge-ui-primary-color);
		pointer-events: none;
		background: repeating-linear-gradient(
			45deg,
			transparent,
			transparent 4px,
			var(--_line-color) 4px,
			var(--_line-color) 8px
		);
	}

	@container margin-view (height < 1em) {
		.bge-menu-margin {
			span {
				padding-block: 0.2em;
				padding-inline: 0.4em;
				color: var(--bge-lightest-color);
				background: var(--bge-ui-primary-color);
				border-radius: 0.2em;
			}
		}
	}

	.bge-menu {
		--gap: 0.2em;
		display: flex;
		align-items: start;
		justify-content: space-between;
		inline-size: 100%;
		block-size: 100%;
		min-block-size: max-content;
		pointer-events: none;
		outline: 4px solid var(--bge-ui-primary-color);
	}

	.bge-move-group,
	.bge-standard-group {
		inset-block-start: 0;
		display: flex;
		gap: var(--gap);
		justify-content: center;
		padding: var(--gap);
	}
</style>
