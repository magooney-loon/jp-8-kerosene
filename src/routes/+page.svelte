<script lang="ts">
	import App from '$lib/components/App.svelte';
</script>

<div class="app-container">
	<App />
</div>

<style>
	:global(html, body) {
		margin: 0;
		padding: 0;
		width: 100%;
		height: 100%;
		overflow: hidden;
		/* cursor: url('/cursor.svg'), auto; */
	}

	:global(body) {
		background-color: #000;
	}

	.app-container {
		width: 100%;
		height: 100vh;
		user-select: none;
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
	}
</style>


  