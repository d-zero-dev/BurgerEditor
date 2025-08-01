<script lang="ts">
	import type { BurgerEditorEngine } from '@burger-editor/core';

	import { onMount } from 'svelte';

	export let engine: BurgerEditorEngine;
	export let contentId: string;

	const refs: HTMLButtonElement[] = [];
	let tabPanel: HTMLElement | null = null;

	const length = 2;
	let currentIndex = 0;

	engine.componentObserver.on('select-tab-in-item-editor', ({ index }) => {
		currentIndex = index;
		refs[currentIndex]?.focus();
	});

	const onKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'ArrowLeft') {
			update(Math.max(0, currentIndex - 1));
		} else if (event.key === 'ArrowRight') {
			update(Math.min(length - 1, currentIndex + 1));
		} else {
			return;
		}
	};

	const onClick = (index: number) => {
		update(index);
	};

	/**
	 *
	 * @param index
	 */
	function createLabel(index: number) {
		return `画像${index + 1}`;
	}

	/**
	 *
	 * @param index
	 */
	function update(index: number) {
		currentIndex = index;

		refs[currentIndex]?.focus();

		engine.componentObserver.notify('select-tab-in-item-editor', {
			index: currentIndex,
		});

		tabPanel?.setAttribute('aria-label', createLabel(currentIndex));
	}

	onMount(() => {
		tabPanel = document.getElementById(contentId);
		if (!tabPanel) {
			throw new Error('Tab panel not found');
		}
	});
</script>

<div role="tablist">
	{#each Array.from({ length }, (_, index) => index) as index (index)}
		<button
			type="button"
			role="tab"
			aria-controls={contentId}
			aria-selected={currentIndex === index}
			tabindex={currentIndex === index ? 0 : -1}
			onclick={() => onClick(index)}
			onkeydown={onKeyDown}
			bind:this={refs[index]}>
			{createLabel(index)}
		</button>
	{/each}
</div>

<style>
	:root {
		--border-radius: 0.5em;
	}

	[role='tablist'] {
		display: flex;
		gap: 0.5em;
		align-items: center;
		padding-inline: var(--border-radius);
	}

	[role='tab'] {
		position: relative;
		border: 1px solid var(--bge-border-color);
		border-end-start-radius: 0;
		border-end-end-radius: 0;

		&[aria-selected='true'] {
			border-block-end: none;

			&::after {
				position: absolute;
				inset-block-start: 100%;
				inset-inline-start: 50%;
				display: block;
				inline-size: 1em;
				block-size: 0.5em;
				content: '';
				background-color: var(--bge-ui-primary-color);
				clip-path: polygon(0 0, 50% 100%, 100% 0);
				translate: -50% 0;
			}
		}
	}
</style>
