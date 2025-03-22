<script lang="ts">
	import { onMount } from 'svelte';
	import { dev } from '$app/environment';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';

	onMount(() => {
		injectAnalytics({ mode: dev ? 'development' : 'production' });
		const disableContextMenu = (event: { preventDefault: () => any }) => event.preventDefault();
		window.addEventListener('contextmenu', disableContextMenu);

		return () => {
			window.removeEventListener('contextmenu', disableContextMenu);
		};
	});
</script>
<svelte:head>
	<title>JP-8 Kerosene</title>
</svelte:head>
<slot />
