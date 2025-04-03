<script lang="ts">
	const { label, action, children } = $props();
	const uid = $props.id();
</script>

<div style:--name={`--anchor-${uid}`}>
	<button type="button" aria-labelledby={uid} onclick={action}>
		{@render children()}
	</button>
	<span id={uid}>{label}</span>
</div>

<style>
	button {
		anchor-name: var(--name);
		display: block;
		padding: 0.2em 0.5em;
		font-size: 1.5em;
		color: var(--bge-lightest-color);
		pointer-events: all;
		background: var(--bge-ui-primary-color);
		border: none;
	}

	div:is(:hover, :focus-within) button {
		background-color: color-mix(
			in srgb,
			var(--bge-ui-primary-color) 70%,
			var(--bge-darkest-color) 30%
		);
	}

	span {
		position: absolute;
		z-index: 1000;
		display: none;
		position-anchor: var(--name);
		inline-size: calc(anchor-size(inline-size) * 2);
		padding-block: 0.2em;
		padding-inline: 0.6em;
		margin: 0.2em;
		position-area: block-end;
		font-size: 0.8em;
		color: var(--bge-lightest-color);
		background: var(--bge-tooltip-background-color);
		border-radius: 0.6em;
	}

	div:is(:hover, :focus-within) span {
		display: block;
	}
</style>
