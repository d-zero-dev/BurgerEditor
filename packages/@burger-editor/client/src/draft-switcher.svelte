<script lang="ts">
	import type { BurgerEditorEngine } from '@burger-editor/core';

	import { onMount } from 'svelte';
	export let engine: BurgerEditorEngine;

	let isMain: boolean;
	let isVisualMode: boolean;

	onMount(update);

	/**
	 *
	 */
	function update() {
		isMain = engine.content.type === 'main';
		isVisualMode = engine.content.isVisualMode;
	}

	/**
	 *
	 */
	function onClickMain() {
		engine.showMain();
		update();
	}

	/**
	 *
	 */
	function onClickDraft() {
		engine.showDraft();
		update();
	}

	/**
	 *
	 */
	async function onClickDraftToMain() {
		if (
			await engine.draftToMain(() =>
				confirm('下書き内容を本稿へ上書きしてもよろしいですか？'),
			)
		) {
			onClickMain();
		}
	}

	/**
	 *
	 */
	async function onClickMainToDraft() {
		if (
			await engine.mainToDraft(() =>
				confirm('本稿内容を下書きへ上書きしてもよろしいですか？'),
			)
		) {
			onClickDraft();
		}
	}

	/**
	 *
	 */
	function toggleDisplayMode() {
		engine.content.toggleDisplayMode();
		update();
	}

	/**
	 *
	 * @param e
	 */
	function onDblClickMain(e: MouseEvent) {
		if (!e.altKey || !isMain) {
			return;
		}
		engine.showMain();
		toggleDisplayMode();
	}

	/**
	 *
	 * @param e
	 */
	function onDblClickDraft(e: MouseEvent) {
		if (!e.altKey || isMain) {
			return;
		}
		engine.showDraft();
		toggleDisplayMode();
	}
</script>

<div class="draft-btn">
	<div class="draft-tab-btn">
		<button
			type="button"
			aria-pressed={isMain}
			on:click={onClickMain}
			on:dblclick={onDblClickMain}
			>本稿モード
			{#if isMain && !isVisualMode}
				<span>ソース表示</span>
			{/if}
		</button>
		<button
			type="button"
			aria-pressed={!isMain}
			on:click={onClickDraft}
			on:dblclick={onDblClickDraft}
			>下書きモード
			{#if !isMain && !isVisualMode}
				<span>ソース表示</span>
			{/if}</button>
	</div>
	<div class="draft-copy-btn">
		{#if isMain}
			<button type="button" on:click={onClickMainToDraft}>本稿を下書きにコピー</button>
		{:else}
			<button type="button" on:click={onClickDraftToMain}>下書きを本稿にコピー</button>
		{/if}
	</div>
</div>

<style>
	.draft-btn {
		display: flex;
		justify-content: space-between;
	}

	button {
		display: block;
		padding: 3px 5px;
		color: #333;
		text-decoration: none;
		background-color: var(--bge-background-color01);
		border: var(--bge-border-primary-color) solid 1px;
	}

	.draft-tab-btn {
		display: flex;
	}

	/* stylelint-disable declaration-no-important */
	.draft-tab-btn button[aria-pressed='true'] {
		color: var(--bge-lightest-color) !important;
		background-color: var(--bge-background-color02) !important;
		border-color: var(--bge-background-color02) !important;
	}
	/* stylelint-enable declaration-no-important */

	.draft-tab-btn button:hover {
		cursor: pointer;
		background-color: var(--bge-border-primary-color);
	}

	.draft-tab-btn button span {
		margin-inline-start: 0.5em;
		font-size: 0.8em;
	}

	.draft-tab-btn button span::before {
		content: '(';
	}

	.draft-tab-btn button span::after {
		content: ')';
	}

	.draft-copy-btn {
		display: flex;
	}

	.draft-copy-btn button:hover {
		cursor: pointer;
		background-color: var(--bge-border-primary-color);
	}
</style>
