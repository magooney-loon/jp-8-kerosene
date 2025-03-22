<script lang="ts">
	import { Canvas } from '@threlte/core';
	import { Studio } from '@threlte/studio';
	import { fade, scale, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { writable } from 'svelte/store';

	import { isGameMenu } from '$lib/stores/mapStore';
	import GameMenu from '$lib/components/GameMenu.svelte';
	import Renderer from '$lib/components/Renderer.svelte';
	import Loading from '$lib/components/Loading.svelte';
	import SkyBox from '$lib/components/SkyBox.svelte';
	import StatsExtension from '$lib/extensions/StatsExtension.svelte';
	import RendererExtension from '$lib/extensions/RendererExtension.svelte';
	import SkyBoxExtension from '$lib/extensions/SkyBoxExtension.svelte';
	import DemoScene from '$lib/demo/demoScene.svelte';

	import FighterHUD from '$lib/demo/FighterHUD.svelte';
	import { hudState } from '$lib/demo/hudStore';

	// Get values from the store
	$: speed = $hudState.speed;
	$: afterburnerEffect = $hudState.afterburnerEffect;
	$: altitude = $hudState.altitude;
	$: heading = $hudState.heading;
	$: roll = $hudState.roll;
	$: pitch = $hudState.pitch;
	$: gForce = $hudState.gForce;
	$: fuelPercent = $hudState.fuelPercent;
	$: mach = $hudState.mach;
	$: aoa = $hudState.aoa;
	$: isReverse = $hudState.isReverse;
	$: isFiring = $hudState.isFiring;
	$: ammoCount = $hudState.ammoCount;
	$: currentAmmo = $hudState.currentAmmo;
	$: isAutoStabilizing = $hudState.isAutoStabilizing;
	$: autoStabilizationProgress = $hudState.autoStabilizationProgress;
	$: recoveryThrustActive = $hudState.recoveryThrustActive;
</script>

<div class="app-wrapper">
	<!-- Canvas and game world (lowest layer) -->
	<Canvas>
		<!-- <Studio extensions={[StatsExtension, RendererExtension, SkyBoxExtension]}> -->
		<SkyBox />
		<Renderer />
		<DemoScene />
		<!-- </Studio> -->
	</Canvas>

	<!-- Game menu (middle layer) -->
	{#if $isGameMenu}
		<div
			in:fly={{ y: -20, duration: 800, easing: cubicOut }}
			out:scale={{ start: 1, opacity: 0, duration: 800, easing: cubicOut }}
			class="menu-wrapper"
		>
			<GameMenu />
		</div>
	{:else}
		<FighterHUD
			{speed}
			{afterburnerEffect}
			{altitude}
			{heading}
			{roll}
			{pitch}
			{gForce}
			{fuelPercent}
			{mach}
			{aoa}
			{isReverse}
			{isFiring}
			{ammoCount}
			{currentAmmo}
			{isAutoStabilizing}
			{autoStabilizationProgress}
			{recoveryThrustActive}
		/>
	{/if}

	<!-- Loading overlay (top layer, highest z-index) -->
	<div class="loading-wrapper">
		<Loading />
	</div>
</div>

<style>
	.app-wrapper {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	.menu-wrapper {
		position: absolute;
		width: 100%;
		height: 100%;
		z-index: 60;
		pointer-events: auto;
	}

	.loading-wrapper {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 100; /* Highest z-index to be above everything */
		pointer-events: none; /* Allow clicks to pass through when loading is invisible */
	}

	.loading-wrapper :global(.loading-container) {
		pointer-events: auto; /* Re-enable pointer events when loading is visible */
	}

	:global(.threlte-container) {
		width: 100% !important;
		height: 100% !important;
	}

	/* Make sure HUD is visible with high z-index */
	:global(.threlte-html) {
		z-index: 80 !important;
	}

	:global(.threlte-studio-toolbar) {
		z-index: 90;
	}

	:global(.threlte-studio-panel) {
		z-index: 89;
	}
</style>
