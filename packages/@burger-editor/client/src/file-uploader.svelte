<script lang="ts">
	import type { BurgerEditorEngine, FileType } from '@burger-editor/core';
	export let engine: BurgerEditorEngine;
	export let fileType: FileType;

	const accept = fileType === 'image' ? 'image/*' : '*';

	let inputFile: HTMLInputElement;

	/**
	 *
	 */
	function openFile() {
		inputFile.click();
	}

	/**
	 *
	 */
	async function stageFile() {
		const file = inputFile.files?.[0];
		if (!file) {
			return;
		}

		const path = URL.createObjectURL(file);

		engine.componentObserver.notify('file-select', {
			path,
			fileSize: file.size,
			isEmpty: false,
		});

		const res = await engine.serverAPI.postFile?.(fileType, file, (uploaded, total) => {
			engine.componentObserver.notify('file-upload-progress', {
				blob: path,
				uploaded,
				total,
			});
		});

		if (!res) {
			throw new Error(`Failed to upload file: ${file.name}`);
		}

		engine.componentObserver.notify('file-listup', {
			fileType: fileType,
			data: [res.uploaded],
		});

		engine.componentObserver.notify('file-select', {
			path: res.uploaded.url,
			fileSize: res.uploaded.size,
			isEmpty: false,
		});
	}
</script>

<div>
	<input type="file" bind:this={inputFile} on:change={stageFile} {accept} />
	<button type="button" on:click={openFile}>ファイルを追加アップロードする</button>
</div>

<style>
	input[type='file'] {
		display: none;
	}
</style>
