<script lang="ts">
	import { cycle, rotationY, skyboxEnabled } from '$lib/stores/skyboxStore';
	import { 
		skyboxConfig, 
		skyConfig, 
		starsConfig, 
		cameraConfig,
		moonConfig
	} from '$lib/stores/skyboxStore';
	import { T, useTask } from '@threlte/core';
	import { Sky, Float, Stars, GLTF, OrbitControls, useDraco } from '@threlte/extras';
	import * as THREE from 'three';

	// ==============================
	// Loaders & Resources
	// ==============================
	const dracoLoader = useDraco();
	
	
	
	

	// ==============================
	// State Management
	// ==============================
	// Time and cycle state
	let cycleStartTime = Date.now();
	let cycleProgress = 0;
	let elevation = 2;
	let isDaytime = false;
	let lastUpdateTime = Date.now();
	
	// Stars state
	let starsOpacity = 0;
	
	// Moon state
	let moonPosition = new THREE.Vector3();
	let moonPhase = 0;
	let moonVisible = true;
	let moonOpacity = 1;

	// ==============================
	// Reactive Calculations
	// ==============================
	$: updateCycleState(elevation);

	// ==============================
	// Core Functions
	// ==============================
	
	/**
	 * Calculate the sun's elevation based on the cycle progress (0-1)
	 */
	function calculateElevation(progress: number): number {
		if (progress <= 0.5) {
			const normalizedProgress = progress * 2;
			return (Math.sin(normalizedProgress * Math.PI - Math.PI/2) + 1) / 2 * 
				(0.16 - $starsConfig.DAWN_APPROACH) + $starsConfig.DAWN_APPROACH;
		} else {
			const normalizedProgress = (1 - progress) * 2;
			return (Math.sin(normalizedProgress * Math.PI - Math.PI/2) + 1) / 2 * 
				(0.16 - $starsConfig.DAWN_APPROACH) + $starsConfig.DAWN_APPROACH;
		}
	}
	
	/**
	 * Calculate the moon position based on the cycle progress
	 */
	function calculateMoonPosition(progress: number): THREE.Vector3 {
		// Keep moon more stationary, with subtle movement
		const baseAngle = Math.PI; // Moon starts opposite to sun
		const wobble = Math.sin(progress * Math.PI * 2) * 0.1; // Subtle wobble
		const angle = baseAngle + wobble + $moonConfig.OFFSET;
		
		// Calculate elevation - inverse of sun but smoother
		const normalizedProgress = (progress + 0.5) % 1; // Offset by half cycle from sun
		let elevation = Math.sin(normalizedProgress * Math.PI) * 0.5 + 0.5; // Smoother arc
		
		// Apply height factor to control max elevation
		elevation *= $moonConfig.movement.heightFactor;
		
		// Calculate position with reduced movement
		const x = Math.cos(angle) * $moonConfig.DISTANCE * 0.8;
		const y = Math.sin(elevation * Math.PI) * $moonConfig.DISTANCE * 0.6;
		const z = Math.sin(angle) * $moonConfig.DISTANCE * 0.8;
		
		return new THREE.Vector3(x, y, z);
	}
	
	/**
	 * Calculate the current moon phase (0-1)
	 */
	function calculateMoonPhase(progress: number): number {
		// Sync phase with position relative to sun
		return (progress + $moonConfig.phase.offset) % 1;
	}
	
	/**
	 * Calculate moon opacity based on sun elevation
	 */
	function calculateMoonOpacity(elevation: number): number {
		// Start fading moon earlier than stars for smoother transition
		const fadeStart = $starsConfig.DAWN_APPROACH + 0.1; // Start fading slightly after stars
		const fadeEnd = $starsConfig.DAYLIGHT_START - 0.1; // Complete fade before full daylight
		
		if (elevation <= fadeStart) {
			return 1;
		} else if (elevation > fadeStart && elevation < fadeEnd) {
			const progress = (elevation - fadeStart) / (fadeEnd - fadeStart);
			// Smooth fade using cubic easing
			return Math.pow(1 - progress, 3);
		} else {
			return 0;
		}
	}

	/**
	 * Determine if the moon should be visible based on its position and sun elevation
	 */
	function calculateMoonVisibility(position: THREE.Vector3, elevation: number): boolean {
		// Base visibility on moon being above horizon and enabled
		const isVisible = position.y > -100 && $moonConfig.enabled; // More forgiving horizon check
		
		// Update opacity based on sun elevation
		moonOpacity = calculateMoonOpacity(elevation);
		
		return isVisible;
	}

	/**
	 * Calculate star visibility based on sun elevation
	 */
	function calculateStarsOpacity(elevation: number): number {
		if (elevation <= $starsConfig.DAWN_APPROACH) {
			return 1;
		} else if (elevation > $starsConfig.DAWN_APPROACH && elevation < $starsConfig.DAYLIGHT_START) {
			const progress = (elevation - $starsConfig.DAWN_APPROACH) / 
				($starsConfig.DAYLIGHT_START - $starsConfig.DAWN_APPROACH);
			return Math.pow(1 - progress, 1.5);
		} else {
			return 0;
		}
	}

	/**
	 * Update the day/night cycle state
	 */
	function updateCycleState(elevation: number): void {
		if (elevation <= $starsConfig.DAYLIGHT_START) {
			cycle.set('Night');
			isDaytime = false;
		} else {
			cycle.set('Day');
			isDaytime = true;
		}
	}
	
	// ==============================
	// Animation Loop
	// ==============================
	$: if ($skyboxEnabled) {
		resumeAnimation();
	}
	
	function resumeAnimation() {
		const now = Date.now();
		if (now - lastUpdateTime > 1000) {
			cycleStartTime = now - (cycleProgress * $skyboxConfig.CYCLE_LENGTH_MS);
		}
		lastUpdateTime = now;
	}
	
	useTask((delta) => {
		if (!$skyboxEnabled) return;
		
		const now = Date.now();
		lastUpdateTime = now;
		
		const elapsedTime = now - cycleStartTime;
		cycleProgress = (elapsedTime % $skyboxConfig.CYCLE_LENGTH_MS) / $skyboxConfig.CYCLE_LENGTH_MS;
		
		elevation = calculateElevation(cycleProgress);
		starsOpacity = calculateStarsOpacity(elevation);
		
		moonPosition = calculateMoonPosition(cycleProgress);
		moonPhase = calculateMoonPhase(cycleProgress);
		moonVisible = calculateMoonVisibility(moonPosition, elevation);
		
		updateCycleState(elevation);
	});
	
	// Simple moon material with phase effect
	function createMoonMaterial(phase: number): THREE.ShaderMaterial {
		return new THREE.ShaderMaterial({
			uniforms: {
				phase: { value: phase },
				phaseEnabled: { value: $moonConfig.phase.enabled },
				glowEnabled: { value: $moonConfig.emissive.enabled },
				glowColor: { value: new THREE.Color($moonConfig.emissive.color) },
				glowStrength: { value: $moonConfig.emissive.intensity * moonOpacity }, // Scale glow with opacity
				moonOpacity: { value: moonOpacity },
				baseColor: { value: new THREE.Color($moonConfig.COLOR) }
			},
			vertexShader: `
				varying vec3 vNormal;
				varying vec3 vViewPosition;
				
				void main() {
					vNormal = normalize(normalMatrix * normal);
					vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
					vViewPosition = -mvPosition.xyz;
					gl_Position = projectionMatrix * mvPosition;
				}
			`,
			fragmentShader: `
				uniform float phase;
				uniform bool phaseEnabled;
				uniform bool glowEnabled;
				uniform vec3 glowColor;
				uniform float glowStrength;
				uniform float moonOpacity;
				uniform vec3 baseColor;
				
				varying vec3 vNormal;
				varying vec3 vViewPosition;
				
				void main() {
					// Base color
					vec3 finalColor = baseColor;
					
					// Phase calculation if enabled
					if (phaseEnabled) {
						float phaseAngle = phase * 6.28318530718;
						vec3 phaseDir = normalize(vec3(cos(phaseAngle), 0.0, sin(phaseAngle)));
						float phaseFactor = dot(vNormal, phaseDir) * 0.5 + 0.5;
						float phaseAmount = smoothstep(0.0, 1.0, phaseFactor);
						finalColor = mix(baseColor * 0.1, baseColor, phaseAmount); // More contrast in phases
					}
					
					// Edge glow effect if enabled
					if (glowEnabled) {
						vec3 viewDir = normalize(vViewPosition);
						float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 3.0); // Sharper glow falloff
						finalColor += glowColor * fresnel * glowStrength;
					}
					
					// Apply opacity with smooth falloff
					float alpha = moonOpacity * (0.8 + 0.2 * smoothstep(0.0, 1.0, moonOpacity));
					
					gl_FragColor = vec4(finalColor * moonOpacity, alpha);
				}
			`,
			transparent: true,
			blending: THREE.AdditiveBlending // Better glow effect
		});
	}
	
	// Reactive moon material creation
	$: moonMaterial = createMoonMaterial(moonPhase);
</script>

<!-- Camera setup -->

<!-- <T.PerspectiveCamera
	makeDefault
	position={$cameraConfig.POSITION}
	fov={$cameraConfig.FOV}
	near={$cameraConfig.NEAR}
	far={$cameraConfig.FAR}
	focus={1}
	on:create={({ ref }) => {
		ref.lookAt(0, 1, 0);
	}}
>
	<OrbitControls
		screenSpacePanning={false}
		maxTargetRadius={360}
		enableDamping
		enableZoom
		minDistance={30}
		maxDistance={300}
		minPolarAngle={Math.PI / 6}
		maxPolarAngle={Math.PI / 2}
		minAzimuthAngle={-Math.PI / 4}
		maxAzimuthAngle={Math.PI / 4}
		zoomSpeed={1}
	/>
</T.PerspectiveCamera>
 -->

{#if $skyboxEnabled}
	<!-- Cloud layer -->
	<!-- <GLTF
		dracoLoader={dracoLoader}
		url="/mainMenu/cloud/scene-transformed.glb"
		scale={$cloudScale}
		rotation={[0, -$rotationY, 0.0001]}
	/> -->

	<!-- Sky with atmospheric scattering -->
	<Sky
		elevation={elevation}
		azimuth={$skyConfig.AZIMUTH}
		mieCoefficient={$skyConfig.MIE_COEFFICIENT}
		mieDirectionalG={$skyConfig.MIE_DIRECTIONAL_G}
		rayleigh={$skyConfig.RAYLEIGH}
		turbidity={$skyConfig.TURBIDITY}
	/>
	
	<!-- Moon -->
	{#if moonVisible}
		<T.Group position={[moonPosition.x, moonPosition.y, moonPosition.z]}>
			<!-- Moon sphere -->
			<T.Mesh material={moonMaterial}>
				<T.SphereGeometry args={[$moonConfig.SIZE, 32, 32]} />
			</T.Mesh>
			
			<!-- Glow effect -->
			{#if $moonConfig.emissive.enabled}
				<T.PointLight 
					color={$moonConfig.emissive.color}
					intensity={1.5 * $moonConfig.emissive.intensity}
					distance={$moonConfig.SIZE * 12}
					decay={2}
				/>
			{/if}
		</T.Group>
	{/if}

	<!-- Multi-layered star field for depth and realism -->
	{#each $starsConfig.LAYERS as layer, i}
		<Float floatIntensity={2} rotationIntensity={0.2} rotationSpeed={0.05 * (i + 1)}>
			<Stars 
				count={layer.count} 
				opacity={starsOpacity * layer.opacity} 
				depth={$starsConfig.DEPTH + i * 8} 
				fade={true} 
				factor={layer.factor} 
				speed={layer.speed}
				radius={350} 
				saturation={1.2}
				size={layer.size}
				color={layer.color}
			/>
		</Float>
	{/each}

	<!-- Distinctive constellation stars -->
	<Float floatIntensity={1} rotationIntensity={0.1} rotationSpeed={0.01}>
		<Stars 
			count={$starsConfig.CONSTELLATIONS.COUNT} 
			opacity={starsOpacity} 
			depth={$starsConfig.CONSTELLATIONS.DEPTH} 
			fade={true} 
			factor={$starsConfig.CONSTELLATIONS.FACTOR} 
			speed={$starsConfig.CONSTELLATIONS.SPEED}
			radius={$starsConfig.CONSTELLATIONS.RADIUS}
			saturation={$starsConfig.CONSTELLATIONS.SATURATION}
			size={$starsConfig.CONSTELLATIONS.SIZE}
			color={$starsConfig.CONSTELLATIONS.COLOR}
		/>
	</Float>
{/if}