<script lang="ts">
	import type { BurgerBlock, BurgerEditorEngine } from '@burger-editor/core';

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
	export let engine: BurgerEditorEngine;

	let currentBlock: BurgerBlock | null = null;

	$: isMutable = currentBlock?.isMutable();

	let _width = 0;
	let _height = 0;
	let _x = 0;
	let _y = 0;
	let _marginBlockEnd = 0;
	let marginBlockEndValue = '0px';

	engine.blockOptionsDialog.onChangeBlock((block) => {
		currentBlock = block;
	});

	engine.componentObserver.on(
		'select-block',
		({ block, width, height, x, y, marginBlockEnd }) => {
			currentBlock = block;
			_width = width;
			_height = height;
			_x = x;
			_y = y;
			_marginBlockEnd = marginBlockEnd;
			marginBlockEndValue = window
				.getComputedStyle(block.el)
				.getPropertyValue('--bge-block-margin');
		},
	);

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

		let $from: HTMLElement | null;
		let $to: HTMLElement | null;
		if (toTop) {
			$from = currentBlock.el.previousElementSibling as HTMLElement;
			$to = currentBlock.el;
		} else {
			$from = currentBlock.el;
			$to = currentBlock.el.nextElementSibling as HTMLElement;
		}

		if (!$from || !$to) {
			return;
		}

		engine.isProcessed = true;

		await replaceElement($from, $to);

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

		currentBlock.updateGridItems(addOrRemove);

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

		const html = currentBlock.getHTMLStringify();

		sessionStorage.setItem(engine.storageKey.blockClipboard, html);

		alert(
			'ブロックをコピーしました。\nブロックの追加ボタンからペースト（貼り付け）することができます。',
		);
	}
</script>

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
		container: margin-view / size;
		position: absolute;
		inset-block-end: 0;
		inset-inline-start: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		inline-size: 100%;
		block-size: var(--margin-block-end);
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
				padding: 0.2em 0.4em;
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
