<script lang="ts">
  import { T } from '@threlte/core';
  import { useGltf, PositionalAudio, AudioListener } from '@threlte/extras';
  import * as THREE from 'three';
  import { Color } from 'three';
  import { hudState } from './hudStore';
  import { FLIGHT_MODEL } from './cameraController';
  import { onMount, onDestroy } from 'svelte';
  import { useTask } from '@threlte/core';
  
  // Ship state - position stays fixed, only rotation changes
  export const SHIP_FIXED_POSITION = { x: 0, y: 0, z: -20 };
  // Use individual rotation components instead of an object
  export let rotationX = 0;
  export let rotationY = 0;
  export let rotationZ = 0;
  export let enginePower = 0;
  export let afterburnerEffect = 0;
  
  // Receive audioListener from parent component
  export let audioListener: THREE.AudioListener;
  
  // Audio references
  let engineAudio: THREE.PositionalAudio;
  let cooldownAudio: THREE.PositionalAudio;
  let minigunAudio: THREE.PositionalAudio;
  let engineVolume = 0;
  let enginePlaybackRate = 1;
  let cooldownVolume = 0;
  
  // Minigun state
  export let isFiring = false;
  export let fireRate = 30; // rounds per second
  export let ammoCount = 6900; // Total ammo capacity
  export let currentAmmo = 6900; // Current ammo
  
  // Add firing duration tracking
  let firingStartTime = 0;
  let continuousFiringDuration = 0;
  export let prolongedFiringFactor = 0; // 0-1 factor for prolonged firing effects
  
  // Auto-stabilization system state
  let isStalled = false;
  let isAutoStabilizing = false;
  let stallTimeStart = 0;
  let autoStabilizationProgress = 0;
  let autoStabilizationDuration = 0;
  let recoveryThrustActive = false;
  let recoveryThrust = 0;
  
  // Load the GLTF model
  const gltf = useGltf('/demo/scene.gltf');
  
  // References
  export let ship: THREE.Group;
  export const engineGlow: THREE.PointLight = new THREE.PointLight(0xFFFFFF, 1, 100, 2);
  
  let leftEngine: THREE.PointLight;
  let rightEngine: THREE.PointLight;
  let engineColor = new THREE.Color().setHSL(0.05, 0.9, 0.5);
  
  // Minigun references
  let minigun: THREE.Group;
  let minigunBarrels: THREE.Group;
  let muzzleFlash: THREE.PointLight;
  let crosshair3D: THREE.Group; // 3D crosshair reference
  let lastFireTime = 0;
  let barrelRotation = 0;
  const BARREL_ROTATION_SPEED = 0.8;
  
  // Advanced engine effects
  let engineFlares: THREE.Points; // Flare effects for engines
  let afterburnerFlame: THREE.Points; // Special afterburner flames
  let heatDistortion: THREE.Mesh; // Heat distortion effect
  
  // Track rotational velocity for physics
  let rotationalVelocity = { x: 0, y: 0, z: 0 };
  
  // Store engine positions for reference
  const ENGINE_POSITIONS = {
    left: new THREE.Vector3(-0.6, 0, 5.5),
    right: new THREE.Vector3(0.8, 0, 5.5)
  };

  // Engine particle counts
  const ENGINE_PARTICLES = {
    FLARE_COUNT: 40,  // Reduced from 60
    AFTERBURNER_COUNT: 80  // Reduced from 120
  };

  // Performance optimization
  let frameCount = 0;
  
  // Engine effect variables
  let flareGeometry: THREE.BufferGeometry;
  let flareMaterial: THREE.PointsMaterial;
  let flarePositions: Float32Array;

  let afterburnerGeometry: THREE.BufferGeometry;
  let afterburnerMaterial: THREE.PointsMaterial;
  let afterburnerPositions: Float32Array;
  
  // Atmospheric particle effects
  let atmosphericParticles: THREE.Points;
  let particleGeometry: THREE.BufferGeometry;
  let particleMaterial: THREE.PointsMaterial;
  let particlePositions: Float32Array;
  let particleVelocities: Float32Array;
  let particleSizes: Float32Array;
  let particleColors: Float32Array;
  let particleAge: Float32Array;
  let lastSpeed = 0;
  let targetSpeedFactor = 0;
  let currentSpeedFactor = 0;
  
  // Particle settings
  const PARTICLE_SETTINGS = {
    COUNT: 200, // Even more particles for better distribution
    SPREAD: 27,
    FORWARD_OFFSET: 69,
    SIZE_MIN: 0.0000002, // Extremely small
    SIZE_MAX: 0.0000005, // Extremely small
    MIN_SPEED: 0.008,
    MAX_SPEED: 0.2,
    SPEED_FACTOR: 0.6,
    BOUNCE_FACTOR: 0.005,
    SPEED_RESPONSE_LAG: 0.08,
    COLOR_SHIFT_SPEED: 0.01,
    TURBULENCE: 0.015,
    MAX_AGE: 1.5,
    STRETCH_FACTOR: 1.5 // Even less stretching
  };
  
  // Calculate effective engine power for visuals
  // Ensure minimum engine glow for the minimum speed
  $: effectiveEnginePower = Math.max(0.6, enginePower);
  
  // Calculate engine colors based on afterburner with smoother transitions
  $: {
    // Create smoother color transitions by using afterburnerEffect as a parameter
    const hue = afterburnerEffect > 0.5 ? 
      0.01 + afterburnerEffect * 0.01 : // More red-orange for high afterburner 
      0.05 + afterburnerEffect * 0.02; // Normal orange glow
    
    const saturation = 0.9 + afterburnerEffect * 0.1;
    const lightness = 0.5 + afterburnerEffect * 0.2;
    engineColor.setHSL(hue, saturation, lightness);
  }
  
  // Calculate light parameters with smoother transitions and more dramatic effects
  $: engineIntensity = effectiveEnginePower * (afterburnerEffect > 0.2 ? 
    3 + afterburnerEffect * 8 : 2); // Less intense light during afterburner
  
  $: engineDistance = afterburnerEffect > 0.2 ? 
    12 + afterburnerEffect * 10 : 8; // Shorter light throw during afterburner
  
  // Initialize engine flare and afterburner effects
  function initEngineEffects() {
    // Engine flares
    flareGeometry = new THREE.BufferGeometry();
    flarePositions = new Float32Array(ENGINE_PARTICLES.FLARE_COUNT * 3);
    
    // Initialize flare positions near engine exhausts
    for (let i = 0; i < ENGINE_PARTICLES.FLARE_COUNT; i++) {
      // Distribute between engines
      let enginePos;
      if (i < ENGINE_PARTICLES.FLARE_COUNT / 2) {
        enginePos = ENGINE_POSITIONS.left;
      } else {
        enginePos = ENGINE_POSITIONS.right;
      }
      
      // Small random offset for more natural appearance
      const offset = 0.3;
      flarePositions[i * 3] = enginePos.x + (Math.random() - 0.5) * offset;
      flarePositions[i * 3 + 1] = enginePos.y + (Math.random() - 0.5) * offset;
      flarePositions[i * 3 + 2] = enginePos.z + Math.random() * 0.5;
    }
    
    flareGeometry.setAttribute('position', new THREE.BufferAttribute(flarePositions, 3));
    
    // Create flare material with fiery texture
    flareMaterial = new THREE.PointsMaterial({
      color: 0xFF7700,
      size: 0.2,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: createFlareTexture()
    });
    
    engineFlares = new THREE.Points(flareGeometry, flareMaterial);
    
    // Afterburner flame
    afterburnerGeometry = new THREE.BufferGeometry();
    afterburnerPositions = new Float32Array(ENGINE_PARTICLES.AFTERBURNER_COUNT * 3);
    
    // Initialize afterburner positions in a cone behind engines
    for (let i = 0; i < ENGINE_PARTICLES.AFTERBURNER_COUNT; i++) {
      // Distribute between engines
      let enginePos;
      if (i < ENGINE_PARTICLES.AFTERBURNER_COUNT / 2) {
        enginePos = ENGINE_POSITIONS.left;
      } else {
        enginePos = ENGINE_POSITIONS.right;
      }
      
      // Create cone shape extending backwards
      const distance = Math.random() * 2.5; // Length of flame (reduced from 3)
      const angle = Math.random() * Math.PI * 2;
      const spread = Math.random() * 0.25 * (distance / 3); // Wider at the end (reduced from 0.3)
      
      afterburnerPositions[i * 3] = enginePos.x + Math.cos(angle) * spread;
      afterburnerPositions[i * 3 + 1] = enginePos.y + Math.sin(angle) * spread;
      afterburnerPositions[i * 3 + 2] = enginePos.z + distance;
    }
    
    afterburnerGeometry.setAttribute('position', new THREE.BufferAttribute(afterburnerPositions, 3));
    
    // Create afterburner material with special texture
    afterburnerMaterial = new THREE.PointsMaterial({
      color: 0xFF3300,
      size: 0.35, // Reduced from 0.4
      transparent: true,
      opacity: 0.0, // Start invisible until afterburner activates
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: createAfterburnerTexture()
    });
    
    afterburnerFlame = new THREE.Points(afterburnerGeometry, afterburnerMaterial);
    
    // Heat distortion effect (shimmering air behind engines)
    const distortionGeometry = new THREE.PlaneGeometry(3, 2.5); // Reduced height from 3 to 2.5
    const distortionMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.08, // Reduced from 0.1
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      wireframe: true
    });
    
    heatDistortion = new THREE.Mesh(distortionGeometry, distortionMaterial);
    heatDistortion.position.set(0, 0, 6);
    heatDistortion.scale.set(0.1, 0.1, 0.1); // Start small
  }
  
  // Initialize atmospheric particles
  function initAtmosphericParticles() {
    particleGeometry = new THREE.BufferGeometry();
    particlePositions = new Float32Array(PARTICLE_SETTINGS.COUNT * 3);
    particleVelocities = new Float32Array(PARTICLE_SETTINGS.COUNT * 3);
    particleSizes = new Float32Array(PARTICLE_SETTINGS.COUNT);
    particleColors = new Float32Array(PARTICLE_SETTINGS.COUNT * 3);
    particleAge = new Float32Array(PARTICLE_SETTINGS.COUNT);
    
    // Initialize particles in a wider area around the ship
    for (let i = 0; i < PARTICLE_SETTINGS.COUNT; i++) {
      // Random position near the ship with some variation in distance
      const distance = 4 + Math.random() * 8.0; // Wider distribution
      const angle = Math.random() * Math.PI * 2;
      const pitch = (Math.random() - 0.5) * Math.PI * 0.8; // Limit vertical spread
      
      // Position using spherical coordinates for better distribution
      particlePositions[i * 3] = Math.cos(angle) * Math.cos(pitch) * distance; // x
      particlePositions[i * 3 + 1] = Math.sin(pitch) * distance; // y
      particlePositions[i * 3 + 2] = Math.sin(angle) * Math.cos(pitch) * distance - 20; // z
      
      // Initial velocities - streaking away from the ship
      const speed = PARTICLE_SETTINGS.MIN_SPEED + Math.random() * (PARTICLE_SETTINGS.MAX_SPEED - PARTICLE_SETTINGS.MIN_SPEED);
      
      // Use more consistent outward velocity patterns
      const velX = particlePositions[i * 3] * 0.2;
      const velY = particlePositions[i * 3 + 1] * 0.2;
      const velZ = particlePositions[i * 3 + 2] * 0.2 + speed * 3; // Stronger backward movement
      
      // Normalize and scale
      const mag = Math.sqrt(velX*velX + velY*velY + velZ*velZ);
      particleVelocities[i * 3] = (velX / mag) * speed;
      particleVelocities[i * 3 + 1] = (velY / mag) * speed;
      particleVelocities[i * 3 + 2] = (velZ / mag) * speed;
      
      // Smaller sizes for more delicate effect
      particleSizes[i] = PARTICLE_SETTINGS.SIZE_MIN + Math.random() * (PARTICLE_SETTINGS.SIZE_MAX - PARTICLE_SETTINGS.SIZE_MIN);
      
      // Initialize with cooler high-altitude colors - pale blues to white
      const blueAmount = 0.7 + Math.random() * 0.3; // More blue
      particleColors[i * 3] = 0.9; // Less red (pale)
      particleColors[i * 3 + 1] = 0.95; // High green (for cyan tint)
      particleColors[i * 3 + 2] = 1.0; // Full blue
      
      // Random starting age
      particleAge[i] = Math.random() * PARTICLE_SETTINGS.MAX_AGE;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    
    // Create enhanced particle material
    particleMaterial = new THREE.PointsMaterial({
      size: 1.0,
      vertexColors: true,
      transparent: true,
      opacity: 0.15, // Extremely low opacity
      blending: THREE.NormalBlending, // Change to normal blending instead of additive
      depthWrite: false,
      map: createParticleTexture(),
      sizeAttenuation: true
    });
    
    atmosphericParticles = new THREE.Points(particleGeometry, particleMaterial);
  }
  
  // Create a texture for engine flares
  function createFlareTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    
    const context = canvas.getContext('2d');
    if (!context) return null;
    
    // Create a fiery gradient
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.2, 'rgba(255, 220, 100, 0.7)');
    gradient.addColorStop(0.4, 'rgba(255, 140, 50, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
    
    // Add some texture for more interesting flares
    context.globalCompositeOperation = 'overlay';
    context.filter = 'blur(2px)';
    
    for (let i = 0; i < 5; i++) {
      const x = 10 + Math.random() * 12;
      const y = 10 + Math.random() * 12;
      const radius = 3 + Math.random() * 4;
      
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fillStyle = 'rgba(255, 255, 255, 0.3)';
      context.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }
  
  // Create a texture for afterburner flame
  function createAfterburnerTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    
    const context = canvas.getContext('2d');
    if (!context) return null;
    
    // Create an intense flame gradient
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.2, 'rgba(255, 230, 100, 0.6)');
    gradient.addColorStop(0.4, 'rgba(255, 120, 50, 0.4)');
    gradient.addColorStop(0.6, 'rgba(255, 20, 20, 0.2)');
    gradient.addColorStop(1, 'rgba(100, 20, 255, 0)');
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    
    // Add flame details
    context.globalCompositeOperation = 'screen';
    
    // Create flame streaks
    context.filter = 'blur(2px)';
    for (let i = 0; i < 8; i++) {
      const x1 = 32;
      const y1 = 32;
      const length = 20 + Math.random() * 12;
      const angle = Math.random() * Math.PI * 2;
      const x2 = x1 + Math.cos(angle) * length;
      const y2 = y1 + Math.sin(angle) * length;
      
      const gradient = context.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
      
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.lineWidth = 2 + Math.random() * 3;
      context.strokeStyle = gradient;
      context.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }
  
  // Create a texture for atmospheric particles
  function createParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32; // Smaller texture
    canvas.height = 32;
    
    const context = canvas.getContext('2d');
    if (!context) return null;
    
    // Clear the canvas first
    context.fillStyle = 'rgba(0, 0, 0, 0)';
    context.fillRect(0, 0, 32, 32);
    
    // Create a tiny sharp dot with minimal color
    const centerX = 16;
    const centerY = 16;
    
    // Create a simple small white point (with very slight tint)
    context.beginPath();
    context.arc(centerX, centerY, 1, 0, Math.PI * 2); // Tiny 1px radius dot
    context.fillStyle = 'rgba(230, 240, 255, 0.8)'; // Slightly blue-white with high alpha
    context.fill();
    
    // Add a slightly larger, much more transparent outer ring
    context.beginPath();
    context.arc(centerX, centerY, 2, 0, Math.PI * 2);
    context.fillStyle = 'rgba(200, 230, 255, 0.1)'; // Very transparent
    context.fill();
    
    // No blur, no additional effects - just a simple sharp point
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }
  
  // Get G-force from HUD data
  function getGForce() {
    return $hudState?.gForce || 1.0;
  }
  
  // Optimized engine effect updates
  function updateEngineEffects(speed: number, afterburnerPower: number) {
    if (!engineFlares || !afterburnerFlame) return;
    
    const time = Date.now() * 0.001;
    const effectiveThrust = Math.max(0.1, effectiveEnginePower);
    
    // Check if ship is stalled or near stalling
    const wasStalled = isStalled;
    isStalled = speed <= FLIGHT_MODEL.MIN_SPEED * 1.1;
    const isNearStall = speed > FLIGHT_MODEL.MIN_SPEED * 1.1 && speed <= FLIGHT_MODEL.MIN_SPEED * 1.3;
    
    // Check if we just entered a stall condition
    if (isStalled && !wasStalled) {
      stallTimeStart = Date.now();
      // Set auto-stabilization to kick in after a random delay (2-4 seconds)
      autoStabilizationDuration = 2000 + Math.random() * 2000;
    }
    
    // Handle auto-stabilization system
    handleAutoStabilization(speed, time);
    
    // Update colors and materials with stall effect
    updateEngineColors(afterburnerPower, effectiveThrust, isStalled, isNearStall, recoveryThrustActive);
    
    // Update flares every other frame for performance
    if (frameCount % 2 === 0) {
      updateEngineFlares(time, effectiveThrust, isStalled, isNearStall, recoveryThrustActive);
    }
    
    // Update afterburner - also show afterburner effect during recovery
    if ((afterburnerPower > 0.1 && !isStalled) || recoveryThrustActive) {
      const effectiveAfterburner = recoveryThrustActive ? recoveryThrust : afterburnerPower;
      updateAfterburner(time, effectiveAfterburner);
    } else {
      hideAfterburner();
    }
    
    // Update atmospheric particles
    updateAtmosphericParticles(speed);
    
    // Update HUD with stabilization info
    updateHudStabilizationInfo();
    
    // Increment frame counter
    frameCount++;
  }

  // Handle auto stabilization system
  function handleAutoStabilization(speed: number, time: number) {
    if (isStalled) {
      const currentTime = Date.now();
      const stallDuration = currentTime - stallTimeStart;
      
      // If stalled long enough, activate auto-stabilization
      if (stallDuration > autoStabilizationDuration && !isAutoStabilizing) {
        isAutoStabilizing = true;
        // Play activation sound effect
        // TODO: Add sound effect when audio system is implemented
      }
      
      // If auto-stabilization is active, increase the progress
      if (isAutoStabilizing) {
        // Gradually increase recovery from 0 to 1 over 2 seconds
        autoStabilizationProgress = Math.min(1.0, autoStabilizationProgress + 0.01);
        
        // Once we reach 30% progress, start applying recovery thrust
        if (autoStabilizationProgress > 0.3) {
          recoveryThrustActive = true;
          // Calculate recovery thrust (pulsing effect that increases over time)
          const pulseEffect = 0.5 + 0.5 * Math.sin(time * 6);
          const baseThrust = 0.2 + (autoStabilizationProgress - 0.3) * 1.2;
          recoveryThrust = baseThrust * (0.8 + pulseEffect * 0.2);
        }
      }
    } else if (isAutoStabilizing) {
      // If no longer stalled but was auto-stabilizing, gradually deactivate
      autoStabilizationProgress = Math.max(0, autoStabilizationProgress - 0.04);
      
      if (autoStabilizationProgress <= 0) {
        isAutoStabilizing = false;
        recoveryThrustActive = false;
        recoveryThrust = 0;
      } else if (autoStabilizationProgress < 0.3) {
        recoveryThrustActive = false;
        recoveryThrust = 0;
      }
    } else {
      // Reset all stabilization parameters when not in use
      autoStabilizationProgress = 0;
      recoveryThrustActive = false;
      recoveryThrust = 0;
    }
  }

  // Update HUD with stabilization info
  function updateHudStabilizationInfo() {
    if ($hudState) {
      $hudState.isAutoStabilizing = isAutoStabilizing;
      $hudState.autoStabilizationProgress = autoStabilizationProgress;
      $hudState.recoveryThrustActive = recoveryThrustActive;
    }
  }

  function updateEngineColors(afterburnerPower: number, effectiveThrust: number, isStalled: boolean = false, isNearStall: boolean = false, isRecovering: boolean = false) {
    const enginePulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.002);
    
    // Optimize color calculations
    let flareHue = afterburnerPower > 0.5 ? 
      0.02 + afterburnerPower * 0.01 : 
      0.06 + afterburnerPower * 0.02;
    
    let saturation = 0.8 + afterburnerPower * 0.2;
    let lightness = 0.5 + effectiveThrust * 0.3 + afterburnerPower * 0.2;
    
    // Modify engine colors based on state
    if (isRecovering) {
      // Recovery mode - electrical blue pulses
      const recoveryPhase = Date.now() * 0.01 % (Math.PI * 2);
      flareHue = 0.6 + Math.sin(recoveryPhase) * 0.05; // Blue-cyan flicker
      saturation = 0.9;
      lightness = 0.5 + recoveryThrust * 0.3 + Math.sin(recoveryPhase * 3) * 0.2;
    } else if (isStalled) {
      // When stalled, add flickering effect and change color to indicate problems
      const stallFlicker = 0.3 + Math.random() * 0.4; // Random intense flickering
      flareHue = 0.05; // More orange/red
      saturation *= 0.7; // Reduce saturation
      lightness *= stallFlicker; // Flicker the brightness
    } else if (isNearStall) {
      // Near stall - subtle pulsing to indicate approaching stall
      const nearStallPulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.01); // Slower pulse
      lightness *= nearStallPulse;
    }
    
    engineColor.setHSL(flareHue, saturation, lightness);
    
    if (flareMaterial) {
      flareMaterial.color.copy(engineColor);
      
      // Adjust size and opacity based on state
      let flareSize = 0.15 + effectiveThrust * 0.15 + afterburnerPower * 0.2;
      let flareOpacity = 0.3 + effectiveThrust * 0.3 + enginePulse * 0.1;
      
      if (isRecovering) {
        // Recovery mode - larger, pulsing flames
        const pulseFrequency = Date.now() * 0.008;
        const pulseFactor = 0.8 + Math.sin(pulseFrequency) * 0.2;
        flareSize = 0.25 + recoveryThrust * 0.3 * pulseFactor;
        flareOpacity = 0.4 + recoveryThrust * 0.4 * pulseFactor;
      } else if (isStalled) {
        // Stalled engines have smaller, flickering flares
        const stallFlicker = 0.2 + Math.random() * 0.6;
        flareSize *= 0.6 * stallFlicker;
        flareOpacity *= stallFlicker;
      } else if (isNearStall) {
        // Near stall - subtle size fluctuation
        const nearStallPulse = 0.8 + 0.2 * Math.sin(Date.now() * 0.015);
        flareSize *= nearStallPulse;
      }
      
      flareMaterial.size = flareSize;
      flareMaterial.opacity = flareOpacity;
    }
  }

  function updateEngineFlares(time: number, effectiveThrust: number, isStalled: boolean = false, isNearStall: boolean = false, isRecovering: boolean = false) {
    const positions = flareGeometry.attributes.position.array as Float32Array;
    const flutterSpeed = 10;
    
    // Update flares in batches
    for (let i = 0; i < ENGINE_PARTICLES.FLARE_COUNT; i++) {
      const enginePos = i < ENGINE_PARTICLES.FLARE_COUNT / 2 ? 
        ENGINE_POSITIONS.left : 
        ENGINE_POSITIONS.right;
      
      const index = i * 3;
      
      // Apply different flame behavior based on status
      let flutterX, flutterY, flutterZ;
      let offset;
      
      if (isRecovering) {
        // Auto-stabilization recovery: energetic, electrical flame patterns
        const recoveryPhase = time * 10 + i * 0.1;
        const recoveryPulse = Math.sin(recoveryPhase) * 0.5 + 0.5;
        
        flutterX = Math.sin(time * flutterSpeed * 3 + i * 543.21) * 0.15 * recoveryThrust;
        flutterY = Math.sin(time * flutterSpeed * 2.5 + i * 123.45) * 0.15 * recoveryThrust;
        flutterZ = Math.sin(time * flutterSpeed * 4 + i * 789.12) * 0.1 * recoveryThrust;
        
        // Additional electrical arcs during recovery
        if (Math.random() < 0.2) {
          const arcDirection = Math.random() * Math.PI * 2;
          const arcDistance = 0.2 + Math.random() * 0.3;
          flutterX += Math.cos(arcDirection) * arcDistance * recoveryPulse;
          flutterY += Math.sin(arcDirection) * arcDistance * recoveryPulse;
        }
        
        offset = 0.3 + 0.2 * recoveryThrust;
      } else if (isStalled) {
        // Stalled: erratic, sputtering flames
        const stallFactor = Math.random() < 0.3 ? 0.1 : 1.0; // 30% chance of drop out
        flutterX = Math.sin(time * flutterSpeed * 2 + i * 543.21) * 0.12 * stallFactor;
        flutterY = Math.sin(time * flutterSpeed * 1.5 + i * 123.45) * 0.12 * stallFactor;
        flutterZ = Math.sin(time * flutterSpeed * 2.5 + i * 789.12) * 0.08 * stallFactor;
        offset = 0.2 + 0.15 * effectiveThrust * stallFactor;
      } else if (isNearStall) {
        // Near stall: more uneven flames
        flutterX = Math.sin(time * flutterSpeed * 1.5 + i * 543.21) * 0.1 * effectiveThrust;
        flutterY = Math.sin(time * flutterSpeed * 1.3 + i * 123.45) * 0.1 * effectiveThrust;
        flutterZ = Math.sin(time * flutterSpeed * 1.7 + i * 789.12) * 0.07 * effectiveThrust;
        offset = 0.2 + 0.12 * effectiveThrust;
      } else {
        // Normal operation
        flutterX = Math.sin(time * flutterSpeed + i * 543.21) * 0.08 * effectiveThrust;
        flutterY = Math.sin(time * flutterSpeed + i * 123.45) * 0.08 * effectiveThrust;
        flutterZ = Math.sin(time * flutterSpeed + i * 789.12) * 0.05 * effectiveThrust;
        offset = 0.2 + 0.1 * effectiveThrust;
      }
      
      positions[index] = enginePos.x + flutterX + (Math.random() - 0.5) * offset;
      positions[index + 1] = enginePos.y + flutterY + (Math.random() - 0.5) * offset;
      positions[index + 2] = enginePos.z + flutterZ + Math.random() * 0.2 * (isRecovering ? recoveryThrust : effectiveThrust);
    }
    
    flareGeometry.attributes.position.needsUpdate = true;
  }

  function updateAfterburner(time: number, afterburnerPower: number) {
    if (!afterburnerMaterial || !afterburnerGeometry) return;
    
    // Update material properties
    afterburnerMaterial.opacity = Math.min(0.8, afterburnerPower * 1.6);
    
    const abHue = 0.01 + Math.max(0, 0.04 - afterburnerPower * 0.04);
    engineColor.setHSL(abHue, 0.9, 0.5 + afterburnerPower * 0.25);
    afterburnerMaterial.color.copy(engineColor);
    afterburnerMaterial.size = 0.25 + afterburnerPower * 0.3;
    
    // Update particles
    const positions = afterburnerGeometry.attributes.position.array as Float32Array;
    const maxLength = 2.5 + afterburnerPower * 3;
    
    // Update in batches
    const BATCH_SIZE = 40;
    for (let batch = 0; batch < ENGINE_PARTICLES.AFTERBURNER_COUNT; batch += BATCH_SIZE) {
      const endBatch = Math.min(batch + BATCH_SIZE, ENGINE_PARTICLES.AFTERBURNER_COUNT);
      updateAfterburnerBatch(positions, batch, endBatch, time, maxLength, afterburnerPower);
    }
    
    afterburnerGeometry.attributes.position.needsUpdate = true;
    
    // Update heat distortion
    if (heatDistortion) {
      updateHeatDistortion(time, afterburnerPower);
    }
  }

  function updateAfterburnerBatch(
    positions: Float32Array,
    start: number,
    end: number,
    time: number,
    maxLength: number,
    afterburnerPower: number
  ) {
    for (let i = start; i < end; i++) {
      const enginePos = i < ENGINE_PARTICLES.AFTERBURNER_COUNT / 2 ? 
        ENGINE_POSITIONS.left : 
        ENGINE_POSITIONS.right;
      
      const index = i * 3;
      const progress = (i % 10) / 10;
      const flamePhase = (time * 8 + i * 0.1) % 1;
      
      let currentLength = Math.min(maxLength, flamePhase * maxLength * 2);
      if (currentLength > maxLength) {
        currentLength = maxLength * 2 - currentLength;
      }
      
      const flameFlutter = 0.12 * afterburnerPower;
      const flutterX = Math.sin(time * 20 + i * 543.21) * flameFlutter;
      const flutterY = Math.sin(time * 15 + i * 123.45) * flameFlutter;
      
      const spread = Math.min(0.6, 0.15 + (currentLength / maxLength) * 0.45) * afterburnerPower;
      const angle = Math.random() * Math.PI * 2;
      
      positions[index] = enginePos.x + flutterX + Math.cos(angle) * spread * progress;
      positions[index + 1] = enginePos.y + flutterY + Math.sin(angle) * spread * progress;
      positions[index + 2] = enginePos.z + currentLength * progress;
    }
  }

  function updateHeatDistortion(time: number, afterburnerPower: number) {
    const distortionScale = 0.15 + afterburnerPower * 0.8;
    heatDistortion.scale.set(distortionScale, distortionScale, distortionScale);
    
    const geometry = heatDistortion.geometry as THREE.PlaneGeometry;
    const vertices = geometry.attributes.position.array as Float32Array;
    
    // Update vertices in batches
    const vertexCount = vertices.length / 3;
    const BATCH_SIZE = 50;
    
    for (let batch = 0; batch < vertexCount; batch += BATCH_SIZE) {
      const endBatch = Math.min(batch + BATCH_SIZE, vertexCount);
      updateDistortionBatch(vertices, batch, endBatch, time, afterburnerPower);
    }
    
    geometry.attributes.position.needsUpdate = true;
    (heatDistortion.material as THREE.MeshBasicMaterial).opacity = 0.04 + afterburnerPower * 0.1;
  }

  function updateDistortionBatch(
    vertices: Float32Array,
    start: number,
    end: number,
    time: number,
    afterburnerPower: number
  ) {
    for (let i = start; i < end; i++) {
      const index = i * 3;
      vertices[index] += Math.sin(time * 10 + i * 0.1) * 0.008 * afterburnerPower;
      vertices[index + 1] += Math.sin(time * 8 + i * 0.2) * 0.008 * afterburnerPower;
    }
  }

  function hideAfterburner() {
    if (afterburnerMaterial) {
      afterburnerMaterial.opacity = 0;
    }
    
    if (heatDistortion) {
      heatDistortion.scale.set(0.1, 0.1, 0.1);
      (heatDistortion.material as THREE.MeshBasicMaterial).opacity = 0.02;
    }
  }

  // Update atmospheric particles with improved effects
  function updateAtmosphericParticles(speed: number) {
    if (!atmosphericParticles) return;
    
    const time = Date.now() * 0.001;
    const deltaTime = 1/60;
    
    // Smooth transitions in speed factor
    targetSpeedFactor = PARTICLE_SETTINGS.SPEED_FACTOR * Math.max(1.0, speed / 30);
    currentSpeedFactor += (targetSpeedFactor - currentSpeedFactor) * PARTICLE_SETTINGS.SPEED_RESPONSE_LAG;
    
    // Effect of ship's rotation (simplified)
    const rotationEffectSum = Math.abs(rotationalVelocity.x) * 0.3 + 
                            Math.abs(rotationalVelocity.y) * 0.3 + 
                            Math.abs(rotationalVelocity.z) * 0.2;
    
    // Lower turbulence for smoother streaks
    const turbulenceFactor = Math.max(0.05, currentSpeedFactor * 0.2) * 
                            (1 + rotationEffectSum);
    
    // Calculate stretch factor based on speed
    const stretchFactor = Math.min(5, 1 + speed / 10) * PARTICLE_SETTINGS.STRETCH_FACTOR;
    
    for (let i = 0; i < PARTICLE_SETTINGS.COUNT; i++) {
      const idx = i * 3;
      
      // Update particle age
      particleAge[i] += deltaTime;
      
      // Cycle particles that are too old
      if (particleAge[i] > PARTICLE_SETTINGS.MAX_AGE) {
        resetParticle(i, speed);
        continue;
      }
      
      // Calculate normalized age (0-1)
      const normalizedAge = particleAge[i] / PARTICLE_SETTINGS.MAX_AGE;
      
      // Modify particle color based on age and speed
      updateParticleColor(i, idx, normalizedAge, speed);
      
      // Calculate particle size with streak effect based on speed
      const sizeProfile = Math.sin(normalizedAge * Math.PI);
      const baseSize = particleSizes[i] * (0.6 + sizeProfile * 0.4);
      
      // Adjust size based on speed for streaking effect
      particleSizes[i] = baseSize * (1 + (speed / 40) * stretchFactor);
      
      // Apply subtle turbulence - much gentler at high altitudes
      const turbX = Math.sin(time * 2.7 + i * 3.73) * PARTICLE_SETTINGS.TURBULENCE * turbulenceFactor;
      const turbY = Math.sin(time * 1.9 + i * 2.42) * PARTICLE_SETTINGS.TURBULENCE * turbulenceFactor;
      const turbZ = Math.sin(time * 3.3 + i * 1.31) * PARTICLE_SETTINGS.TURBULENCE * turbulenceFactor * 0.5;
      
      // Update position with velocity and minimal turbulence
      particlePositions[idx] += particleVelocities[idx] * currentSpeedFactor + turbX;
      particlePositions[idx + 1] += particleVelocities[idx + 1] * currentSpeedFactor + turbY;
      particlePositions[idx + 2] += particleVelocities[idx + 2] * currentSpeedFactor + turbZ;
      
      // Check if particle is too far from ship
      const distanceSquared = 
        particlePositions[idx] * particlePositions[idx] + 
        particlePositions[idx + 1] * particlePositions[idx + 1] + 
        (particlePositions[idx + 2] + 20) * (particlePositions[idx + 2] + 20);
      
      if (distanceSquared > 2000) {
        resetParticle(i, speed);
      }
    }
    
    // Update geometry
    particleGeometry.attributes.position.needsUpdate = true;
    particleGeometry.attributes.color.needsUpdate = true;
    particleGeometry.attributes.size.needsUpdate = true;
    
    // Adjust material appearance based on speed
    updateParticleMaterial(speed);
    
    // Store speed for next frame
    lastSpeed = speed;
  }
  
  // Helper function to reset a particle to a new starting position
  function resetParticle(index: number, speed: number) {
    const idx = index * 3;
    
    // Positioning logic - place around the ship with focus on wingtips and rear
    let posX, posY, posZ;
    
    // 70% of particles near wings/rear for better trail effect
    if (Math.random() < 0.7) {
      // Place near wings or rear
      const isRear = Math.random() < 0.4;
      
      if (isRear) {
        // Place behind the ship
        posX = (Math.random() - 0.5) * 3;
        posY = (Math.random() - 0.5) * 3;
        posZ = 5 + Math.random() * 2 - 20; // Behind the ship
      } else {
        // Place near wings
        const side = Math.random() < 0.5 ? -1 : 1;
        posX = side * (3 + Math.random());
        posY = (Math.random() - 0.5) * 1.5;
        posZ = (Math.random() - 0.5) * 4 - 20;
      }
    } else {
      // Random position around the ship
      const distance = 3 + Math.random() * 2.0;
      const angle = Math.random() * Math.PI * 2;
      const pitch = (Math.random() - 0.5) * Math.PI * 0.7;
      
      posX = Math.cos(angle) * Math.cos(pitch) * distance;
      posY = Math.sin(pitch) * distance;
      posZ = Math.sin(angle) * Math.cos(pitch) * distance - 20;
    }
    
    // Set the new position
    particlePositions[idx] = posX;
    particlePositions[idx + 1] = posY;
    particlePositions[idx + 2] = posZ;
    
    // Calculate new velocity
    const baseSpeed = PARTICLE_SETTINGS.MIN_SPEED + 
                   Math.random() * (PARTICLE_SETTINGS.MAX_SPEED - PARTICLE_SETTINGS.MIN_SPEED);
    const speedMultiplier = 1 + (speed / 30);
    
    // More streamlined velocity - mostly backward with slight outward component
    const dirX = posX * 0.2;
    const dirY = posY * 0.2;
    const dirZ = (posZ + 20) * 0.5 + baseSpeed * 5; // Stronger backward movement
    
    // Normalize and apply speed
    const mag = Math.sqrt(dirX*dirX + dirY*dirY + dirZ*dirZ);
    const finalSpeed = baseSpeed * speedMultiplier;
    
    particleVelocities[idx] = (dirX / mag) * finalSpeed;
    particleVelocities[idx + 1] = (dirY / mag) * finalSpeed;
    particleVelocities[idx + 2] = (dirZ / mag) * finalSpeed;
    
    // Reset size
    particleSizes[index] = PARTICLE_SETTINGS.SIZE_MIN + 
                        Math.random() * (PARTICLE_SETTINGS.SIZE_MAX - PARTICLE_SETTINGS.SIZE_MIN);
    
    // Reset age
    particleAge[index] = 0;
  }
  
  // Helper to update particle colors
  function updateParticleColor(index: number, idx: number, normalizedAge: number, speed: number) {
    // Much less colorful - closer to white/gray with slight tint
    if (afterburnerEffect > 0.3) {
      // Very subtle warmer tints during afterburner
      particleColors[idx] = 0.90; // Red 
      particleColors[idx + 1] = 0.92; // Green
      particleColors[idx + 2] = 0.97; // Blue still dominant but not full
    } else {
      // Normal high-altitude colors - even more subtle gradient
      const speedFactor = Math.min(1.0, speed / 60);
      
      // More neutral color, almost white with slight blue tint
      particleColors[idx] = 0.90; // Red 
      particleColors[idx + 1] = 0.93; // Green 
      particleColors[idx + 2] = 0.97; // Blue
    }
    
    // Stronger fade out for more natural appearance
    if (normalizedAge > 0.6) {
      const colorFade = (1.0 - normalizedAge) / 0.4; // Fade last 40% of life
      particleColors[idx] *= colorFade;
      particleColors[idx + 1] *= colorFade;
      particleColors[idx + 2] *= colorFade;
    }
  }
  
  // Helper to update particle material based on speed
  function updateParticleMaterial(speed: number) {
    if (!particleMaterial) return;
    
    // Extremely subtle visibility adjustment
    const baseOpacity = 0.15; // Very low base opacity
    const speedOpacity = Math.min(0.1, speed / 300); // Minimal increase with speed
    
    particleMaterial.opacity = baseOpacity + speedOpacity;
    
    // Adjust for afterburner - barely visible increase
    if (afterburnerEffect > 0.2) {
      particleMaterial.opacity = Math.min(0.3, particleMaterial.opacity + afterburnerEffect * 0.05);
    }
  }

  // Projectile pool and settings
  const MAX_PROJECTILES = 120; // Limit maximum number of active projectiles
  const PROJECTILE_LIFETIME = 2700; // Milliseconds
  const PROJECTILE_SPEED = 1.5; // Units per second
  const projectilePool: THREE.Mesh[] = []; // Pool of reusable projectiles
  // Add shot counter to track when to create tracer rounds
  let shotCounter = 0;

  // Trail particles pool for performance
  const MAX_TRAIL_PARTICLES = 90;
  const trailParticlePool: THREE.Mesh[] = [];

  // Change how projectiles are managed to make them independent from the ship's movement
  // Create a scene-level group for projectiles instead of attaching them to the minigun
  let projectilesWorldGroup: THREE.Group;

  // Initialize projectiles in world space 
  function initProjectilesGroup() {
    if (projectilesWorldGroup) return; // Already initialized
    
    projectilesWorldGroup = new THREE.Group();
    projectilesWorldGroup.name = "ProjectilesGroup";
    
    // Add the group to the scene directly rather than to the minigun
    if (!projectilesWorldGroup.parent) {
      // Access the scene from the ship
      if (ship && ship.parent) {
        ship.parent.add(projectilesWorldGroup);
      } else {
        console.error("Cannot access ship parent to add projectiles group");
      }
    }
  }

  // Create projectile bullet with optimized properties
  function createProjectile() {
    // Ensure projectiles group is initialized
    if (!projectilesWorldGroup) {
      initProjectilesGroup();
      
      // Check again - couldn't initialize
      if (!projectilesWorldGroup) {
        console.error("Failed to initialize projectiles group");
        return undefined;
      }
    }
    
    // Check if there's an available projectile in the pool
    let bullet: THREE.Mesh | undefined = undefined;
    
    // First try to reuse from pool
    for (let i = 0; i < projectilePool.length; i++) {
      const pooled = projectilePool[i];
      if (pooled.userData.active === false) {
        bullet = pooled;
        break;
      }
    }
    
    // If no reusable projectile found, create a new one if under limit
    if (!bullet) {
      if (projectilePool.length >= MAX_PROJECTILES) {
        // Recycle oldest projectile if at maximum
        bullet = projectilePool[0];
      } else {
        // Create new projectile
        const geometry = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 6);
        const material = new THREE.MeshStandardMaterial({ 
          color: 0xffff00,
          emissive: 0xffaa00,
          emissiveIntensity: 1.5,
          metalness: 0.7,
          roughness: 0.1
        });
        
        bullet = new THREE.Mesh(geometry, material);
        bullet.rotation.x = Math.PI / 2; // Point forward
        
        // Add tracking data to the bullet with world space velocity
        bullet.userData = {
          velocity: new THREE.Vector3(),
          worldVelocity: new THREE.Vector3(),
          createdAt: 0,
          active: false,
          isTracer: false
        };
        
        projectilePool.push(bullet);
      }
    }
    
    // Reset/reuse the projectile
    bullet.userData.active = true;
    bullet.userData.createdAt = Date.now();
    bullet.visible = true;
    
    // Determine if this should be a tracer round (every 5th shot)
    shotCounter++;
    const isTracer = shotCounter % 5 === 0;
    bullet.userData.isTracer = isTracer;
    
    // Apply tracer visuals if needed
    if (isTracer) {
      // Bright purple color for tracers
      if (bullet.material instanceof THREE.MeshStandardMaterial) {
        bullet.material.color.set(0xa020f0);     // Bright purple
        bullet.material.emissive.set(0x8000ff);  // Purple-blue emissive
        bullet.material.emissiveIntensity = 3.0; // More intense glow
        bullet.scale.set(1.2, 1.2, 1.2);         // Slightly larger
      }
    } else {
      // Reset to standard bullet appearance
      if (bullet.material instanceof THREE.MeshStandardMaterial) {
        bullet.material.color.set(0xffff00);     // Yellow
        bullet.material.emissive.set(0xffaa00);  // Orange-yellow emissive
        bullet.material.emissiveIntensity = 1.5; // Normal glow
        bullet.scale.set(1.0, 1.0, 1.0);         // Normal size
      }
    }
    
    return bullet;
  }
  
  // Handle firing the minigun
  function handleFiring(delta: number) {
    // Ensure projectilesWorldGroup is initialized
    if (!projectilesWorldGroup && ship && ship.parent) {
      initProjectilesGroup();
    }
    
    // Track continuous firing duration
    if (isFiring && currentAmmo > 0) {
      if (firingStartTime === 0) {
        // Started firing
        firingStartTime = Date.now();
      }
      
      // Update duration
      continuousFiringDuration = (Date.now() - firingStartTime) / 1000;
      
      // Calculate prolonged firing factor (0 to 1)
      // Only start applying after 1.8 seconds, then ramp up over the next 4 seconds
      if (continuousFiringDuration > 1.8) {
        // Ramp up from 0 to 1 between 1.8 and 5.8 seconds
        prolongedFiringFactor = Math.min(1.0, (continuousFiringDuration - 1.8) / 4.0);
      } else {
        prolongedFiringFactor = 0;
      }
    } else {
      // Reset when not firing
      firingStartTime = 0;
      continuousFiringDuration = 0;
      
      // Gradually decrease the effect when firing stops
      if (prolongedFiringFactor > 0) {
        prolongedFiringFactor = Math.max(0, prolongedFiringFactor - delta * 2.0);
      }
    }
    
    // Update barrel rotation regardless of firing state
    if (isFiring || barrelRotation > 0) {
      // Spin up/down based on firing state
      const targetRotation = isFiring ? BARREL_ROTATION_SPEED : 0;
      barrelRotation += (targetRotation - barrelRotation) * (isFiring ? 0.2 : 0.1);
      
      // Rotate the barrels
      if (minigunBarrels) {
        minigunBarrels.rotation.z += barrelRotation;
      }
    }
    
    // Update 3D crosshair visibility and position
    if (crosshair3D) {
      // Show crosshair when firing or when barrel is spinning up
      crosshair3D.visible = isFiring || barrelRotation > BARREL_ROTATION_SPEED * 0.3;
      
      if (crosshair3D.visible) {
        // Create pulsing effect when firing
        const pulseScale = isFiring ? 
          1 + Math.sin(Date.now() * 0.01) * 0.1 : 
          1;
        
        // Apply pulsing scale
        crosshair3D.scale.set(pulseScale, pulseScale, 1);
        
        // Make crosshair always face forward relative to the ship's rotation
        // We don't need to do anything special here because the crosshair
        // is attached to the minigun, which is attached to the ship
        
        // Add a subtle rotation for visual effect
        crosshair3D.rotation.z += delta * 0.2;
        
        // Adjust the color/opacity based on firing state
        crosshair3D.children.forEach(child => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
            // Make crosshair more visible when actively firing
            child.material.opacity = isFiring ? 0.9 : 0.6;
            
            // Add color pulsing when firing
            if (isFiring && child.name === 'dot') {
              const colorPulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.01);
              child.material.color.setRGB(1, 1 * colorPulse, 0);
            }
          }
        });
      }
    }
    
    // Handle muzzle flash - use a single light rather than per-projectile
    if (muzzleFlash) {
      if (isFiring && barrelRotation > BARREL_ROTATION_SPEED * 0.7 && currentAmmo > 0) {
        // Intensify muzzle flash with prolonged firing
        const flashIntensity = 2 + Math.random() * 3 + (prolongedFiringFactor * 6);
        
        // Random color variation - shift towards red/orange with prolonged firing
        let flashHue = 0.1 + Math.random() * 0.05;
        
        // Shift color towards red with prolonged firing (overheating effect)
        if (prolongedFiringFactor > 0) {
          flashHue = Math.max(0.02, flashHue - (prolongedFiringFactor * 0.08));
        }
        
        // Apply color and intensity
        const flashColor = new THREE.Color().setHSL(flashHue, 0.9, 0.7);
        muzzleFlash.color.copy(flashColor);
        muzzleFlash.intensity = flashIntensity;
        
        // Increase light distance with prolonged firing
        muzzleFlash.distance = 5 + (prolongedFiringFactor * 8);
        
        // Visual feedback on the minigun barrels - make them glow when firing for long periods
        if (prolongedFiringFactor > 0.3 && minigunBarrels) {
          // Apply heat effect to each barrel
          minigunBarrels.children.forEach(barrel => {
            if (barrel instanceof THREE.Mesh && 
                barrel.material instanceof THREE.MeshStandardMaterial) {
              // Gradually shift barrel color to indicate overheating
              const heatColor = new THREE.Color().setHSL(
                Math.max(0.05, 0.1 - prolongedFiringFactor * 0.1), // Shift from metallic to red-hot
                0.9, 
                0.4 + prolongedFiringFactor * 0.6  // Increase brightness
              );
              
              // Apply heat effects to barrels
              barrel.material.emissive.copy(heatColor);
              barrel.material.emissiveIntensity = prolongedFiringFactor * 1.5;
            }
          });
        } else if (minigunBarrels) {
          // Reset barrel appearance when not overheated
          minigunBarrels.children.forEach(barrel => {
            if (barrel instanceof THREE.Mesh && 
                barrel.material instanceof THREE.MeshStandardMaterial) {
              barrel.material.emissiveIntensity = 0;
            }
          });
        }
      } else {
        // Turn off when not firing
        muzzleFlash.intensity = 0;
        
        // Reset barrels
        if (minigunBarrels) {
          minigunBarrels.children.forEach(barrel => {
            if (barrel instanceof THREE.Mesh && 
                barrel.material instanceof THREE.MeshStandardMaterial) {
              barrel.material.emissiveIntensity = 0;
            }
          });
        }
      }
    }
    
    // Fire projectiles at specified rate if we have ammo
    if (isFiring && barrelRotation > BARREL_ROTATION_SPEED * 0.8 && currentAmmo > 0 && projectilesWorldGroup) {
      const currentTime = Date.now();
      const timeBetweenShots = 1000 / fireRate;
      
      if (currentTime - lastFireTime > timeBetweenShots) {
        // Consume ammo
        currentAmmo--;
        
        // Create and position new projectile
        const projectile = createProjectile();
        
        // Only proceed if we got a valid projectile
        if (projectile) {
          // Position at current active barrel
          const barrelIndex = Math.floor((minigunBarrels.rotation.z / (Math.PI * 2)) * 6) % 6;
          const angle = (barrelIndex / 6) * Math.PI * 2;
          const radius = 0.25;
          
          // Calculate local barrel position
          const localBarrelPos = new THREE.Vector3(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            2.6 // POSITIVE Z is forward with our minigun rotation
          );
          
          // Get the minigun's world position and orientation
          const minigunWorldPos = new THREE.Vector3();
          const minigunWorldQuat = new THREE.Quaternion();
          minigun.getWorldPosition(minigunWorldPos);
          minigun.getWorldQuaternion(minigunWorldQuat);
          
          // Calculate barrel position in world space
          const barrelWorldPos = localBarrelPos.clone().applyQuaternion(minigunWorldQuat).add(minigunWorldPos);
          
          // Get forward direction of the minigun in world space
          const forwardDir = new THREE.Vector3(0, 0, 1).applyQuaternion(minigunWorldQuat).normalize();
          
          // Set bullet position and rotation in world space
          projectile.position.copy(barrelWorldPos);
          projectile.quaternion.copy(minigunWorldQuat);
          
          // Apply gravity and initial velocity
          const bulletSpeed = PROJECTILE_SPEED;
          
          // Add slight randomization for more realistic weapon spread
          const spreadFactor = 0.01; // Controls spread amount
          const randomSpread = new THREE.Vector3(
            (Math.random() - 0.5) * spreadFactor,
            (Math.random() - 0.5) * spreadFactor, 
            (Math.random() - 0.5) * spreadFactor
          );
          
          // Create initial velocity with spread
          const initialVelocity = forwardDir.clone()
            .add(randomSpread)
            .normalize()
            .multiplyScalar(bulletSpeed);
          
          // Store velocity in world space
          projectile.userData.worldVelocity = initialVelocity.clone();
          
          // Add to world projectiles group
          if (!projectile.parent && projectilesWorldGroup) {
            projectilesWorldGroup.add(projectile);
          }
        }
        
        // Update last fire time
        lastFireTime = currentTime;
      }
    }
    
    // Update existing projectiles
    updateProjectiles(delta);
  }
  
  // Update existing projectiles with improved performance and realistic trajectory
  function updateProjectiles(delta: number) {
    if (!projectilesWorldGroup) return;
    
    const currentTime = Date.now();
    const GRAVITY = 0.0008; // Gravity constant for bullet drop
    
    // Update active projectiles
    for (let i = 0; i < projectilePool.length; i++) {
      const projectile = projectilePool[i];
      
      if (projectile.userData.active) {
        // Check if projectile lifetime is expired
        const age = currentTime - projectile.userData.createdAt;
        
        if (age > PROJECTILE_LIFETIME) {
          // Deactivate instead of removing - much more efficient
          projectile.userData.active = false;
          projectile.visible = false;
          continue;
        }
        
        // Apply gravity to velocity (only affects Y axis)
        projectile.userData.worldVelocity.y -= GRAVITY * delta * 60;
        
        // Move projectile using its world velocity
        const scaledVelocity = projectile.userData.worldVelocity.clone().multiplyScalar(delta * 60);
        projectile.position.add(scaledVelocity);
        
        // Gradually rotate the bullet to align with its trajectory for more realistic visual
        if (projectile.userData.worldVelocity.length() > 0.01) {
          const targetQuat = new THREE.Quaternion();
          targetQuat.setFromRotationMatrix(
            new THREE.Matrix4().lookAt(
              new THREE.Vector3(0, 0, 0),
              projectile.userData.worldVelocity.clone().normalize(),
              new THREE.Vector3(0, 1, 0)
            )
          );
          
          // Smooth rotation transition
          projectile.quaternion.slerp(targetQuat, 0.2);
        }

        // Add trailing effect for tracer rounds
        if (projectile.userData.isTracer) {
          // Only add trail particles after bullet has traveled a bit and at certain intervals
          if (age > 50 && (!projectile.userData.trailTimer || currentTime - projectile.userData.trailTimer > 30)) {
            addTracerTrail(projectile.position.clone());
            projectile.userData.trailTimer = currentTime;
          }
          
          // Pulsate tracer intensity for more dramatic effect
          if (projectile.material instanceof THREE.MeshStandardMaterial) {
            const pulseIntensity = 2.5 + Math.sin(age * 0.02) * 1.0;
            projectile.material.emissiveIntensity = pulseIntensity;
          }
        }
      }
    }
  }

  // Create tracer trail particles
  function addTracerTrail(position: THREE.Vector3) {
    // Don't create trails if there are no projectiles group
    if (!projectilesWorldGroup) return;
    
    // First, try to reuse an existing trail particle from the pool
    let trail: THREE.Mesh | undefined = undefined;
    
    for (let i = 0; i < trailParticlePool.length; i++) {
      const pooledTrail = trailParticlePool[i];
      if (!pooledTrail.userData.active) {
        trail = pooledTrail;
        break;
      }
    }
    
    // If no reusable trail found, create a new one if under limit
    if (!trail) {
      if (trailParticlePool.length >= MAX_TRAIL_PARTICLES) {
        // Recycle oldest trail if at maximum
        // Find the oldest trail based on creation time
        let oldestTrailIndex = 0;
        let oldestTime = Infinity;
        
        for (let i = 0; i < trailParticlePool.length; i++) {
          const pooledTrail = trailParticlePool[i];
          if (pooledTrail.userData.startTime < oldestTime) {
            oldestTime = pooledTrail.userData.startTime;
            oldestTrailIndex = i;
          }
        }
        trail = trailParticlePool[oldestTrailIndex];
      } else {
        // Create a new trail particle
        const trailGeometry = new THREE.SphereGeometry(0.03, 4, 4);
        const trailMaterial = new THREE.MeshBasicMaterial({
          color: 0xcc00ff,
          transparent: true,
          opacity: 0.8
        });
        
        trail = new THREE.Mesh(trailGeometry, trailMaterial);
        trail.userData = {
          active: false,
          startTime: 0,
          lifetime: 0
        };
        
        trailParticlePool.push(trail);
        projectilesWorldGroup.add(trail); // Add to world group
      }
    }
    
    // Position and activate the trail particle
    trail.position.copy(position);
    
    // Add some slight random variation to the trail position
    trail.position.x += (Math.random() - 0.5) * 0.04;
    trail.position.y += (Math.random() - 0.5) * 0.04;
    trail.position.z += (Math.random() - 0.5) * 0.04;
    
    // Randomize size for more interesting trail effect
    const sizeVariation = 0.8 + Math.random() * 0.4;
    trail.scale.set(sizeVariation, sizeVariation, sizeVariation);
    
    // Reset trail properties
    const startTime = Date.now();
    const lifetime = 300 + Math.random() * 200; // Random lifetime between 300-500ms
    
    trail.userData.active = true;
    trail.userData.startTime = startTime;
    trail.userData.lifetime = lifetime;
    
    if (trail.material instanceof THREE.MeshBasicMaterial) {
      trail.material.opacity = 0.8;
    }
    
    trail.visible = true;
  }
  
  // Update trail particles in the main animation loop
  function updateTrailParticles() {
    if (!projectilesWorldGroup) return;
    
    const currentTime = Date.now();
    
    for (let i = 0; i < trailParticlePool.length; i++) {
      const trail = trailParticlePool[i];
      
      if (trail.userData.active) {
        const age = currentTime - trail.userData.startTime;
        
        if (age > trail.userData.lifetime) {
          // Deactivate instead of removing
          trail.userData.active = false;
          trail.visible = false;
          continue;
        }
        
        // Fade out over time
        const normalizedAge = age / trail.userData.lifetime;
        const fadeOpacity = 0.8 * (1 - normalizedAge);
        
        // Apply fade
        if (trail.material instanceof THREE.MeshBasicMaterial) {
          trail.material.opacity = fadeOpacity;
        }
      }
    }
  }
  
  // Initialize on component creation
  initEngineEffects();
  initAtmosphericParticles();
  
  // Create minigun
  minigun = createMinigun();
  
  // Subscribe to HUD state to update effects
  $: if ($hudState) {
    const { speed, afterburnerEffect: afterburnerPower, isFiring: hudFiring } = $hudState;
    updateEngineEffects(speed, afterburnerPower);
    
    // Update firing state
    isFiring = hudFiring || false;
    
    // Update HUD with ammo info
    $hudState.ammoCount = ammoCount;
    $hudState.currentAmmo = currentAmmo;
    
    // Pass auto-stabilization and prolonged firing info to the updateShip function in cameraController
    (window as any).shipState = {
      isAutoStabilizing,
      autoStabilizationProgress,
      recoveryThrustActive,
      prolongedFiringFactor
    };
  }
  
  // Handle animation updates with Threlte
  let lastTime = Date.now();
  let animationFrameId: number;
  
  function onFrame() {
    const currentTime = Date.now();
    const delta = (currentTime - lastTime) / 1000; // Convert to seconds
    lastTime = currentTime;
    
    // Update minigun
    handleFiring(delta);
    
    // Update trail particles
    updateTrailParticles();
    
    // Continue animation
    animationFrameId = requestAnimationFrame(onFrame);
  }
  
  // Start animation loop
  onFrame();
  
  // Keep track of rotational changes to calculate rotational velocity
  $: {
    // Simple velocity calculation by tracking changes in rotation
    if (typeof rotationalVelocity === 'object') {
      const prevRotX = rotationalVelocity.x;
      const prevRotY = rotationalVelocity.y;
      const prevRotZ = rotationalVelocity.z;
      
      // Update with current values - this gives us a measure of how fast the ship is turning
      rotationalVelocity = {
        x: rotationX - prevRotX,
        y: rotationY - prevRotY,
        z: rotationZ - prevRotZ
      };
    }
  }

  // Create a simple minigun model with crosshair
  function createMinigun() {
    // Create a group to hold all minigun parts
    const minigunGroup = new THREE.Group();
    
    // Barrel housing (main cylinder)
    const barrelHousingGeometry = new THREE.CylinderGeometry(0.4, 0.4, 1.8, 16);
    const barrelHousingMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333, 
      metalness: 0.8,
      roughness: 0.2
    });
    const barrelHousing = new THREE.Mesh(barrelHousingGeometry, barrelHousingMaterial);
    barrelHousing.rotation.x = Math.PI / 2; // Rotate to point forward
    minigunGroup.add(barrelHousing);
    
    // Create barrels (6 smaller cylinders arranged in a circle)
    const barrelGeometry = new THREE.CylinderGeometry(0.07, 0.07, 2.5, 8);
    const barrelMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x666666, 
      metalness: 0.9,
      roughness: 0.3
    });
    
    // Create a group for rotating barrels
    minigunBarrels = new THREE.Group();
    minigunBarrels.position.set(0, 0, 1.0); // Position in front of housing
    
    // Position 6 barrels in a circle
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
      const radius = 0.25;
      
      barrel.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        0
      );
      
      barrel.rotation.x = Math.PI / 2; // Rotate to point forward
      minigunBarrels.add(barrel);
    }
    
    minigunGroup.add(minigunBarrels);
    
    // Add mounting bracket
    const mountGeometry = new THREE.BoxGeometry(0.8, 0.5, 0.4);
    const mountMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x444444, 
      metalness: 0.7,
      roughness: 0.4
    });
    const mount = new THREE.Mesh(mountGeometry, mountMaterial);
    mount.position.set(0, -0.4, -0.5);
    minigunGroup.add(mount);
    
    // Add muzzle flash light (initially off)
    muzzleFlash = new THREE.PointLight(0xffaa00, 0, 5, 2);
    muzzleFlash.position.set(0, 0, 2.5);
    minigunGroup.add(muzzleFlash);
    
    // Create the 3D crosshair
    crosshair3D = createCrosshair();
    minigunGroup.add(crosshair3D);
    
    return minigunGroup;
  }

  // Create a 3D crosshair that appears in front of the minigun
  function createCrosshair() {
    const crosshairGroup = new THREE.Group();
    
    // Position the crosshair in front of the minigun
    crosshairGroup.position.set(0, 0, 50); // 50 units in front
    
    // Create crosshair circle
    const circleGeometry = new THREE.RingGeometry(0.4, 0.5, 32);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x5cff8e, 
      transparent: true, 
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const circle = new THREE.Mesh(circleGeometry, material);
    circle.name = 'circle';
    crosshairGroup.add(circle);
    
    // Create horizontal and vertical lines
    const lineGeometry = new THREE.PlaneGeometry(1.5, 0.05);
    const horizontalLine = new THREE.Mesh(lineGeometry, material);
    horizontalLine.name = 'horizontalLine';
    crosshairGroup.add(horizontalLine);
    
    const verticalLine = new THREE.Mesh(lineGeometry, material);
    verticalLine.rotation.z = Math.PI / 2;
    verticalLine.name = 'verticalLine';
    crosshairGroup.add(verticalLine);
    
    // Add dot in the center
    const dotGeometry = new THREE.CircleGeometry(0.1, 16);
    const dotMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffff00, 
      transparent: true, 
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const dot = new THREE.Mesh(dotGeometry, dotMaterial);
    dot.position.z = 0.01; // Slightly in front to avoid z-fighting
    dot.name = 'dot';
    crosshairGroup.add(dot);
    
    // Set up for billboard behavior - we'll update its rotation in handleFiring
    crosshairGroup.userData.billboardMode = true;
    
    // Initially hide the crosshair
    crosshairGroup.visible = false;
    
    return crosshairGroup;
  }

  // Cleanup function to prevent memory leaks
  onDestroy(() => {
    // Clean up projectiles group
    if (projectilesWorldGroup && projectilesWorldGroup.parent) {
      projectilesWorldGroup.parent.remove(projectilesWorldGroup);
    }
    
    // Clear animation loop if needed
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  });

  // Update engine sound based on HUD state
  $: {
    if (engineAudio && audioListener) {
      // Calculate engine volume based on engine power and afterburner effect
      engineVolume = Math.min(1, 0.2 + enginePower * 0.5 + afterburnerEffect * 0.3);
      engineAudio.setVolume(engineVolume);
      
      // Calculate playback rate based on speed
      if ($hudState) {
        const speedFactor = Math.min(1, $hudState.speed / FLIGHT_MODEL.MAX_SPEED);
        enginePlaybackRate = 0.8 + speedFactor * 0.7 + afterburnerEffect * 0.5;
        engineAudio.setPlaybackRate(enginePlaybackRate);
      }
    }
    
    // Handle cooldown sound
    if (cooldownAudio && audioListener) {
      // Play cooldown sound only during afterburner cooldown
      if ($hudState?.isAfterburnerCooldown) {
        cooldownVolume = 0.7;
        if (!cooldownAudio.isPlaying) {
          cooldownAudio.play();
        }
      } else {
        // Fade out cooldown sound when not in cooldown
        if (cooldownVolume > 0) {
          cooldownVolume = Math.max(0, cooldownVolume - 0.05);
          if (cooldownVolume <= 0 && cooldownAudio.isPlaying) {
            cooldownAudio.stop();
          }
        }
      }
      cooldownAudio.setVolume(cooldownVolume);
    }
    
    // Handle minigun firing sound
    if (minigunAudio && audioListener) {
      // Play minigun sound when firing, stop when not firing
      if (isFiring && barrelRotation > BARREL_ROTATION_SPEED * 0.7 && currentAmmo > 0) {
        if (!minigunAudio.isPlaying) {
          minigunAudio.play();
        }
        
        // Adjust volume based on prolonged firing
        const baseVolume = 0.8;
        const prolongedBoost = prolongedFiringFactor * 0.2; // Increase volume slightly with prolonged firing
        minigunAudio.setVolume(baseVolume + prolongedBoost);
        
        // Adjust playback rate for slight variation
        const rateVariation = 0.95 + Math.random() * 0.1; // Small random variation between 0.95-1.05
        minigunAudio.setPlaybackRate(rateVariation);
      } else {
        if (minigunAudio.isPlaying) {
          minigunAudio.stop();
        }
      }
    }
  }

  // Export projectiles for hit detection
  export let projectiles: THREE.Object3D[] = [];

  // Sync projectiles with the pool for external hit detection
  useTask(() => {
    // Update the exported projectiles array with active projectiles from the pool
    const visibleProjectiles = projectilePool.filter(projectile => 
      projectile.userData.active && projectile.visible
    );
    
    // Update the exported array
    projectiles = visibleProjectiles;
  });
</script>

<!-- Ship Model -->
<T.Group 
  position={[ 0, 0, -20 ]}
  rotation={[rotationX, rotationY, rotationZ]}
  bind:ref={ship}
>
  <!-- Engine and cooldown sounds -->
  {#if audioListener}
    <PositionalAudio
      bind:ref={engineAudio}
      autoplay
      loop
      src="/sound/engine.mp3"
      refDistance={20}
      volume={0.5}
      listener={audioListener}
    />
    
    <PositionalAudio
      bind:ref={cooldownAudio}
      loop
      src="/sound/cooldown.mp3"
      refDistance={15}
      volume={0}
      listener={audioListener}
    />
  {/if}

  <!-- GLTF model -->
  {#if $gltf}
    <T is={$gltf.scene} scale={[0.5, 0.5, 0.5]} rotation={[0, 14.15, 0]} />
  {/if}
  
  <!-- Minigun -->
  {#if minigun}
    <T is={minigun} position={[0, -0.5, 0.5]} scale={[0.4, 0.4, 0.4]} rotation={[0, 3.14, -3.14]}>
      {#if audioListener}
        <PositionalAudio
          bind:ref={minigunAudio}
          loop
          src="/sound/minigun.mp3"
          refDistance={10}
          volume={0.8}
          listener={audioListener}
        />
      {/if}
    </T>
  {/if}
  
  <!-- Engine Flare Effects -->
  {#if engineFlares}
    <T is={engineFlares} />
  {/if}
  
  <!-- Afterburner Flame -->
  {#if afterburnerFlame}
    <T is={afterburnerFlame} />
  {/if}
  
  <!-- Heat Distortion Effect -->
  {#if heatDistortion}
    <T is={heatDistortion} />
  {/if}
  
  <!-- Right Engine Glow -->
  <T.PointLight 
    position={[0.8, 0, 5.5]} 
    color={engineColor}
    intensity={engineIntensity}
    distance={engineDistance}
    decay={1.5}
    bind:ref={rightEngine}
  />
  
  <!-- Left Engine Glow -->
  <T.PointLight 
    position={[-0.6, 0, 5.5]} 
    color={engineColor}
    intensity={engineIntensity}
    distance={engineDistance}
    decay={1.5}
    bind:ref={leftEngine}
  />
</T.Group>

<!-- Atmospheric Particles (outside the ship group so they don't rotate with it) -->
{#if atmosphericParticles}
    <T is={atmosphericParticles} />
{/if}