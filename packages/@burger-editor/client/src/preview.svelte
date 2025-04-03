<script lang="ts">
	import type { BurgerEditorEngine } from '@burger-editor/core';

	import { getExt } from './get-ext.js';
	export let engine: BurgerEditorEngine;

	let selectedPath = '';
	let width = Number.NaN;
	let height = Number.NaN;
	let file: ReturnType<typeof getExt> | null = null;

	let uploaded = 0;
	let total = 100;

	$: isUploadingMode = selectedPath.startsWith('blob:');

	engine.componentObserver.on('file-select', ({ path }) => {
		selectedPath = path;
		file = getExt(path);
	});

	engine.componentObserver.on('file-upload-progress', (progress) => {
		if (progress.blob === selectedPath) {
			uploaded = progress.uploaded;
			total = progress.total;
		}
	});

	$: {
		width = Number.NaN;
		height = Number.NaN;

		if (file?.isImage) {
			const image = new Image();
			image.src = selectedPath;
			image.addEventListener(
				'load',
				() => {
					width = image.naturalWidth;
					height = image.naturalHeight;
				},
				{ once: true },
			);
		} else if (file?.isVideo) {
			const video = document.createElement('video');
			video.src = selectedPath;
			video.addEventListener(
				'loadedmetadata',
				() => {
					width = video.videoWidth;
					height = video.videoHeight;
				},
				{ once: true },
			);
		}
	}
</script>

<div>
	<div class="img" class:uploading={isUploadingMode}>
		{#if file?.isImage}
			<img src={selectedPath} alt="画像プレビュー" />
		{:else if file?.isVideo}
			<video controls playsinline>
				<source src={selectedPath} type={`video/${file.ext}`} />
				<track kind="captions" src="" />
			</video>
		{:else if file?.isAudio}
			<audio controls>
				<source src={selectedPath} type={`audio/${file.ext}`} />
				<track kind="metadata" src="" />
			</audio>
		{:else if file?.isDoc || file?.isPpt || file?.isXls || file?.isPdf}
			<object
				data={selectedPath}
				type={`application/${file.ext}`}
				title={`${file.ext}ファイルのプレビュー`}>
				<p>プレビューできません</p>
			</object>
		{:else}
			<p>プレビューできません</p>
		{/if}
		{#if isUploadingMode}
			<div class="progress" style:translate={`${(uploaded / total) * 100}%`}></div>
		{/if}
	</div>
	<ul>
		{#if isUploadingMode}
			<li class="upload">
				<span>アップロード...</span>
				<span class="progress"
					>{Math.round((uploaded / total) * 100)}% ({uploaded}/{total})</span>
			</li>
		{:else}
			<li class="path"><a href={selectedPath} target="_blank">{selectedPath}</a></li>
		{/if}
		{#if !Number.isNaN(width) && !Number.isNaN(height)}
			<li class="dimension">{width}x{height}</li>
		{/if}
	</ul>
</div>

<style>
	.img {
		position: relative;
		overflow: hidden;

		img,
		video,
		audio,
		object,
		p {
			position: relative;
			z-index: 0;
			display: block;
			inline-size: 100%;
			aspect-ratio: 16 / 9;
			margin: 0;
			object-fit: contain;
		}

		p {
			display: flex;
			align-items: center;
			justify-content: center;
			background: rgb(0 0 0 / 10%);
		}

		&.uploading img {
			object-fit: cover;
		}

		.progress {
			position: absolute;
			inset-block-start: 0;
			z-index: 10;
			inline-size: 100%;
			block-size: 100%;
			background: rgb(0 0 0 / 50%);
		}
	}

	ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3em;
		justify-content: center;
		padding: 0;
		padding-block-end: 1em;
		margin: 0;
		margin-block-start: 0.5em;
		font-family: monospace;
		font-size: calc(12 / 16 * 1em);
		opacity: 0.7;
	}

	li {
		display: block;
		padding: 0;
		margin: 0;
		list-style: none;
	}

	.path {
		word-break: break-all;

		a {
			color: inherit;
		}
	}

	.upload .progress {
		font-style: italic;
	}

	.dimension {
		&::before {
			content: '(';
		}

		&::after {
			content: ')';
		}
	}
</style>
