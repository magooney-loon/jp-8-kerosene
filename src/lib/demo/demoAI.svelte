<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import { GLTF, useDraco, PositionalAudio } from '@threlte/extras';
  import * as THREE from 'three';
  import { hudState, aiState } from '$lib/demo/hudStore';
  import DemoAICombat from '$lib/demo/demoAICombat.svelte';
  import { onMount } from 'svelte';
  
  // ======= Configuration Constants =======
  const CONFIG = {
    movement: {
      MIN_SAFE_DISTANCE: -30,
      AVOIDANCE_STRENGTH: 0.8,
      BASE_Z: -50,
      BASE_HEIGHT: 5,
      LERP_SPEED: {
        NORMAL: 0.03,
        EVASIVE: 0.05
      }
    },
    evasion: {
      DURATION: 4.0,
      COOLDOWN: 6.0,
      SIDE_DISTANCE: 25,
      CHANCE: 0.7,
      Z_OFFSET: -45
    },
    oscillation: {
      NORMAL: {
        X_FREQ: 0.3,
        X_AMP: 4,
        Y_FREQ: 0.2,
        Y_AMP: 1.5,
        Z_FREQ: 0.15,
        Z_AMP: 30
      },
      NOISE: {
        FREQ: { X: 2.1, Y: 1.7 },
        STRENGTH: 0.3
      }
    },
    rotation: {
      BANK_ANGLE: 0.3,
      NOISE_FACTOR: 0.01,
      NORMAL: {
        X_FREQ: 0.3,
        X_AMP: 0.08,
        Y_FREQ: 0.2,
        Y_AMP: 0.15,
        Z_FREQ: 0.4,
        Z_AMP: 0.08
      }
    },
    audio: {
      BASE_VOLUME: 0.15,
      DAMAGED_FACTOR: 0.7,
      FLUTTER_RANGE: 0.3
    }
  };

  // ======= Props =======
  export let offsetX = 0;
  export let offsetY = CONFIG.movement.BASE_HEIGHT;
  export let offsetZ = CONFIG.movement.BASE_Z;
  export let playerProjectiles: THREE.Object3D[] = [];

  // ======= State =======
  let aiShip: THREE.Group;
  let engineAudio: THREE.PositionalAudio;
  let soundEnabled = false;
  let time = 0;
  let noiseOffset = 0;
  
  // Evasive maneuver state
  let isEvading = false;
  let evadeTime = 0;
  let evadeDirection = 1;
  let canEvade = true;
  let evadeCooldown = 0;

  // ======= Utility Functions =======
  const calculateNoise = (time: number) => {
    const { FREQ, STRENGTH } = CONFIG.oscillation.NOISE;
    return Math.sin(time * FREQ.X) * Math.cos(time * FREQ.Y) * STRENGTH;
  };

  const calculateEvasiveMovement = (progress: number, noise: number) => {
    const evadeEase = 0.5 - 0.5 * Math.cos(progress * Math.PI);
    return {
      x: CONFIG.evasion.SIDE_DISTANCE * evadeDirection * evadeEase + noise,
      z: CONFIG.evasion.Z_OFFSET
    };
  };

  const calculateNormalMovement = (time: number, noise: number) => {
    const { NORMAL } = CONFIG.oscillation;
    return {
      x: Math.sin(time * NORMAL.X_FREQ) * NORMAL.X_AMP + noise,
      y: Math.sin(time * NORMAL.Y_FREQ) * NORMAL.Y_AMP + Math.cos(noiseOffset) * 0.5,
      z: CONFIG.movement.BASE_Z + Math.sin(time * NORMAL.Z_FREQ) * NORMAL.Z_AMP
    };
  };

  const updateRotation = (time: number, noise: number, evadeProgress = 0) => {
    const { NORMAL, NOISE_FACTOR, BANK_ANGLE } = CONFIG.rotation;
    const rotationNoise = noise * NOISE_FACTOR;
    const bankAngle = isEvading ? 
      -evadeDirection * BANK_ANGLE * Math.sin(Math.PI * evadeProgress) : 0;

    return {
      x: Math.sin(time * NORMAL.X_FREQ) * NORMAL.X_AMP + Math.sin(noiseOffset * 1.2) * 0.01,
      y: Math.sin(time * NORMAL.Y_FREQ) * NORMAL.Y_AMP + rotationNoise + bankAngle,
      z: Math.sin(time * NORMAL.Z_FREQ) * NORMAL.Z_AMP + rotationNoise
    };
  };

  // ======= Initialization =======
  onMount(() => {
    $aiState.health = 2000;
    $aiState.maxHealth = 2000;
    $aiState.shieldHealth = 1500;
    $aiState.maxShieldHealth = 2000;
    $aiState.shieldActive = true;
    $aiState.isHit = false;
    $aiState.hitTime = 0;
    $aiState.hitsReceived = 0;
    $aiState.isDestroyed = false;
    $aiState.damageEffect = 0;
    $aiState.criticalDamage = false;
    $aiState.invulnerable = false;
    $aiState.repairActive = false;
    $aiState.repairProgress = 0;

    const enableSound = () => {
      soundEnabled = true;
      window.removeEventListener('click', enableSound);
      window.removeEventListener('keydown', enableSound);
    };
    
    window.addEventListener('click', enableSound);
    window.addEventListener('keydown', enableSound);
  });

  // ======= Main Update Loop =======
  const virtualPosition = new THREE.Vector3(offsetX, offsetY, offsetZ);
  
  useTask((delta) => {
    if (!aiShip) return;
    
    const cappedDelta = Math.min(delta, 0.1);
    time += cappedDelta;
    noiseOffset += cappedDelta * 0.5;

    // Update evasion state and cooldowns
    if (!canEvade) {
      evadeCooldown -= cappedDelta;
      if (evadeCooldown <= 0) canEvade = true;
    }

    if ($aiState.isHit && !isEvading && canEvade && Math.random() < CONFIG.evasion.CHANCE) {
      isEvading = true;
      canEvade = false;
      evadeCooldown = CONFIG.evasion.COOLDOWN;
      evadeTime = CONFIG.evasion.DURATION;
      evadeDirection = Math.random() > 0.5 ? 1 : -1;
    }

    if (isEvading) {
      evadeTime -= cappedDelta;
      if (evadeTime <= 0) isEvading = false;
    }

    // Calculate movement
    virtualPosition.set(offsetX, offsetY, Math.abs(offsetZ));
    const noise = calculateNoise(noiseOffset);
    
    if (isEvading) {
      const progress = (CONFIG.evasion.DURATION - evadeTime) / CONFIG.evasion.DURATION;
      const evasiveMove = calculateEvasiveMovement(progress, noise);
      virtualPosition.x = evasiveMove.x;
      virtualPosition.z = evasiveMove.z;
    } else {
      const normalMove = calculateNormalMovement(time, noise);
      virtualPosition.x += normalMove.x;
      virtualPosition.y += normalMove.y;
      virtualPosition.z = normalMove.z;
    }

    // Apply collision avoidance
    if (virtualPosition.z > CONFIG.movement.MIN_SAFE_DISTANCE) {
      const avoidanceForce = (virtualPosition.z - CONFIG.movement.MIN_SAFE_DISTANCE) 
        * CONFIG.movement.AVOIDANCE_STRENGTH;
      virtualPosition.z = CONFIG.movement.MIN_SAFE_DISTANCE - avoidanceForce;
    }

    // Apply movement and rotation
    const lerpSpeed = isEvading ? 
      CONFIG.movement.LERP_SPEED.EVASIVE : 
      CONFIG.movement.LERP_SPEED.NORMAL;
    
    aiShip.position.lerp(virtualPosition, lerpSpeed);
    
    const evadeProgress = isEvading ? 
      (CONFIG.evasion.DURATION - evadeTime) / CONFIG.evasion.DURATION : 0;
    const rotation = updateRotation(time, noise, evadeProgress);
    
    Object.assign(aiShip.rotation, {
      x: rotation.x,
      y: rotation.y,
      z: rotation.z
    });

    // Update audio
    if (engineAudio && !$aiState.isDestroyed) {
      const { BASE_VOLUME, DAMAGED_FACTOR, FLUTTER_RANGE } = CONFIG.audio;
      const healthFactor = $aiState.criticalDamage ? DAMAGED_FACTOR : 1.0;
      let volume = BASE_VOLUME * healthFactor;
      
      if ($aiState.criticalDamage) {
        volume *= (0.85 + Math.random() * FLUTTER_RANGE);
      }
      
      engineAudio.setVolume(volume);
    }
  });
</script>

<!-- ======= UFO Model and Effects ======= -->
<T.Group bind:ref={aiShip}>
  <T.Group>
    <GLTF 
      url="/demo/ufo.glb"
      scale={[-0.05, 0.05, 0.05]}
      rotation={[0, Math.PI, 0]}
      dracoLoader={useDraco()}
      opacity={1}
      transparent={true}
    />
    
    <!-- Light Effects -->
    <T.PointLight 
      position={[0, 0, 0]} 
      color="#3070FF" 
      intensity={12 + Math.sin(time * 5) * 3} 
      distance={20} 
    />
    
    <T.PointLight 
      position={[0, -0.7, 0]} 
      color="#40A0FF" 
      intensity={8 + Math.sin(time * 3) * 2} 
      distance={15} 
    />
    
    <T.PointLight position={[1.2, -0.5, 0]} color="#60FFFF" intensity={5} distance={8} />
    <T.PointLight position={[-1.2, -0.5, 0]} color="#60FFFF" intensity={5} distance={8} />
    
    <!-- Energy Fields -->
    <T.Mesh position={[0, -0.5, 0]} rotation={[Math.PI/2, 0, 0]}>
      <T.RingGeometry args={[2.2, 3, 32]} />
      <T.MeshStandardMaterial 
        color="#000033" 
        emissive="#4080FF" 
        emissiveIntensity={2.5 + Math.sin(time * 2) * 0.5} 
        transparent={true} 
        opacity={0.6 + Math.sin(time * 2) * 0.2} 
        side={2}
      />
    </T.Mesh>
    
    <T.Mesh position={[0, -0.6, 0]} rotation={[Math.PI/2, 0, 0]}>
      <T.RingGeometry args={[1.5, 2, 32]} />
      <T.MeshStandardMaterial 
        color="#000055" 
        emissive="#60C0FF" 
        emissiveIntensity={3.0 + Math.cos(time * 3) * 0.7} 
        transparent={true} 
        opacity={0.8} 
        side={2}
      />
    </T.Mesh>
    
    <!-- Audio -->
    {#if soundEnabled}
      <PositionalAudio
        bind:ref={engineAudio}
        src="/sound/ufo.mp3"
        loop={true}
        volume={CONFIG.audio.BASE_VOLUME}
        refDistance={20}
        autoplay={true}
        directionalCone={{
          coneInnerAngle: 180,
          coneOuterAngle: 320,
          coneOuterGain: 0.4
        }}
      />
    {/if}
  </T.Group>
</T.Group>

<DemoAICombat 
  aiShip={aiShip} 
  playerProjectiles={playerProjectiles}
  onDestroyed={() => {
    console.log('UFO destroyed!');
  }}
/>
