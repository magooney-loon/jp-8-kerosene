<script lang="ts">
	import { useProgress } from '@threlte/extras';
	import { Tween } from 'svelte/motion';
	import { fade, scale, fly } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { cubicOut } from 'svelte/easing';

	const { active, item, loaded, total, progress } = useProgress();
	const tweenedProgress = new Tween($progress, {
		duration: 800
	});
	$: tweenedProgress.target = $progress;

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
	
	// Handle case when there's nothing to load
	onMount(() => {
		const checkNoAssetsTimeout = setTimeout(() => {
			// If after a short delay we're still at 0% and nothing is loading
			if (tweenedProgress.current === 0 && $total === 0) {
				tweenedProgress.target = 1;
			}
		}, 1000); // Wait 1 second before deciding nothing is loading
		
		// Rotate through tips
		const tipInterval = setInterval(() => {
			showingTip = false;
			setTimeout(() => {
				currentTip = (currentTip + 1) % tips.length;
				showingTip = true;
			}, 500);
		}, 4000);

		return () => {
			clearTimeout(checkNoAssetsTimeout);
			clearInterval(tipInterval);
		};
	});
	
	// Function to truncate long asset paths
	function truncatePath(path: string | undefined, maxLength: number = 30): string {
		if (!path) return 'Initializing...';
		
		// If the path is already short enough, return it as is
		if (path.length <= maxLength) return path;
		
		// Extract just the filename using the last segment after slash or backslash
		const fileName = path.split(/[\/\\]/).pop() || path;
		
		// If filename itself is shorter than max length, return it
		if (fileName.length <= maxLength) return fileName;
		
		// Otherwise truncate the filename and add ellipsis
		return fileName.substring(0, maxLength - 3) + '...';
	}
</script>

{#if tweenedProgress.current < 1}
	<div 
		transition:fade|local={{ duration: 800 }}
		class="loading-container"
	>
		<div class="loading-background"></div>
		
		<div class="center-frame">
			<!-- Corner markers -->
			<div class="corner top-left"></div>
			<div class="corner top-right"></div>
			<div class="corner bottom-left"></div>
			<div class="corner bottom-right"></div>
			
			<div class="terminal-panel loading-content">
			
				
				<div class="loading-title" in:scale={{ duration: 400, delay: 200 }}>
					LOADING GAME ASSETS
				</div>
				
				<div class="loading-status" in:fade={{ duration: 300, delay: 400 }}>
					<div class="progress-percentage">
						{Math.round(tweenedProgress.current * 100)}%
					</div>
					
					{#if $active}
						<div class="loading-item">
							<span class="loading-label">LOADING:</span> 
							<span class="loading-value">{truncatePath($item)}</span>
						</div>
						<div class="loading-item">
							<span class="loading-label">ASSETS:</span> 
							<span class="loading-value">{$loaded} of {$total}</span>
						</div>
					{:else if $total === 0}
						<div class="loading-item">
							<span class="loading-value">Initializing game world...</span>
						</div>
					{:else}
						<div class="loading-item">
							<span class="loading-value">Preparing game assets...</span>
						</div>
					{/if}
				</div>

				<div class="progress-bar-container">
					<div class="progress-bar-outer">
						<div
							class="progress-bar"
							style:width={tweenedProgress.current * 100 + '%'}
						></div>
					</div>
					<div class="progress-ticks">
						{#each Array(10) as _, i}
							<div class="tick" class:active={tweenedProgress.current * 10 >= i}>|</div>
						{/each}
					</div>
				</div>
				
				<div class="terminal-panel tip-container">
					<div class="panel-label">TIP</div>
					{#if showingTip}
						<div class="tip-text" in:fly={{ y: 10, duration: 400, easing: cubicOut }}>
							{tips[currentTip]}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes pulse {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.7; transform: scale(0.95); }
	}
	
	.loading-container {
		position: fixed;
		inset: 0;
		z-index: 150;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: rgba(92, 255, 142, 0.7);
		font-family: 'Consolas', 'Courier New', monospace;
		text-shadow: 0 0 3px rgba(92, 255, 142, 0.3);
		overflow: hidden;
		pointer-events: auto;
	}
	
	.loading-background {
		position: absolute;
		inset: 0;
		background: rgba(0, 20, 25, 0.95);
		z-index: -2;
	}
	
	.center-frame {
		position: relative;
		width: 600px;
		height: 400px;
		display: flex;
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
		padding: 10px;
	}
	
	.panel-label {
		font-size: 0.7rem;
		opacity: 0.7;
		letter-spacing: 1px;
		margin-bottom: 5px;
	}
	
	.loading-content {
		width: 90%;
		max-width: 500px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
	}


	.loading-title {
		font-size: 1.2rem;
		font-weight: 400;
		letter-spacing: 2px;
		text-align: center;
	}
	
	.loading-status {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		width: 100%;
	}
	
	.progress-percentage {
		font-size: 2rem;
		font-weight: 400;
		letter-spacing: 1px;
	}

	.loading-item {
		font-size: 0.8rem;
		letter-spacing: 1px;
		display: flex;
		gap: 0.5rem;
		justify-content: center;
	}
	
	.loading-label {
		color: rgba(92, 255, 142, 0.8);
	}
	
	.loading-value {
		color: rgba(255, 255, 255, 0.8);
	}

	.progress-bar-container {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	
	.progress-bar-outer {
		height: 8px;
		width: 100%;
		background-color: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(92, 255, 142, 0.3);
		position: relative;
		overflow: hidden;
	}

	.progress-bar {
		height: 100%;
		transition: width 0.3s ease-out;
		position: relative;
		background: rgba(92, 255, 142, 0.7);
	}
	
	.progress-ticks {
		display: flex;
		justify-content: space-between;
		padding: 0 5px;
		color: rgba(92, 255, 142, 0.5);
		font-size: 0.7rem;
	}
	
	.tick {
		transition: color 0.3s;
	}
	
	.tick.active {
		color: rgba(92, 255, 142, 1);
	}
	
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
</style>