<script lang="ts">
	import { isGameMenu } from '$lib/stores/mapStore';
	import { soundEnabled, toggleSound } from '$lib/stores/audioStore';
	import { highQualityEnabled, toggleQuality } from '$lib/stores/qualityStore';
	import { onMount } from 'svelte';
	import { fade, scale, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import DemoCredits from '$lib/demo/demoCredits.svelte';
	import DemoHi from '$lib/demo/demoHi.svelte';

	// Game loading tips
	const tips = [
		"Press W to accelerate and S to brake/reverse",
		"Use A and D to roll the aircraft left and right",
		"Hold SHIFT for afterburner boost, but watch your fuel levels",
		"Press SPACEBAR to fire your minigun",
		"Banking left or right will cause your aircraft to turn",
		"Your aircraft will auto-stabilize when not actively rolling",
		"Watch your angle of attack (AOA) to avoid stalling",
		"The HUD displays your current speed, altitude, and heading",
		"G-forces increase during tight turns and maneuvers",
		"Afterburner has a cooldown period after use",
		"Recovery thrust activates automatically during auto-stabilization",
		"Mach numbers above 1.0 indicate supersonic flight",
		"Direct hits refil your fuel!",
		"Try to predict UFO evasive maneuvers!",
		"UFO has limited evasive power, keep pinning it down!",
		"UFO shield recharges over time if no connected hits!",
		"The UFO is a secret agent sent by the government to spy on you!",
	];
	
	let currentTip = 0;
	let showingTip = true;

	let showCredits = false;
	let showHighScores = false;

	let buttons = [
		{ id: 'play', label: 'PLAY NOW', action: () => ($isGameMenu = false) },
		{ id: 'sound', label: 'SOUND: OFF', action: () => toggleSoundSetting() },
		{ id: 'quality', label: 'QUALITY: HIGH', action: () => toggleQualitySetting() },
		{ id: 'highscores', label: 'HIGH SCORES', action: () => showHighScores = true },
		{ id: 'source', label: 'SOURCE CODE', action: () => window.open('https://github.com/magooney-loon', '_blank') },
		{ id: 'credits', label: 'CREDITS', action: () => showCredits = true }
		// Add more button configurations here as needed
	];

	let activeButton = -1;
	let menuContainer: HTMLElement;
	let menuReady = false;

	// Update the sound button label when sound state changes
	$: {
		const soundButton = buttons.find(b => b.id === 'sound');
		if (soundButton) {
			soundButton.label = $soundEnabled ? 'SOUND: ON' : 'SOUND: OFF';
		}
	}

	// Update the quality button label when quality state changes
	$: {
		const qualityButton = buttons.find(b => b.id === 'quality');
		if (qualityButton) {
			qualityButton.label = $highQualityEnabled ? 'QUALITY: HIGH' : 'PERFORMANCE MODE';
		}
	}

	// Function to toggle sound
	function toggleSoundSetting() {
		toggleSound();
	}

	// Function to toggle quality
	function toggleQualitySetting() {
		toggleQuality();
	}

	onMount(() => {
		// Optional background particles effect
		initParticles();
		
		// Small delay to trigger animations
		setTimeout(() => {
			menuReady = true;
		}, 100);
		
		// Rotate through tips
		const tipInterval = setInterval(() => {
			showingTip = false;
			setTimeout(() => {
				currentTip = (currentTip + 1) % tips.length;
				showingTip = true;
			}, 500);
		}, 4000);

		return () => {
			clearInterval(tipInterval);
		};
	});

	function handleHover(index: number) {
		activeButton = index;
	}
	
	function handleClick() {
		// Visual feedback could be added here if needed
	}
	
	function initParticles() {
		// This is a placeholder - you could add a particle library 
		// if you want actual particles
	}
</script>

<div class="menu-container" bind:this={menuContainer}>
	<div class="menu-background"></div>
	
	<div class="center-frame">
		<!-- Corner markers -->
		<div class="corner top-left"></div>
		<div class="corner top-right"></div>
		<div class="corner bottom-left"></div>
		<div class="corner bottom-right"></div>
		
		<div class="terminal-panel game-title-panel">
			<div class="game-title" in:fly={{ y: -20, duration: 800, delay: 200, easing: cubicOut }}>
				<span class="title-text">JP-8 KEROSENE</span>
			</div>
			
			<!-- A-10 Thunderbolt SVG Logo with Animations -->
			<div class="logo-container" in:scale={{ start: 0.8, duration: 800, delay: 400, easing: cubicOut }}>
				<svg 
					viewBox="0 0 240 120" 
					xmlns="http://www.w3.org/2000/svg" 
					class="a10-logo"
				>
					<!-- Radar Sweep Animation -->
					<g class="radar-sweep">
						<path d="M120,60 L120,10" stroke="rgba(92, 255, 142, 0.6)" stroke-width="1" />
						<circle cx="120" cy="60" r="5" fill="rgba(92, 255, 142, 0.3)" />
					</g>
					
					<!-- Targeting Reticle with Pulse -->
					<circle cx="120" cy="60" r="58" fill="none" stroke="rgba(92, 255, 142, 0.15)" stroke-width="1" class="pulse-slow" />
					<circle cx="120" cy="60" r="54" fill="none" stroke="rgba(92, 255, 142, 0.2)" stroke-width="0.5" />
					<circle cx="120" cy="60" r="40" fill="none" stroke="rgba(92, 255, 142, 0.2)" stroke-width="0.5" stroke-dasharray="2,4" class="rotate" />
					<circle cx="120" cy="60" r="20" fill="none" stroke="rgba(92, 255, 142, 0.3)" stroke-width="0.5" stroke-dasharray="1,2" class="rotate-reverse" />
					
					<!-- Dynamic Crosshairs -->
					<line x1="120" y1="20" x2="120" y2="40" stroke="rgba(92, 255, 142, 0.3)" stroke-width="1" class="crosshair" />
					<line x1="120" y1="80" x2="120" y2="100" stroke="rgba(92, 255, 142, 0.3)" stroke-width="1" class="crosshair" />
					<line x1="80" y1="60" x2="100" y2="60" stroke="rgba(92, 255, 142, 0.3)" stroke-width="1" class="crosshair" />
					<line x1="140" y1="60" x2="160" y2="60" stroke="rgba(92, 255, 142, 0.3)" stroke-width="1" class="crosshair" />
					
					<!-- Corner Brackets -->
					<path d="M50,30 L50,40 L60,40" fill="none" stroke="rgba(92, 255, 142, 0.4)" stroke-width="0.7" class="bracket" />
					<path d="M190,30 L190,40 L180,40" fill="none" stroke="rgba(92, 255, 142, 0.4)" stroke-width="0.7" class="bracket" />
					<path d="M50,90 L50,80 L60,80" fill="none" stroke="rgba(92, 255, 142, 0.4)" stroke-width="0.7" class="bracket" />
					<path d="M190,90 L190,80 L180,80" fill="none" stroke="rgba(92, 255, 142, 0.4)" stroke-width="0.7" class="bracket" />
					
					<!-- GAU-8/A Avenger Cannon Silhouette with Animation -->
					<g class="cannon active-element">
						<!-- Main Gun Body -->
						<rect x="85" y="55" width="70" height="10" rx="2" 
							fill="rgba(92, 255, 142, 0.3)" 
							stroke="rgba(92, 255, 142, 0.8)" 
							stroke-width="1" />
							
						<!-- Barrel Assembly -->
						<rect x="60" y="58" width="25" height="4" rx="1" 
							fill="rgba(92, 255, 142, 0.5)" 
							stroke="rgba(92, 255, 142, 0.9)" 
							stroke-width="1" />
							
						<!-- Individual Barrel Indicators -->
						<line x1="65" y1="58" x2="65" y2="62" stroke="rgba(92, 255, 142, 0.9)" stroke-width="0.5" class="barrel" />
						<line x1="70" y1="58" x2="70" y2="62" stroke="rgba(92, 255, 142, 0.9)" stroke-width="0.5" class="barrel" />
						<line x1="75" y1="58" x2="75" y2="62" stroke="rgba(92, 255, 142, 0.9)" stroke-width="0.5" class="barrel" />
						<line x1="80" y1="58" x2="80" y2="62" stroke="rgba(92, 255, 142, 0.9)" stroke-width="0.5" class="barrel" />
						
						<!-- Rotating Barrel Visualization -->
						<circle cx="150" cy="60" r="10" fill="none" stroke="rgba(92, 255, 142, 0.7)" stroke-width="0.5" />
						<circle cx="150" cy="60" r="7" fill="none" stroke="rgba(92, 255, 142, 0.8)" stroke-width="0.5" class="rotate" />
						<circle cx="150" cy="60" r="4" fill="none" stroke="rgba(92, 255, 142, 0.9)" stroke-width="0.5" class="rotate-reverse" />
						<circle cx="150" cy="60" r="2" fill="rgba(92, 255, 142, 0.9)" class="glow" />
						
						<!-- Ammo Feed -->
						<rect x="150" y="48" width="12" height="4" rx="1" 
							fill="rgba(92, 255, 142, 0.4)" 
							stroke="rgba(92, 255, 142, 0.7)" 
							stroke-width="0.5" class="ammo-pulse" />
						<rect x="150" y="68" width="12" height="4" rx="1" 
							fill="rgba(92, 255, 142, 0.4)" 
							stroke="rgba(92, 255, 142, 0.7)" 
							stroke-width="0.5" class="ammo-pulse delay" />
					</g>
					
					<!-- Tech Details with Scan Effect -->
					<text x="30" y="110" fill="rgba(92, 255, 142, 0.7)" font-family="monospace" font-size="6" class="tech-text">0.775 – 0.840 kg/L</text>
					<text x="160" y="110" fill="rgba(92, 255, 142, 0.7)" font-family="monospace" font-size="6" class="tech-text">6.47-7.01 lb/U.S. gallon</text>
					
					<!-- Terminal Effect Lines -->
					<line x1="10" y1="15" x2="230" y2="15" stroke="rgba(92, 255, 142, 0.2)" stroke-width="1" stroke-dasharray="1,3" class="scan-line" />
					<line x1="10" y1="105" x2="230" y2="105" stroke="rgba(92, 255, 142, 0.2)" stroke-width="1" stroke-dasharray="1,3" class="scan-line" />
					
					<!-- Targeting Data with Flicker Effect -->
					<text x="20" y="30" fill="rgba(92, 255, 142, 0.5)" font-family="monospace" font-size="7" class="target-data">100.4°F (38°C)</text>
					<text x="190" y="30" fill="rgba(92, 255, 142, 0.5)" font-family="monospace" font-size="7" class="target-data">CI/LI FSII SDA</text>
					
					<!-- Random Blips -->
					<circle cx="50" cy="40" r="1" fill="rgba(92, 255, 142, 0.9)" class="random-blip blip-1" />
					<circle cx="180" cy="30" r="1" fill="rgba(92, 255, 142, 0.9)" class="random-blip blip-2" />
					<circle cx="70" cy="85" r="1" fill="rgba(92, 255, 142, 0.9)" class="random-blip blip-3" />
					<circle cx="190" cy="75" r="1" fill="rgba(92, 255, 142, 0.9)" class="random-blip blip-4" />
				</svg>
				
				<!-- Additional Animated Overlay Elements -->
				<div class="scan-overlay"></div>
				<div class="grid-overlay"></div>
				<div class="noise-overlay"></div>
			</div>
		</div>
		
		<div class="terminal-panel menu-buttons" in:fly={{ y: 20, duration: 800, delay: 600, easing: cubicOut }}>
			<div class="panel-label">SYSTEM OPTIONS</div>
			{#each buttons as { id, label, action }, i}
				<button 
					on:click={() => { handleClick(); action(); }} 
					on:mouseenter={() => handleHover(i)}
					on:mouseleave={() => activeButton = -1}
					class="menu-button" 
					class:active={activeButton === i}
					class:sound-button={id === 'sound'}
					class:sound-on={id === 'sound' && $soundEnabled}
					class:quality-button={id === 'quality'}
					class:quality-high={id === 'quality' && $highQualityEnabled}
					style="animation-delay: {700 + (i * 150)}ms"
				>
					<span class="button-bg"></span>
					<span class="button-text">{label}</span>
				</button>
			{/each}
		</div>
		
		<!-- Game Tips Panel -->
		<div class="terminal-panel tip-container" in:fly={{ y: 20, duration: 800, delay: 800, easing: cubicOut }}>
			<div class="panel-label">COMBAT TIP</div>
			{#if showingTip}
				<div class="tip-text" in:fly={{ y: 10, duration: 400, easing: cubicOut }}>
					{tips[currentTip]}
				</div>
			{/if}
		</div>
	</div>

	<div class="footer" in:fade={{ duration: 1000, delay: 1200 }}>
		MIL-DTL-83133 | DEVELOPED BY TEAM-JOINT
	</div>

	{#if showCredits}
		<div transition:fade={{ duration: 300 }}>
			<DemoCredits on:close={() => showCredits = false} />
		</div>
	{/if}

	{#if showHighScores}
		<div transition:fade={{ duration: 300 }}>
			<DemoHi on:close={() => showHighScores = false} />
		</div>
	{/if}
</div>

<style>
	@keyframes pulse {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.8; transform: scale(0.98); }
	}
	
	@keyframes scan {
		0% { opacity: 0.3; }
		50% { opacity: 0.7; }
		100% { opacity: 0.3; }
	}
	
	.menu-container {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: rgba(92, 255, 141, 0.212);
		font-family: 'Consolas', 'Courier New', monospace;
		text-shadow: 0 0 3px rgba(92, 255, 142, 0.3);
		overflow: hidden;
	}
	
	.menu-background {
		position: absolute;
		inset: 0;
		
		backdrop-filter: blur(10px);
		z-index: -2;
	}
	
	.center-frame {
		position: relative;
		min-width: 20%;
		min-height: 50vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 30px;
	}
	
	.center-frame::after {
		content: '';
		position: absolute;
		inset: -20px;
		border: 1px solid rgba(92, 255, 142, 0.1);
		z-index: -1;
		pointer-events: none;
		animation: framePulse 8s infinite ease-in-out;
	}
	
	@keyframes framePulse {
		0%, 100% { border-color: rgba(92, 255, 142, 0.1); }
		50% { border-color: rgba(92, 255, 142, 0.3); }
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
		padding: 15px;
		width: 280px;
	}
	
	.panel-label {
		font-size: 0.7rem;
		opacity: 0.7;
		letter-spacing: 1px;
		margin-bottom: 10px;
	}

	.game-title-panel {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		width: 350px;
	}
	
	.game-title {
		margin-bottom: 20px;
	}
	
	.title-text {
		font-size: 1.8rem;
		font-weight: 400;
		letter-spacing: 2px;
	}

	.logo-container {
		width: 100%;
		height: 150px;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	
	.a10-logo {
		width: 100%;
		height: 100%;
	}
	
	.cannon {
		animation: pulse 4s infinite;
	}
	
	.menu-buttons {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 10px;
		z-index: 5;
	}

	.menu-buttons::before {
		content: '';
		position: absolute;
		top: -10px;
		left: -10px;
		width: calc(100% + 20px);
		height: calc(100% + 20px);
		background: 
			linear-gradient(90deg, rgba(92, 255, 142, 0.2) 50%, transparent 50%), 
			linear-gradient(rgba(92, 255, 142, 0.2) 50%, transparent 50%);
		background-size: 4px 4px;
		background-position: 0 0;
		opacity: 0.3;
		z-index: -1;
		animation: backgroundShift 20s linear infinite;
		pointer-events: none;
	}
	
	@keyframes backgroundShift {
		0% { background-position: 0 0; }
		100% { background-position: 40px 40px; }
	}
	
	.menu-button {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
		padding: 8px 10px;
		border: 1px solid rgba(92, 255, 142, 0.3);
		background: transparent;
		color: rgba(92, 255, 142, 0.7);
		font-family: 'Consolas', 'Courier New', monospace;
		font-size: 0.9rem;
		letter-spacing: 1px;
		cursor: pointer;
		transition: all 0.2s;
		overflow: hidden;
	}
	
	.menu-button:hover, .menu-button.active {
		border-color: rgba(92, 255, 142, 0.8);
		color: rgba(92, 255, 142, 1);
		text-shadow: 0 0 5px rgba(92, 255, 142, 0.7);
	}

	.button-bg {
		position: absolute;
		inset: 0;
		background: rgba(92, 255, 142, 0);
		transition: background 0.2s;
	}

	.menu-button:hover .button-bg, .menu-button.active .button-bg {
		background: rgba(92, 255, 142, 0.1);
	}
	
	.menu-button:hover::before, .menu-button.active::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		width: 4px;
		height: 100%;
		background: rgba(92, 255, 142, 0.8);
		box-shadow: 0 0 8px rgba(92, 255, 142, 0.7);
		animation: buttonPulse 2s infinite ease-in-out;
	}
	
	.menu-button:hover::after, .menu-button.active::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, 
			rgba(92, 255, 142, 0.1) 0%, 
			rgba(92, 255, 142, 0) 50%,
			rgba(92, 255, 142, 0) 100%);
		z-index: 0;
		animation: buttonScanEffect 2s infinite linear;
	}
	
	@keyframes buttonPulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}
	
	@keyframes buttonScanEffect {
		0% { transform: translateX(-100%); }
		100% { transform: translateX(100%); }
	}

	.sound-button.sound-on {
		border-color: rgba(92, 255, 142, 0.6);
	}
	
	.sound-button.sound-on .button-bg {
		background: rgba(92, 255, 142, 0.15);
	}

	.quality-button.quality-high {
		border-color: rgba(92, 255, 142, 0.6);
	}
	
	.quality-button.quality-high .button-bg {
		background: rgba(92, 255, 142, 0.15);
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
	
	/* Tip Container Styles */
	.tip-container {
		margin-top: 0.5rem;
		width: 100%;
		min-height: 60px;
		text-align: center;
	}
	
	.tip-text {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.7);
		text-align: center;
		line-height: 1.4;
	}
	
	/* SVG Animation Styles */
	@keyframes rotate {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
	
	@keyframes rotateReverse {
		from { transform: rotate(0deg); }
		to { transform: rotate(-360deg); }
	}
	
	@keyframes pulse {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.8; transform: scale(0.98); }
	}
	
	@keyframes pulseGlow {
		0%, 100% { opacity: 1; fill: rgba(92, 255, 142, 0.9); }
		50% { opacity: 0.8; fill: rgba(92, 255, 142, 0.6); }
	}
	
	@keyframes scanLine {
		0% { opacity: 0.2; }
		50% { opacity: 0.5; }
		100% { opacity: 0.2; }
	}
	
	@keyframes flickerText {
		0%, 100% { opacity: 0.5; }
		5% { opacity: 0.7; }
		10% { opacity: 0.5; }
		15% { opacity: 0.8; }
		30% { opacity: 0.5; }
		50% { opacity: 0.6; }
		70% { opacity: 0.5; }
		80% { opacity: 0.7; }
		90% { opacity: 0.5; }
	}
	
	@keyframes radarSweep {
		from { transform: rotate(0deg); transform-origin: center; }
		to { transform: rotate(360deg); transform-origin: center; }
	}
	
	@keyframes blip {
		0%, 100% { opacity: 0; }
		50% { opacity: 1; }
	}
	
	@keyframes crosshairPulse {
		0%, 100% { stroke-width: 1; opacity: 0.3; }
		50% { stroke-width: 1.5; opacity: 0.5; }
	}
	
	@keyframes barrelHighlight {
		0%, 100% { stroke: rgba(92, 255, 142, 0.9); }
		25% { stroke: rgba(92, 255, 142, 0.4); }
		50% { stroke: rgba(92, 255, 142, 0.9); }
		75% { stroke: rgba(92, 255, 142, 0.4); }
	}
	
	@keyframes scan {
		0% { 
			background-position: 0% 0%;
			opacity: 0.05;
		}
		50% { 
			opacity: 0.1;
		}
		100% { 
			background-position: 0% 100%;
			opacity: 0.05;
		}
	}
	
	@keyframes noiseAnimation {
		0% { background-position: 0% 0%; }
		100% { background-position: 100% 100%; }
	}
	
	.a10-logo {
		width: 100%;
		height: 100%;
		position: relative;
		z-index: 10;
	}
	
	.cannon {
		animation: pulse 4s infinite;
	}
	
	.rotate {
		animation: rotate 10s linear infinite;
		transform-origin: center;
	}
	
	.rotate-reverse {
		animation: rotateReverse 7s linear infinite;
		transform-origin: center;
	}
	
	.glow {
		animation: pulseGlow 2s ease-in-out infinite;
	}
	
	.scan-line {
		animation: scanLine 3s ease-in-out infinite;
	}
	
	.tech-text {
		animation: flickerText 8s linear infinite;
	}
	
	.target-data {
		animation: flickerText 5s linear infinite;
	}
	
	.radar-sweep {
		animation: radarSweep 8s linear infinite;
		transform-origin: 120px 60px;
	}
	
	.random-blip {
		transform-origin: center;
	}
	
	.blip-1 {
		animation: blip 3s ease-in-out infinite;
	}
	
	.blip-2 {
		animation: blip 4s ease-in-out infinite 1s;
	}
	
	.blip-3 {
		animation: blip 5s ease-in-out infinite 0.5s;
	}
	
	.blip-4 {
		animation: blip 3.5s ease-in-out infinite 1.5s;
	}
	
	.crosshair {
		animation: crosshairPulse 4s ease-in-out infinite;
	}
	
	.barrel {
		animation: barrelHighlight 1s linear infinite;
	}
	
	.pulse-slow {
		animation: pulse 6s ease-in-out infinite;
	}
	
	.ammo-pulse {
		animation: pulse 2s ease-in-out infinite;
	}
	
	.delay {
		animation-delay: 1s;
	}
	
	.bracket {
		animation: pulse 5s ease-in-out infinite;
	}
	
	.scan-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(transparent, rgba(92, 255, 142, 0.1), transparent);
		background-size: 100% 200%;
		pointer-events: none;
		z-index: 5;
		animation: scan 4s linear infinite;
	}
	
	.grid-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-image: linear-gradient(rgba(92, 255, 142, 0.1) 1px, transparent 1px),
						  linear-gradient(90deg, rgba(92, 255, 142, 0.1) 1px, transparent 1px);
		background-size: 20px 20px;
		pointer-events: none;
		z-index: 5;
		opacity: 0.2;
	}
	
	.noise-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
		background-size: 200px 200px;
		pointer-events: none;
		z-index: 4;
		opacity: 0.05;
		animation: noiseAnimation 8s linear infinite;
	}
	
	.active-element {
		transition: transform 0.2s ease-out;
	}
	
	.active-element:hover {
		transform: scale(1.02);
	}
</style>