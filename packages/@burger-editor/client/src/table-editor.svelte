<script lang="ts">
	import type { BurgerEditorEngine } from '@burger-editor/core';

	import IconArrowsTransferDown from '@tabler/icons-svelte/icons/arrows-transfer-down';
	import IconRowInsertBottom from '@tabler/icons-svelte/icons/row-insert-bottom';
	import IconTrash from '@tabler/icons-svelte/icons/trash';

	export let engine: BurgerEditorEngine;

	type Data = {
		th: string[];
		td: string[];
	};
	type Table = [th: string, td: string][];

	let table: Table = [];

	engine.componentObserver.on('open-editor', ({ data }) => {
		const { th, td } = data as Data;
		table = th.map((th, i) => [th, td[i] ?? '']);
		updateDataEl();
	});

	/**
	 *
	 * @param index
	 */
	function add(index: number) {
		table = table.toSpliced(index + 1, 0, ['', '']);
		updateDataEl();
	}

	/**
	 *
	 * @param index
	 */
	function remove(index: number) {
		table = table.toSpliced(index, 1);
		updateDataEl();
	}

	/**
	 *
	 * @param from
	 * @param to
	 */
	function move(from: number, to: number) {
		const $from = table[from]!;
		const $to = table[to]!;
		table = table.toSpliced(from, 1, $to);
		table = table.toSpliced(to, 1, $from);
		updateDataEl();
	}

	/**
	 * Updates the data element with new values.
	 * This function is responsible for modifying the data element
	 * based on the provided logic or parameters.
	 */
	function updateDataEl() {
		const dataEl = engine.itemEditorDialog.find<HTMLInputElement>('[name=bge]');
		if (!dataEl) {
			throw new Error('dataEl not found');
		}
		const data: Data = {
			th: table.map(([th]) => th),
			td: table.map(([, td]) => td),
		};
		dataEl.value = JSON.stringify(data);
	}
</script>

<div class="table">
	{#each table as row, i (i)}
		<div class="row">
			<div class="th">
				<textarea
					aria-label={`${i}行目の見出しセル`}
					name={`bge-th-${i}`}
					bind:value={row[0]}
					oninput={updateDataEl}></textarea>
			</div>
			<div class="td">
				<textarea
					aria-label={`${i}行目の内容セル`}
					name={`bge-td-${i}`}
					bind:value={row[1]}
					oninput={updateDataEl}></textarea>
			</div>
			<div class="btn">
				<ul>
					<li>
						<button type="button" title="下に追加" onclick={() => add(i)}>
							<IconRowInsertBottom />
						</button>
					</li>
					<li>
						<button
							type="button"
							title="削除"
							disabled={table.length === 1}
							onclick={() => remove(i)}>
							<IconTrash />
						</button>
					</li>
					<li>
						<button
							type="button"
							title="下に移動"
							disabled={i === table.length - 1}
							onclick={() => move(i, i + 1)}>
							<IconArrowsTransferDown class="icon" />
						</button>
					</li>
				</ul>
			</div>
		</div>
	{/each}
</div>

<style>
	.table {
		display: grid;
		grid-template-columns: minmax(1em, 1fr) minmax(1em, 1fr) auto;
		gap: 0.5em 1em;
	}

	.row {
		display: grid;
		grid-template-columns: subgrid;
		grid-column: span 3;
		align-items: center;
	}

	textarea {
		inline-size: 100%;
		resize: vertical;
	}

	.btn ul {
		display: flex;
		gap: 0.3em;
		padding: 0;
		margin: 0;
	}

	.btn li {
		padding: 0;
		margin: 0;
		list-style: none;
	}
</style>
