<script lang="ts">
	import type { BurgerEditorEngine } from '@burger-editor/core';
	export let engine: BurgerEditorEngine;

	/**
	 *
	 * @param blockName
	 */
	function addBlock(blockName: string) {
		engine.blockCatalogDialog.close();
		engine.addBlock(blockName);
	}
</script>

<div class="block-catalog">
	<dl>
		{#each engine.blockCatalogDialog.catalog as [category, blocks] (category)}
			<dt>{category}</dt>
			<div>
				{#each blocks as [blockName, blockInfo] (blockName)}
					<dd>
						<button type="button" on:click={() => addBlock(blockName)}>
							{#if blockInfo.img || blockInfo.svg}
								<figure>
									<div class="img">
										{#if blockInfo.img}
											<img src={blockInfo.img} alt="" loading="lazy" />
										{:else if blockInfo.svg}
											{@html blockInfo.svg}
										{/if}
									</div>
									<figcaption>{blockInfo.label}</figcaption>
								</figure>
							{:else}
								{blockInfo.label}
							{/if}
						</button>
					</dd>
				{/each}
			</div>
		{/each}
	</dl>
</div>

<style>
	dl {
		padding: 0;
		margin: 0;
	}

	dt {
		margin-block-end: 10px;
		font-size: 1.1em;
		font-weight: bold;
		color: #333;
		border-block-end: 1px #565a49 dotted;
	}

	dl > div {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(6em, 1fr));
		gap: 0.5em;
	}

	dd {
		padding: 0;
		margin: 0;
	}

	button {
		display: flex;
		align-items: start;
		inline-size: 100%;
		block-size: 100%;
		padding: 0.5em 0.5em;
		margin: 0;
		appearance: none;
	}

	figure {
		margin: 0 auto;
	}

	.img > * {
		display: block;
		inline-size: 71px;
		block-size: 56px;
		margin: 0 auto;
		background-repeat: no-repeat;
		border-radius: 10px;
	}

	figcaption {
		padding-block-start: 0.5em;
		font-size: 0.6em;
		font-weight: bold;
		text-align: center;
	}
</style>
