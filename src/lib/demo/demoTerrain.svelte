<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import { GLTF, useDraco, Audio, AudioListener, useGltf, PositionalAudio } from '@threlte/extras';
	import * as THREE from 'three';
	import { hudState } from './hudStore';
	import { onMount, onDestroy } from 'svelte';
	import { soundEnabled } from '$lib/stores/audioStore';
	import { highQualityEnabled } from '$lib/stores/qualityStore';
	

	// Accept ship data for cloud movement
	export let virtualVelocity = { x: 0, y: 0, z: 0 };
	export let speed = 0;
	export let worldOffset = { x: 0, y: 0, z: 0 };
	export const rotationZ = 0;  // Add rotation prop
	export let thrust = 0;     // Changed from const to let - now used for cloud effects
	export let audioListener: THREE.AudioListener; // Accept listener from parent

	// ==============================
	// Loaders & Resources
	// ==============================
	const dracoLoader = useDraco();
	
	// Cloud and bird references and state
	let cloudRef: THREE.Group;
	let birdsRef: THREE.Group;
	let cloudRotation = { x: 0, y: 0, z: 0 };
	let birdsRotation = { x: 0, y: 0, z: 0 };
	let birdsPosition = { x: 0, y: -50, z: 0 };
	
	// Cloud positioning variables
	let cloudYOffset = 0;
	let cloudTimeCounter = 0;
	// Time-based pattern for cloud vertical movement
	const CLOUD_CYCLE_DURATION = 15; // seconds for a full up/down cycle
	// Smaller cloud movement range to keep them more centered
	const CLOUD_POSITION_RANGE = 10; // Reduced from 30
	// Cloud center offset from player
	const CLOUD_CENTER_OFFSET = { x: 0, y: 20, z: 0 }; 
	
	// Audio control
	let volume = 0.5;
	let audioRef: THREE.Audio;
	let godzillaAudioRef: THREE.PositionalAudio;
	let kingKongAudioRef: THREE.PositionalAudio;
	let godzillaTimer = 0;
	let kingKongTimer = 0;
	const GODZILLA_SOUND_INTERVAL = 10; // seconds
	const KINGKONG_SOUND_INTERVAL = 14; // seconds
	
	// Flag to track if user has interacted and audio is ready
	let hasUserInteracted = false;
	let audioInitialized = false;
	
	// Audio resources paths (will only be used after user interaction)
	const godzillaAudioPath = '/mainMenu/godzilla/godzilla.mp3';
	const kingKongAudioPath = '/mainMenu/kingkong/gorilla.mp3';
	const windAudioPath = '/sound/wind.mp3';
	
	// Initialize audio after user interaction
	function initializeAudio() {
		if (audioInitialized) return;
		
		hasUserInteracted = true;
		
		// Make sure the AudioContext is resumed
		if (audioListener && audioListener.context.state === 'suspended') {
			audioListener.context.resume().then(() => {
				audioInitialized = true;
			});
		} else {
			audioInitialized = true;
		}
	}
	
	// Listen for user interaction
	onMount(() => {
		const handleInteraction = () => {
			if (!hasUserInteracted) {
				initializeAudio();
			}
		};
		
		window.addEventListener('click', handleInteraction);
		window.addEventListener('keydown', handleInteraction);
		window.addEventListener('touchstart', handleInteraction);
		
		return () => {
			window.removeEventListener('click', handleInteraction);
			window.removeEventListener('keydown', handleInteraction);
			window.removeEventListener('touchstart', handleInteraction);
		};
	});
	
	let mixer: THREE.AnimationMixer;
	let godzillaMixer: THREE.AnimationMixer;
	let kingKongMixer: THREE.AnimationMixer;
	// Bird movement parameters
	let birdVelocity = { x: 0.8, y: 0.4, z: 0.8 }; // Reduced from { x: 2, y: 1, z: 2 }
	const BOUNDS = { x: 150, y: 100, z: 150 };
	const MIN_HEIGHT = 10;
	
	// Create multiple bird groups
	let birdsRefs: THREE.Group[] = [];
	let birdsPositions = [
		{ x: 0, y: -50, z: 0 },       // Original birds
		{ x: 30, y: 5, z: -40 },      // Close to player
		{ x: -20, y: 10, z: -30 },    // Close to player from other side
		{ x: 100, y: 40, z: 80 },     // Far flock
		{ x: -120, y: 60, z: -90 }    // Far flock in opposite direction
	];
	let birdsVelocities = [
		{ x: 0.8, y: 0.4, z: 0.8 },     // Reduced from 2, 1, 2
		{ x: 1.2, y: 0.2, z: 1.0 },     // Reduced from 3, 0.5, 2.5
		{ x: -1.0, y: 0.3, z: -0.8 },   // Reduced from -2.5, 0.8, -2
		{ x: 0.6, y: 0.5, z: 0.7 },     // Reduced from 1.5, 1.2, 1.8
		{ x: -0.7, y: 0.4, z: -0.9 }    // Reduced from -1.8, 0.9, -2.2
	];
	let birdsScales = [2, 1.5, 1.3, 2.2, 1.8];  // Different sizes for variety
	let birdsRotations = Array(5).fill({ x: 0, y: 0, z: 0 });
	
	// Add map reference and state at the top with other refs
	let mapRef: THREE.Group;
	let mapRotation = { x: 0, y: 0, z: 0 };
	
	// Add these near your other state variables
	let cloudMeshRef: THREE.Group;
	let cloudMeshRotation = { x: 0, y: 0, z: 0 };
	
	// Update wind volume based on speed and enabled state
	useTask(() => {
		if (audioRef && $soundEnabled) {
			// Adjust volume based on speed - increase volume with higher speed
			const baseVolume = 0.9;
			const dynamicVolume = Math.min(0.7, speed / 300);
			volume = baseVolume + dynamicVolume;
		} else if (!$soundEnabled && audioRef) {
			volume = 0;
		}
	});
	
	// Update cloud and birds rotation based on ship movement
	useTask((delta) => {
		// Update animation mixers
		if (mixer) {
			mixer.update(delta);
		}
		
		if (godzillaMixer) {
			godzillaMixer.update(delta);
		}
		
		if (kingKongMixer) {
			kingKongMixer.update(delta);
		}

		// Process cloud animations only in high quality mode
		if ($highQualityEnabled && cloudRef) {
			// Use a minimum speed of 60 for cloud rotation effect
			const effectiveSpeed = Math.max(60, speed);
			
			// Scale rotation speed based on ship speed
			const speedFactor = Math.min(2, effectiveSpeed / 30) * delta;
			
			// Cloud movement
			cloudRotation.x -= virtualVelocity.y * 0.001 * speedFactor;
			cloudRotation.y -= virtualVelocity.x * 0.0005 * speedFactor;
			cloudRotation.z -= (virtualVelocity.x * 0.0002) * speedFactor;
			cloudRotation.y -= 0.001 * delta * (1.0 + speedFactor * 0.5);
			cloudRef.rotation.set(cloudRotation.x, cloudRotation.y, cloudRotation.z);
			
			// Update cloud time counter for vertical movement pattern
			cloudTimeCounter += delta;
			if (cloudTimeCounter > CLOUD_CYCLE_DURATION) {
				cloudTimeCounter -= CLOUD_CYCLE_DURATION;
			}
			
			// Calculate vertical position using sine wave - with reduced amplitude
			cloudYOffset = Math.sin(cloudTimeCounter / CLOUD_CYCLE_DURATION * Math.PI * 2) * CLOUD_POSITION_RANGE;
			
			// Position clouds, staying much closer to the player with gentle movements
			// Use small fraction of world offset for subtle parallax but keep clouds mostly centered
			cloudRef.position.x = -worldOffset.x * 0.005 + Math.sin(cloudTimeCounter * 0.5) * 5 + CLOUD_CENTER_OFFSET.x;
			cloudRef.position.y = CLOUD_CENTER_OFFSET.y + cloudYOffset; // Centered above player with gentle oscillation
			cloudRef.position.z = -worldOffset.z * 0.005 + Math.cos(cloudTimeCounter * 0.7) * 5 + CLOUD_CENTER_OFFSET.z;

			// Add slight cloud scaling based on player speed for "wind expansion" effect
			const baseScale = 50;
			const speedScale = 1 + (speed / 500); // Subtle scaling based on speed
			
			// Apply thrust effect - clouds stretch slightly backward when thrusting
			const thrustEffect = thrust * 0.01;
			cloudRef.scale.set(
				baseScale * speedScale * (1 + thrustEffect), 
				baseScale, 
				baseScale * speedScale * (1 - thrustEffect * 0.5)
			);
			
			// Add slight backward motion when thrusting
			if (thrust > 0) {
				cloudRef.position.z -= thrust * 0.2;
			}
		}

		// Birds movement
		birdsRefs.forEach((birdRef, index) => {
			if (!birdRef) return;
			
			// Update position based on velocity, adding a small influence from player movement
			birdsPositions[index].x += birdsVelocities[index].x * delta * 30;
			birdsPositions[index].y += birdsVelocities[index].y * delta * 30;
			birdsPositions[index].z += birdsVelocities[index].z * delta * 30;
			
			// Add small player-dependent movement - birds slightly follow player's movement
			// This creates a subtle "wind current" effect where birds drift with player
			const playerInfluence = 0.03; // How much birds follow player
			birdsPositions[index].x -= virtualVelocity.x * delta * playerInfluence;
			birdsPositions[index].z -= virtualVelocity.z * delta * playerInfluence;
			
			// When player is moving fast, birds tend to move away slightly
			if (speed > 100) {
				const avoidanceStrength = 0.02 * (speed / 100);
				const distanceToPlayer = Math.sqrt(
					birdsPositions[index].x * birdsPositions[index].x + 
					birdsPositions[index].z * birdsPositions[index].z
				);
				
				// Only apply avoidance if birds are close to player
				if (distanceToPlayer < 50) {
					// Move away from player - normalized direction vector * strength
					birdsPositions[index].x += (birdsPositions[index].x / distanceToPlayer) * avoidanceStrength;
					birdsPositions[index].z += (birdsPositions[index].z / distanceToPlayer) * avoidanceStrength;
				}
			}

			// Bounce off bounds
			if (Math.abs(birdsPositions[index].x) > BOUNDS.x) {
				birdsVelocities[index].x *= -1;
				birdsPositions[index].x = Math.sign(birdsPositions[index].x) * BOUNDS.x;
			}
			if (birdsPositions[index].y > BOUNDS.y || birdsPositions[index].y < MIN_HEIGHT) {
				birdsVelocities[index].y *= -1;
				birdsPositions[index].y = birdsPositions[index].y < MIN_HEIGHT ? MIN_HEIGHT : BOUNDS.y;
				
				// Add some randomness to x/z velocity on vertical bounce
				birdsVelocities[index].x += (Math.random() - 0.5) * 0.3; // Reduced from 0.5
				birdsVelocities[index].z += (Math.random() - 0.5) * 0.3; // Reduced from 0.5
			}
			if (Math.abs(birdsPositions[index].z) > BOUNDS.z) {
				birdsVelocities[index].z *= -1;
				birdsPositions[index].z = Math.sign(birdsPositions[index].z) * BOUNDS.z;
			}

			// Rotate birds to face movement direction with smoother transitions
			const targetYRotation = Math.atan2(birdsVelocities[index].x, birdsVelocities[index].z);
			const targetXRotation = birdsVelocities[index].y * 0.2; // Tilt based on vertical movement
			
			// Smooth rotation - interpolate current rotation towards target
			birdsRotations[index].y = THREE.MathUtils.lerp(birdsRotations[index].y, targetYRotation, delta * 2);
			birdsRotations[index].x = THREE.MathUtils.lerp(birdsRotations[index].x, targetXRotation, delta * 2);
			
			// Apply transformations
			birdRef.position.set(birdsPositions[index].x, birdsPositions[index].y, birdsPositions[index].z);
			birdRef.rotation.set(birdsRotations[index].x, birdsRotations[index].y, birdsRotations[index].z);
		});

		// Map rotation based on movement
		if (mapRef) {
			// Use a minimum speed of 60 for rotation effect (similar to cloud effect)
			const effectiveSpeed = Math.max(60, speed);
			
			// Scale rotation speed based on ship speed
			const speedFactor = Math.min(2, effectiveSpeed / 30) * delta;
			
			// Rotate based on velocity and speed
			mapRotation.y += (virtualVelocity.x * 0.0001) * speedFactor;
			mapRotation.x += (virtualVelocity.y * 0.0001) * speedFactor;
			
			// Constant rotation based on speed
			mapRotation.y += (speed * 0.0001) * delta;
			
			// Apply rotations with some constraints
			mapRef.rotation.set(
				THREE.MathUtils.clamp(mapRotation.x, -0.2, 0.2),  // Limit x tilt
				mapRotation.y,  // Allow full 360 on y
				mapRef.rotation.z
			);
			
			// Move map position based on world offset for parallax
			mapRef.position.x = -worldOffset.x * 0.01;
			mapRef.position.z = -worldOffset.z * 0.01;
		}

		
	});

	// Load birds model and handle animations
	const birds = useGltf('/mainMenu/birds/scene.gltf');
	$: if ($birds) {
		const animations = $birds.animations;
		if (animations?.length) {
			mixer = new THREE.AnimationMixer($birds.scene);
			const action = mixer.clipAction(animations[0]);
			action.play();
			
			// Clean up on component destroy
			onDestroy(() => {
				action.stop();
				mixer.stopAllAction();
				mixer.uncacheRoot($birds.scene);
			});
		}
	}
	
	// Load Godzilla model and handle animations
	const godzilla = useGltf('/mainMenu/godzilla/scene.gltf');
	$: if ($godzilla) {
		const animations = $godzilla.animations;
		if (animations?.length) {
			godzillaMixer = new THREE.AnimationMixer($godzilla.scene);
			const action = godzillaMixer.clipAction(animations[0]);
			action.play();
			
			// Clean up on component destroy
			onDestroy(() => {
				if (godzillaMixer) {
					godzillaMixer.stopAllAction();
					godzillaMixer.uncacheRoot($godzilla.scene);
				}
			});
		}
	}
	
	// Load King Kong model and handle animations
	const kingKong = useGltf('/mainMenu/kingkong/scene.gltf');
	$: if ($kingKong) {
		const animations = $kingKong.animations;
		if (animations?.length) {
			kingKongMixer = new THREE.AnimationMixer($kingKong.scene);
			const action = kingKongMixer.clipAction(animations[0]);
			action.play();
			
			// Clean up on component destroy
			onDestroy(() => {
				if (kingKongMixer) {
					kingKongMixer.stopAllAction();
					kingKongMixer.uncacheRoot($kingKong.scene);
				}
			});
		}
	}

	// Timer for monster sounds
	useTask((delta) => {
		// Only process if audio has been initialized after user interaction
		if (!audioInitialized) return;
		
		// Update timers
		godzillaTimer += delta;
		kingKongTimer += delta;
		
		// Play Godzilla sound
		if (godzillaAudioRef && godzillaTimer > GODZILLA_SOUND_INTERVAL) {
			if ($soundEnabled) {
				godzillaAudioRef.play();
			}
			godzillaTimer = 0;
		}
		
		// Play King Kong sound
		if (kingKongAudioRef && kingKongTimer > KINGKONG_SOUND_INTERVAL) {
			if ($soundEnabled) {
				kingKongAudioRef.play();
			}
			kingKongTimer = 0;
		}
	});
	
</script>

	

<!-- Cloud layer -->
{#if $highQualityEnabled}
<T.Group bind:ref={cloudRef}>
	<GLTF
		dracoLoader={dracoLoader}
		url="/mainMenu/cloud/scene.gltf"
		scale={18}
		position={[0, -0.5, 0]}
	/>
</T.Group>
{/if}


<!-- Birds -->
{#each Array(5) as _, i}
	<T.Group bind:ref={birdsRefs[i]}>
		<GLTF
			dracoLoader={dracoLoader}
			url="/mainMenu/birds/scene.gltf"
			scale={[birdsScales[i], birdsScales[i], birdsScales[i]]}
		>
		</GLTF>
	</T.Group>
{/each}

<!-- MAP -->
<T.Group bind:ref={mapRef}>
	<GLTF
		useDraco
		url="/mainMenu/map/meteora_greece.glb"
		position={[0, 0, 0]}
		rotation={[0, 1, 0.001]}
		scale={3}
	/>
	
	<T.Group position={[1500, -350, -190]} rotation={[0, -20, 0]} scale={10}>
		<GLTF
			dracoLoader={dracoLoader}
			url="/mainMenu/godzilla/scene.gltf"
		/>
		{#if audioInitialized}
		<PositionalAudio 
			bind:ref={godzillaAudioRef} 
			src={godzillaAudioPath} 
			distance={3000}
			volume={$soundEnabled ? 2 : 0}
			loop={false}
			autoplay={false}
			listener={audioListener}
		/>
		{/if}
	</T.Group>

	<T.Group position={[380, -360, 360]} rotation={[0, 2.7, 0]} scale={200}>
		<GLTF
			dracoLoader={dracoLoader}
			url="/mainMenu/kingkong/scene.gltf"
		/>
		{#if audioInitialized}
		<PositionalAudio 
			bind:ref={kingKongAudioRef} 
			src={kingKongAudioPath} 
			distance={3000}
			volume={$soundEnabled ? 2 : 0}
			loop={false}
			autoplay={false}
			listener={audioListener}
		/>
		{/if}
	</T.Group>
</T.Group>

<!-- Audio components -->
{#if audioInitialized}
<Audio 
	src={windAudioPath} 
	bind:ref={audioRef} 
	volume={volume} 
	loop 
	listener={audioListener}
	autoplay={$soundEnabled} 
/>
{/if}
