<script lang="ts">
	const { onInsert }: { onInsert: () => void } = $props();
</script>

<button class="insert_after" type="button" onclick={onInsert}>下に要素を追加</button>
