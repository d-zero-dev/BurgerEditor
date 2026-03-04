<script lang="ts">
	import type { BlockData, BurgerEditorEngine } from '@burger-editor/core';

	import IconClipboard from '@tabler/icons-svelte/icons/clipboard';

	const { engine }: { engine: BurgerEditorEngine } = $props();

	const hasCopiedBlock = $state(
		!!sessionStorage.getItem(engine.storageKey.blockClipboard),
	);

	/**
	 *
	 * @param blockData
	 */
	function addBlock(blockData: BlockData) {
		engine.blockCatalogDialog.close();
		engine.addBlock(blockData);
	}

	/**
	 * クリップボードからブロックをペースト
	 */
	async function pasteBlock() {
		// 1. sessionStorageから取得
		const jsonString = sessionStorage.getItem(engine.storageKey.blockClipboard);

		if (!jsonString) {
			alert('クリップボードにブロックデータがありません。');
			return;
		}

		// 2. JSONをBlockDataにパース
		let blockData: BlockData;
		try {
			blockData = JSON.parse(jsonString);
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error('Invalid JSON in clipboard:', error);
			alert(
				'ブロックの貼り付けに失敗しました。\n' +
					'クリップボードのデータが破損している可能性があります。\n' +
					'もう一度ブロックをコピーしてください。',
			);
			return;
		}

		// 3. ダイアログを閉じる
		engine.blockCatalogDialog.close();

		// 4. ブロックを追加（既存のaddBlock関数と同じ）
		await engine.addBlock(blockData);

		// 5. sessionStorageをクリア
		sessionStorage.removeItem(engine.storageKey.blockClipboard);
	}
</script>

<div class="block-catalog">
	{#if hasCopiedBlock}
		<div class="paste-section">
			<button type="button" class="paste-button" onclick={pasteBlock}>
				<IconClipboard />
				<span>クリップボードから貼り付け</span>
			</button>
		</div>
	{/if}

	<dl>
		{#each engine.blockCatalogDialog.catalog as [category, blocks] (category)}
			<dt>{category}</dt>
			<div>
				{#each blocks as blockInfo (category + blockInfo.label + blockInfo.definition.name)}
					<dd>
						<button type="button" onclick={() => addBlock(blockInfo.definition)}>
							{#if blockInfo.definition.img || blockInfo.definition.svg}
								<figure>
									<div class="img">
										{#if blockInfo.definition.img}
											<img src={blockInfo.definition.img} alt="" loading="lazy" />
										{:else if blockInfo.definition.svg}
											{@html blockInfo.definition.svg}
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
		padding: 0.5em;
		margin: 0;
		appearance: none;
	}

	figure {
		margin-block: 0;
		margin-inline: auto;
	}

	.img > * {
		display: block;
		inline-size: 71px;
		block-size: 56px;
		margin-block: 0;
		margin-inline: auto;
		background-repeat: no-repeat;
		border-radius: 10px;
	}

	figcaption {
		padding-block-start: 0.5em;
		font-size: 0.6em;
		font-weight: bold;
		text-align: center;
	}

	/* ペーストセクション */
	.paste-section {
		padding-block-end: 1em;
		margin-block-end: 1em;
		border-block-end: 2px solid var(--bge-ui-primary-color, #4a90e2);
	}

	.paste-button {
		display: flex;
		gap: 0.5em;
		align-items: center;
		justify-content: center;
		inline-size: 100%;
		padding-block: 0.8em;
		padding-inline: 1em;
		font-size: 1em;
		font-weight: bold;
		color: var(--bge-lightest-color, #fff);
		cursor: pointer;
		background-color: var(--bge-ui-primary-color, #4a90e2);
		border: none;
		border-radius: 4px;
		transition: background-color 0.2s ease;
	}

	.paste-button:hover {
		background-color: color-mix(
			in srgb,
			var(--bge-ui-primary-color, #4a90e2) 80%,
			var(--bge-darkest-color, #000) 20%
		);
	}

	.paste-button:active {
		translate: 0 1px;
	}

	.paste-button span {
		font-size: 0.95em;
	}
</style>
