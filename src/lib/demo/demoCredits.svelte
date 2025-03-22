<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { isGameMenu } from '$lib/stores/mapStore';
	import { onMount, createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();
	let creditsReady = false;

	onMount(() => {
		// Small delay to trigger animations
		setTimeout(() => {
			creditsReady = true;
		}, 100);
	});

	function backToMenu() {
		$isGameMenu = true;
		dispatch('close');
	}
</script>

<div class="credits-container">
	<div class="credits-background"></div>
	
	<div class="center-frame">
		<!-- Corner markers -->
		<div class="corner top-left"></div>
		<div class="corner top-right"></div>
		<div class="corner bottom-left"></div>
		<div class="corner bottom-right"></div>
		
		{#if creditsReady}
			<div class="terminal-panel credits-panel" in:fly={{ y: -20, duration: 800, delay: 200, easing: cubicOut }}>
				<div class="panel-title">JP-8 KEROSENE - CREDITS</div>
				
				<div class="credits-section">
					<div class="section-title">DEVELOPMENT</div>
					<div class="section-content">Developed by TEAM-JOINT<br>Military-grade hobby game studio</div>
				</div>
				
				<div class="credits-section">
					<div class="section-title">TECHNOLOGY</div>
					<div class="section-content">Built with SvelteKit + Threlte<br>MIL-DTL-83133 compliant</div>
				</div>
				
				<div class="credits-section">
					<div class="section-title">ASSETS</div>
					<div class="section-content">3D models sourced from Sketchfab<br>All attributions provided in model folder</div>
				</div>
				
				<div class="credits-section">
					<div class="section-title">AUDIO</div>
					<div class="section-content">Original music composed by TEAM-JOINT<br>100.4°F (38°C) frequency tuned</div>
				</div>
				
				<div class="credits-section">
					<div class="section-title">SPECIAL NOTES</div>
					<div class="section-content">0.775 – 0.840 kg/L<br>6.47-7.01 lb/U.S. gallon<br>CI/LI FSII SDA<br>GNU AGPLv3</div>
				</div>
				
				<button class="back-button" on:click={backToMenu}>
					<span class="button-bg"></span>
					<span class="button-text">RETURN TO MENU</span>
				</button>
			</div>
		{/if}
	</div>

	<div class="footer" in:fade={{ duration: 1000, delay: 1200 }}>
		MIL-DTL-83133 | DEVELOPED BY TEAM-JOINT
	</div>
</div>

<style>
	.credits-container {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: rgba(92, 255, 141, 0.8);
		font-family: 'Consolas', 'Courier New', monospace;
		text-shadow: 0 0 3px rgba(92, 255, 142, 0.3);
		overflow: hidden;
	}
	
	.credits-background {
		position: absolute;
		inset: 0;
		backdrop-filter: blur(10px);
		z-index: -2;
	}
	
	.center-frame {
		position: relative;
		width: 500px;
		height: 500px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	
	.corner {
		position: absolute;
		width: 15px;
		height: 15px;
		border-color: rgba(92, 255, 142, 0.4);
	}
	
	.top-left {
		top: 0;
		left: 0;
		border-top: 1px solid;
		border-left: 1px solid;
	}
	
	.top-right {
		top: 0;
		right: 0;
		border-top: 1px solid;
		border-right: 1px solid;
	}
	
	.bottom-left {
		bottom: 0;
		left: 0;
		border-bottom: 1px solid;
		border-left: 1px solid;
	}
	
	.bottom-right {
		bottom: 0;
		right: 0;
		border-bottom: 1px solid;
		border-right: 1px solid;
	}
	
	.terminal-panel {
		position: relative;
		background: rgba(0, 20, 25, 0.2);
		border: 1px solid rgba(92, 255, 142, 0.2);
		padding: 20px;
		width: 400px;
	}
	
	.credits-panel {
		display: flex;
		flex-direction: column;
		gap: 15px;
	}
	
	.panel-title {
		font-size: 1.2rem;
		letter-spacing: 2px;
		text-align: center;
		margin-bottom: 15px;
		position: relative;
	}
	
	.panel-title:after {
		content: '';
		position: absolute;
		bottom: -8px;
		left: 0;
		right: 0;
		height: 1px;
		background: rgba(92, 255, 142, 0.3);
	}
	
	.credits-section {
		margin-bottom: 10px;
	}
	
	.section-title {
		font-size: 0.8rem;
		opacity: 0.9;
		letter-spacing: 1px;
		margin-bottom: 5px;
		color: rgba(92, 255, 142, 1);
	}
	
	.section-content {
		font-size: 0.75rem;
		opacity: 0.7;
		line-height: 1.4;
		padding-left: 10px;
	}
	
	.back-button {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		padding: 8px 10px;
		margin-top: 10px;
		border: 1px solid rgba(92, 255, 142, 0.3);
		background: transparent;
		color: rgba(92, 255, 142, 0.7);
		font-family: 'Consolas', 'Courier New', monospace;
		font-size: 0.9rem;
		letter-spacing: 1px;
		cursor: pointer;
		transition: all 0.2s;
	}
	
	.back-button:hover {
		border-color: rgba(92, 255, 142, 0.8);
		color: rgba(92, 255, 142, 1);
	}

	.button-bg {
		position: absolute;
		inset: 0;
		background: rgba(92, 255, 142, 0);
		transition: background 0.2s;
	}

	.back-button:hover .button-bg {
		background: rgba(92, 255, 142, 0.1);
	}
	
	.button-text {
		position: relative;
		z-index: 1;
	}

	.footer {
		position: absolute;
		bottom: 1.5rem;
		text-align: center;
		font-size: 0.7rem;
		letter-spacing: 1px;
		color: rgba(92, 255, 142, 0.5);
	}
</style>
