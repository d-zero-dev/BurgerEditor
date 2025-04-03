<script lang="ts">
	import type { BurgerEditorEngine, FileListItem, FileType } from '@burger-editor/core';

	import { formatByteSize, formatDate } from '@burger-editor/utils';

	import Thumbnail from './thumbnail.svelte';
	export let engine: BurgerEditorEngine;
	export let fileType: FileType;

	const getFileList = engine.serverAPI.getFileList;
	const deleteFile = engine.serverAPI.deleteFile;

	let fileList: readonly FileListItem[] = [];
	let selectedPath = '';
	let searchWord = '';
	let currentPage = 0;
	let totalPage = 1;

	let uploaded = 0;
	let total = 100;

	let requestDebounce: number = -1;

	engine.componentObserver.on('file-select', async ({ path, isMounted }) => {
		selectedPath = path;

		if (
			!isMounted && // On initial mount
			getFileList
		) {
			const result = await getFileList(fileType, {
				filter: '',
				page: 0,
				selected: selectedPath,
			});
			fileList = result.data;
			currentPage = result.pagination.current;
			totalPage = result.pagination.total;
		}

		if (path.startsWith('blob:')) {
			fileList = [
				{
					fileId: '',
					name: '',
					size: 0,
					timestamp: Date.now(),
					url: path,
					sizes: {},
				},
				...fileList.filter((file) => !file.url.startsWith('blob:')),
			];
		}

		const selectedButton = await awaitUntilFound(() =>
			document.querySelector<HTMLButtonElement>(
				`button[aria-pressed="true"]:has(img[src="${path}"])`,
			),
		);
		if (selectedButton) {
			selectedButton.scrollIntoView({
				behavior: 'smooth',
				block: 'nearest',
			});
		}
	});

	engine.componentObserver.on('file-upload-progress', (progress) => {
		if (progress.blob === selectedPath) {
			uploaded = progress.uploaded;
			total = progress.total;
		}
	});

	engine.componentObserver.on('file-listup', ({ data }) => {
		fileList = data;
	});

	/**
	 *
	 * @param page
	 */
	async function paginate(page: number) {
		if (currentPage === page) {
			return;
		}
		currentPage = page;
		window.clearTimeout(requestDebounce);
		requestDebounce = window.setTimeout(async () => {
			const result = await getFileList?.(fileType, { page });
			if (result) {
				fileList = result.data;
				currentPage = result.pagination.current;
				totalPage = result.pagination.total;
			}
		}, 100);
	}

	/**
	 *
	 * @param value
	 */
	function search(value: string) {
		if (searchWord === value) {
			return;
		}
		searchWord = value;
		window.clearTimeout(requestDebounce);
		requestDebounce = window.setTimeout(async () => {
			const result = await getFileList?.(fileType, { filter: searchWord });
			if (result) {
				fileList = result.data;
				currentPage = result.pagination.current;
				totalPage = result.pagination.total;
			}
		}, 300);
	}

	/**
	 *
	 * @param path
	 * @param fileSize
	 */
	function selectFile(path: string, fileSize: number) {
		engine.componentObserver.notify('file-select', {
			path,
			fileSize,
			isEmpty: false,
			isMounted: true,
		});
	}

	/**
	 *
	 * @param callback
	 */
	async function awaitUntilFound<T>(callback: () => T): Promise<T> {
		const result = callback();
		if (result) {
			return result;
		}
		await new Promise((resolve) => {
			requestAnimationFrame(resolve);
		});
		return awaitUntilFound(callback);
	}
</script>

{#snippet marked(chars: string[])}
	{#each chars as char, i (char + i)}
		{#if i !== 0}<mark>{searchWord}</mark>{/if}{char}
	{/each}
{/snippet}

<div class="ctrl">
	<div class="pagination">
		<button
			type="button"
			disabled={currentPage === 0}
			on:click={() => paginate(currentPage - 1)}>
			前へ
		</button>
		<div class="page">
			<span
				><input
					type="number"
					value={currentPage + 1}
					min="1"
					max={totalPage}
					on:change={(e) => paginate(e.currentTarget.valueAsNumber - 1)}
					aria-label="ページ番号" /></span>
			<span>/</span>
			<span>{totalPage}</span>
		</div>
		<button
			type="button"
			disabled={currentPage === totalPage - 1}
			on:click={() => paginate(currentPage + 1)}>
			次へ
		</button>
	</div>
	<input
		type="search"
		placeholder="検索"
		value={searchWord}
		on:input={(e) => search(e.currentTarget.value)} />
</div>

<ul class="list">
	{#each fileList as file (file.url)}
		<li>
			<button
				class="file"
				type="button"
				aria-pressed={file.url === selectedPath}
				on:click={() => selectFile(file.url, file.size)}>
				<span class="thumbnail"><Thumbnail src={file.url} /></span>
				{#if file.url.startsWith('blob:')}
					<span
						>アップロード中... <span>{Math.floor((uploaded / total) * 100)}%</span></span>
				{:else}
					<span class="attr">
						<span>ID</span><span>{@render marked(file.fileId.split(searchWord))}</span>
						<span>名称</span><span>{@render marked(file.name.split(searchWord))}</span>
						<span>更新</span><span
							>{formatDate(file.timestamp / 1000, 'YYYY-MM-DD HH:mm')}</span>
						<span>サイズ</span><span>{formatByteSize(file.size)}</span>
					</span>
				{/if}
			</button>
			{#if !file.url.startsWith('blob:') && deleteFile}
				<button
					class="delete"
					type="button"
					on:click={() => deleteFile('image', file.url)}>削除</button>
			{/if}
		</li>
	{/each}
</ul>

<style>
	.ctrl {
		display: flex;
		gap: 2em;
		margin-block-end: 1em;
	}

	.pagination {
		display: flex;
		flex: 1 0 auto;
		gap: 1em;
		align-items: center;
		justify-content: center;

		button {
			user-select: none;
		}
	}

	.page {
		display: flex;
		gap: 0.5em;
		align-items: center;
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 0.5em;
		padding: 0;
		margin: 0;
	}

	.list li {
		position: relative;
		padding: 0;
		margin: 0;
		list-style: none;
	}

	.file {
		z-index: 0;
		display: flex;
		gap: 1em;
		align-items: center;
		inline-size: 100%;
		padding: 0.5em;
		text-align: start;
		border: none;
	}

	.file > span {
		display: block;
	}

	.file > span.thumbnail {
		display: block;
		flex: 0 0 7em;
		inline-size: 7em;
		block-size: 7em;
	}

	.file > span.attr {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: 0.2em 1em;
		align-items: baseline;
	}

	.file > span.attr > span:nth-child(odd)::after {
		content: ':';
	}

	.delete {
		position: absolute;
		inset-block-end: 0.7em;
		inset-inline-end: 0.7em;
		display: block;
		padding: 0.5em;
		font-size: 0.8em;
		text-align: center;
		opacity: 0;

		&:hover {
			--bge-border-color: var(--bge-ui-primary-color);
		}
	}

	.file[aria-pressed='true'] + .delete {
		--bge-outline-color: #fff;
		--bge-border-color: #fff;
		color: #fff;
		background-color: var(--bge-ui-primary-color);
	}

	li:is(:focus-within:has(:focus-visible), :hover) .delete {
		opacity: 1;
	}
</style>
