<script lang="ts">
  import { T, useThrelte, useTask } from '@threlte/core';
  import { HTML, Billboard, Audio, AudioListener, Float, GLTF, OrbitControls } from '@threlte/extras';
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import FighterHUD from './FighterHUD.svelte';
  import DemoSpaceship from './demoSpaceship.svelte';
  import DemoAI from './demoAI.svelte';
  import { hudState } from '$lib/demo/hudStore';
  import DemoTerrain from './demoTerrain.svelte';
  
  // Import our controllers
  import {
    FLIGHT_MODEL,
    initShipState,
    initControls,
    setupControls,
    updateShip,
    updateCamera,
    calculateFlightData,
    type ShipState,
    type ShipControls
  } from './cameraController';

  
  // Get Threlte context
  const { invalidate, renderer } = useThrelte();
  
  // Initialize ship state and controls
  let shipState = initShipState();
  // Set initial altitude higher with some offset for better terrain view
  shipState.worldOffset.y = 400; // Higher start position
  shipState.worldOffset.x = 1000; // Offset X position to get a nice view
  shipState.worldOffset.z = 1000; // Offset Z position
  let controls = initControls();
  
  // Create direct bindable references 
  // Svelte needs direct variables for binding, not getters/setters
  let rotationX = 0;
  let rotationY = 0;
  let rotationZ = 0;
  let enginePowerValue = 0;
  let afterburnerEffectValue = 0;
  
  // References
  let cameraRef: THREE.PerspectiveCamera;
  let ship: THREE.Group;
  let engineGlow: THREE.PointLight;
  let audioListener: THREE.AudioListener;
  
  // Minigun state
  let ammoCount = 6900;
  let currentAmmo = 6900;
  
  // Audio state
  let backgroundMusic: THREE.Audio;
  let audioLoaded = false;
  let musicVolume = 0.5;
  
  // Projectiles from player ship - will be passed to AI for hit detection
  let shipProjectiles: THREE.Object3D[] = [];
  
  // Initialize
  onMount(() => {
    const cleanup = setupControls(controls);
    
    return cleanup;
  });
  
  // Main game loop
  useTask((delta) => {
    // Sync our bindable vars with the ship state before update
    rotationX = shipState.rotation.x;
    rotationY = shipState.rotation.y;
    rotationZ = shipState.rotation.z;
    enginePowerValue = shipState.enginePower;
    afterburnerEffectValue = shipState.afterburnerEffect;
    
    const cappedDelta = Math.min(delta, 0.1);
    
    // Update ship using our new controller
    const currentYawAngle = updateShip(shipState, controls, cappedDelta);
    
    // Update camera using our new controller - now with controls parameter
    updateCamera(cameraRef, shipState, cappedDelta, controls);
    
    // Update engine glow with afterburner effects
    if (engineGlow) {
      // Base intensity with afterburner effect - increased base values
      engineGlow.intensity = shipState.enginePower * (8 + shipState.afterburnerEffect * 10);
      
      // Check for afterburner cooldown state
      const isInCooldown = shipState._afterburnerCooldownUntil > Date.now();
      
      // Afterburner color shift with more vibrant colors
      if (controls.boost && controls.thrust) {
        if (shipState.afterburnerAvailable && !isInCooldown) {
          // Hot blue-white afterburner - more saturated and brighter
          engineGlow.color.setHSL(0.6, 0.9, 0.7); 
          // Add more distance to the light for bigger effect
          engineGlow.distance = 15 + shipState.afterburnerEffect * 10;
        } else if (isInCooldown) {
          // Cooling down state - shift toward orange-yellow to indicate cooldown
          engineGlow.color.setHSL(0.08, 0.9, 0.65);
          engineGlow.distance = 12;
          // Add a distinctive flicker pattern for cooldown
          engineGlow.intensity *= 0.7 + Math.sin(Date.now() / 60) * 0.3;
        } else {
          // Red-orange warning color for low fuel - no afterburner available
          engineGlow.color.setHSL(0.05, 1.0, 0.6);
          engineGlow.distance = 12;
          // Flicker the engine to indicate low fuel
          engineGlow.intensity *= 0.6 + Math.random() * 0.5;
        }
      } else {
        // Normal yellow-orange - more vibrant
        engineGlow.color.setHSL(0.1, 1.0, 0.6);
        // Standard distance
        engineGlow.distance = 12;
      }
      
      // Pulse the afterburner - more dramatic pulse
      if (shipState.afterburnerEffect > 0.5) {
        engineGlow.intensity *= 0.85 + Math.random() * 0.3;
      }
      
      // Low fuel effect - engine starts to sputter
      if (shipState.fuelPercentage < 15 && controls.thrust) {
        // Engine sputtering effect for low fuel
        engineGlow.intensity *= 0.7 + Math.sin(Date.now() / 100) * 0.3 + Math.random() * 0.2;
      }
    }
    
    // Sync our bindable vars with ship state after update
    rotationX = shipState.rotation.x;
    rotationY = shipState.rotation.y;
    rotationZ = shipState.rotation.z;
    enginePowerValue = shipState.enginePower;
    afterburnerEffectValue = shipState.afterburnerEffect;
    
    // Calculate and update HUD values using our new controller
    const flightData = calculateFlightData(shipState, cappedDelta, currentYawAngle, controls);
    
    // Add firing state from controls
    flightData.isFiring = controls.fire;
    
    // Update ammo information
    flightData.ammoCount = ammoCount;
    flightData.currentAmmo = currentAmmo;
    
    hudState.set(flightData);
    
    invalidate();
  });
  
  // Handle updates from DemoSpaceship component when it changes values
  $: {
    shipState.rotation.x = rotationX;
    shipState.rotation.y = rotationY;
    shipState.rotation.z = rotationZ;
    shipState.enginePower = enginePowerValue;
    shipState.afterburnerEffect = afterburnerEffectValue;
  }
  
  // Debug projectiles
  $: if (shipProjectiles.length > 0) {
    console.log(`demoScene: ${shipProjectiles.length} projectiles available to pass to AI`);
  }

</script>

<!-- Scene -->
<T.AmbientLight intensity={0.3} color="#c5d8ff" />
<T.DirectionalLight intensity={1.2} position={[50, 100, 50]} castShadow={false} />
<T.DirectionalLight intensity={0.4} position={[-50, 100, -50]} color="#ffedd0" castShadow={false} />

<!-- Camera -->
<T.PerspectiveCamera 
  makeDefault
  position={[0, FLIGHT_MODEL.CAMERA_HEIGHT, FLIGHT_MODEL.CAMERA_DISTANCE]} 
  fov={75}
  near={0.1}
  far={4500}
  bind:ref={cameraRef}
>
  <AudioListener bind:ref={audioListener} />
</T.PerspectiveCamera>
<!-- 
<T.PerspectiveCamera
  makeDefault
  position={[5, 2, 5]}
  fov={75}
  near={0.1}
  far={4500}
>
  <OrbitControls
    
    enableDamping
  />
</T.PerspectiveCamera> -->

<!-- Background Music -->

<Audio src="/sound/bossfight.mp3" autoplay={true} volume={0.5} loop={true}/>
<!-- Terrain Component -->
<DemoTerrain 
  virtualVelocity={shipState.virtualVelocity}
  speed={shipState.speed}
  worldOffset={shipState.worldOffset}
  thrust={shipState.afterburnerEffect}
  audioListener={audioListener}
/>

<!-- Spaceship Component with fixed bindings -->
<DemoSpaceship 
  bind:rotationX
  bind:rotationY
  bind:rotationZ
  bind:enginePower={enginePowerValue}
  bind:afterburnerEffect={afterburnerEffectValue}
  bind:ship={ship}
  bind:engineGlow={engineGlow}
  bind:ammoCount
  bind:currentAmmo
  bind:projectiles={shipProjectiles}
  isFiring={controls.fire}
  audioListener={audioListener}
/>

{#if shipProjectiles.length > 0}
  <span style="display: none;">Projectiles: {shipProjectiles.length}</span>
{/if}

<!-- AI Enemy Ship Component -->
<DemoAI 
  offsetX={0} 
  offsetY={0} 
  offsetZ={0} 
  playerProjectiles={shipProjectiles}
/>

<!-- Fighter HUD -->
<FighterHUD 
  speed={$hudState.speed}
  mach={$hudState.mach}
  afterburnerEffect={$hudState.afterburnerEffect}
  altitude={$hudState.altitude}
  heading={$hudState.heading}
  roll={$hudState.roll}
  pitch={$hudState.pitch}
  gForce={$hudState.gForce}
  fuelPercent={$hudState.fuelPercent}
  aoa={$hudState.aoa}
  isReverse={$hudState.isReverse}
  isFiring={$hudState.isFiring}
  ammoCount={$hudState.ammoCount}
  currentAmmo={$hudState.currentAmmo}
  isAutoStabilizing={$hudState.isAutoStabilizing}
  autoStabilizationProgress={$hudState.autoStabilizationProgress}
  recoveryThrustActive={$hudState.recoveryThrustActive}
  isAfterburnerCooldown={$hudState.isAfterburnerCooldown}
/>

<!-- Debug information -->
<!-- {#if import.meta.env.DEV}
  <div style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 10px; font-family: monospace;">
    <div>World Pos: [{shipState.worldOffset.x.toFixed(0)}, {shipState.worldOffset.y.toFixed(0)}, {shipState.worldOffset.z.toFixed(0)}]</div>
    <div>Music: {audioLoaded ? 'Loaded' : 'Loading...'}</div>
  </div>
{/if} -->









