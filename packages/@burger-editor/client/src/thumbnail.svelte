<script lang="ts">
	import IconFile from '@tabler/icons-svelte/icons/file';
	import IconFileTypeDoc from '@tabler/icons-svelte/icons/file-type-doc';
	import IconFileTypePdf from '@tabler/icons-svelte/icons/file-type-pdf';
	import IconFileTypePpt from '@tabler/icons-svelte/icons/file-type-ppt';
	import IconFileTypeXls from '@tabler/icons-svelte/icons/file-type-xls';
	import IconHandphones from '@tabler/icons-svelte/icons/headphones';
	import IconVideo from '@tabler/icons-svelte/icons/video';

	import { getExt } from './get-ext.js';

	export let src: string;
	let isLoaded = false;

	const file = getExt(src);
</script>

<span data-bge-editor-ui-component="thumbnail" data-loaded={isLoaded}>
	{#if file.isImage}
		<img {src} alt="画像のプレビュー" loading="lazy" onload={() => (isLoaded = true)} />
	{:else if file.isVideo}
		<video controls={false} playsinline>
			<source {src} type={`video/${file.ext}`} />
			<track kind="captions" src="" />
			<IconVideo />
		</video>
	{:else if file.isAudio}
		<IconHandphones />
	{:else if file.isDoc}
		<IconFileTypeDoc />
	{:else if file.isPpt}
		<IconFileTypePpt />
	{:else if file.isXls}
		<IconFileTypeXls />
	{:else if file.isPdf}
		<IconFileTypePdf />
	{:else}
		<IconFile />
	{/if}
</span>

<style>
	span {
		display: block;
		inline-size: 100%;
		block-size: 100%;
	}

	img,
	video {
		display: block;
		inline-size: 100%;
		block-size: 100%;
		object-fit: cover;
		transition: opacity 300ms linear;
	}

	[data-loaded='false'] img {
		opacity: 0;
	}

	[data-loaded='true'] img {
		opacity: 1;
	}
</style>
