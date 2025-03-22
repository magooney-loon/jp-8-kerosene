<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import { PositionalAudio } from '@threlte/extras';
  import * as THREE from 'three';
  import { aiState, hudState } from '$lib/demo/hudStore';
  import { onMount } from 'svelte';
  
  // Props
  export let aiShip: THREE.Group | undefined = undefined;
  export let playerProjectiles: THREE.Object3D[] = [];
  export let onDestroyed: () => void = () => {};
  
  // Sound state
  let soundEnabled = false;
  let hitAudio: THREE.PositionalAudio;
  let warningAudio: THREE.PositionalAudio;
  
  // Combat constants
  const COMBAT = {
    SHIELD_REGEN_RATE: 6,           // Shield regen per second
    SHIELD_REGEN_DELAY: 5,          // Seconds after hit before shield regen
    SHIELD_REGEN_THRESHOLD: 20,     // Shield starts regenerating when above this value
    INVULNERABILITY_TIME: 0.025,    // Seconds of invulnerability after a hit
    REPAIR_RATE: 9,                 // Health repair rate per second
    REPAIR_THRESHOLD: 10,           // Health level at which repair activates (percentage)
    CRITICAL_HEALTH_PERCENT: 15,    // Health threshold for critical damage (percentage)
    
    // Hit detection
    HIT_RADIUS: 2,                  // Radius for hit detection
    DAMAGE_PER_HIT: 18,             // Damage per hit
    HIT_CHECK_INTERVAL: 0.05        // Check interval
  };
  
  // Internal state tracking
  let lastHitTime = 0;
  let lastHitCheckTime = 0;
  let lastWarningTime = 0;
  let hitboxMesh: THREE.Mesh | null = null;
  let modelScale = 1; // Track the ship's scale factor
  
  // Initialize on mount
  onMount(() => {
    // Enable sound on first user interaction
    const enableSound = () => {
      soundEnabled = true;
      window.removeEventListener('click', enableSound);
      window.removeEventListener('keydown', enableSound);
    };
    
    window.addEventListener('click', enableSound);
    window.addEventListener('keydown', enableSound);
    
    // Make sure the aiState is initialized
    if (!$aiState.maxHealth) $aiState.maxHealth = 4000;
    if (!$aiState.maxShieldHealth) $aiState.maxShieldHealth = 2000;
    
    // Get model scale for hit detection
    if (aiShip) {
      modelScale = aiShip.scale.x || 1;
    }
  });
  
  // Check for hits and handle player's shots
  function checkForHits() {
    if (!aiShip || !$aiState || $aiState.isDestroyed || $aiState.invulnerable) return;
    
    // Current time for timing checks
    const currentTime = performance.now() / 1000;
    
    // Don't check too frequently
    if (currentTime - lastHitCheckTime < COMBAT.HIT_CHECK_INTERVAL) return;
    lastHitCheckTime = currentTime;
    
    // Don't process hits during invulnerability
    if (currentTime - lastHitTime <= COMBAT.INVULNERABILITY_TIME) return;
    
    // Get UFO position
    const ufoPosition = new THREE.Vector3();
    aiShip.getWorldPosition(ufoPosition);
    
    // Adjust hit radius for model scale
    const scaledHitRadius = COMBAT.HIT_RADIUS * modelScale;
    
    // Check all visible projectiles
    for (const projectile of playerProjectiles) {
      if (projectile.visible) {
        const projectilePosition = new THREE.Vector3();
        projectile.getWorldPosition(projectilePosition);
        
        const distance = projectilePosition.distanceTo(ufoPosition);
        
        // Direct hit detection based on actual distance with scale factor
        if (distance < scaledHitRadius) {
          applyHit(projectile);
          return;
        }
      }
    }
  }
  
  // Apply damage from a hit
  function applyHit(projectile: THREE.Object3D) {
    // Hide the projectile
    projectile.visible = false;
    
    // Play hit sound if available
    if (hitAudio && soundEnabled) {
      hitAudio.play();
    }
    
    // Make sure maxHealth and maxShieldHealth are properly set
    if (!$aiState.maxHealth) $aiState.maxHealth = 4000;
    if (!$aiState.maxShieldHealth) $aiState.maxShieldHealth = 2000;
    
    // Update hit state
    $aiState.isHit = true;
    $aiState.hitTime = performance.now() / 1000;
    $aiState.hitsReceived++;
    lastHitTime = $aiState.hitTime;
    
    // Replenish fuel on successful hit (20% of max fuel)
    if ($hudState) {
      const fuelGainPercent = 20;
      $hudState.fuelPercent = Math.min(100, $hudState.fuelPercent + fuelGainPercent);
    }
    
    // Apply damage to shield or health
    if ($aiState.shieldActive && $aiState.shieldHealth > 0) {
      // Damage shield
      $aiState.shieldHealth = Math.max(0, $aiState.shieldHealth - COMBAT.DAMAGE_PER_HIT);
      
      // If shield depleted, disable it
      if ($aiState.shieldHealth <= 0) {
        $aiState.shieldActive = false;
      }
    } else {
      // Direct damage to health
      $aiState.health = Math.max(0, $aiState.health - COMBAT.DAMAGE_PER_HIT);
      
      // Update critical damage state
      const healthPercent = ($aiState.health / $aiState.maxHealth) * 100;
      $aiState.criticalDamage = healthPercent <= COMBAT.CRITICAL_HEALTH_PERCENT;
      
      // Check for destruction
      if ($aiState.health <= 0) {
        destroyUFO(); // Call destroy function instead of just setting state
        return;
      }
    }
    
    // Apply temporary invulnerability
    $aiState.invulnerable = true;
  }
  
  // Handle UFO destruction
  function destroyUFO() {
    if (!$aiState || $aiState.isDestroyed) return;
    
    // Mark as destroyed
    $aiState.isDestroyed = true;
    $aiState.health = 0;
    $aiState.shieldHealth = 0;
    $aiState.shieldActive = false;
    
    // Play warning sound with more volume for destruction
    if (warningAudio && soundEnabled) {
      warningAudio.setVolume(0.25);
      warningAudio.play();
    }
    
    // Call the destruction callback
    onDestroyed();
    
    // Hide the ship after a delay
    setTimeout(() => {
      if (aiShip) {
        aiShip.visible = false;
      }
    }, 2000);
  }
  
  // Update repair systems
  function updateRepairSystems(delta: number) {
    if (!$aiState) return;
    
    const currentTime = performance.now() / 1000;
    
    // Shield regeneration
    if ($aiState.shieldHealth < $aiState.maxShieldHealth && 
        currentTime - lastHitTime > COMBAT.SHIELD_REGEN_DELAY &&
        $aiState.shieldHealth > COMBAT.SHIELD_REGEN_THRESHOLD) {
      
      // Start regenerating shield
      $aiState.shieldHealth = Math.min(
        $aiState.maxShieldHealth,
        $aiState.shieldHealth + delta * COMBAT.SHIELD_REGEN_RATE
      );
      
      // If shield has some charge, activate it
      if ($aiState.shieldHealth > COMBAT.SHIELD_REGEN_THRESHOLD) {
        $aiState.shieldActive = true;
      }
    }
    
    // Play warning sound when shield gets critically low
    const shieldPercent = ($aiState.shieldHealth / $aiState.maxShieldHealth) * 100;
    if (warningAudio && soundEnabled && shieldPercent <= 15 && shieldPercent > 0 && 
        currentTime - lastWarningTime > 3) {
      lastWarningTime = currentTime;
      warningAudio.setVolume(0.15);
      warningAudio.play();
    }
    
    // Self-repair system for health
    const healthPercent = ($aiState.health / $aiState.maxHealth) * 100;
    
    // Play warning sound when health gets critically low
    if (warningAudio && soundEnabled && healthPercent <= COMBAT.CRITICAL_HEALTH_PERCENT && 
        currentTime - lastWarningTime > 2) {
      lastWarningTime = currentTime;
      warningAudio.setVolume(0.15);
      warningAudio.play();
    }
    
    if ($aiState.health < $aiState.maxHealth && 
        healthPercent > COMBAT.REPAIR_THRESHOLD &&
        !$aiState.criticalDamage) {
      
      // Start repair process if not already active
      if (!$aiState.repairActive) {
        $aiState.repairActive = true;
        $aiState.repairProgress = 0;
      }
      
      // Progress repair
      if ($aiState.repairActive) {
        $aiState.repairProgress = Math.min(1.0, $aiState.repairProgress + delta * 0.05);
        
        // Apply repair after progress reaches 100%
        if ($aiState.repairProgress >= 1.0) {
          $aiState.health = Math.min(
            $aiState.maxHealth,
            $aiState.health + COMBAT.REPAIR_RATE
          );
          
          // Reset repair progress
          $aiState.repairProgress = 0;
        }
      }
    } else {
      // Reset repair if conditions not met
      $aiState.repairActive = false;
      $aiState.repairProgress = 0;
    }
    
    // Turn off invulnerability after delay
    if ($aiState.invulnerable && 
        currentTime - lastHitTime > COMBAT.INVULNERABILITY_TIME) {
      $aiState.invulnerable = false;
    }
    
    // Reset hit flag after a short period
    if ($aiState.isHit && 
        currentTime - $aiState.hitTime > 0.1) {
      $aiState.isHit = false;
    }
  }
  
  // Main update loop - run every frame
  useTask((delta) => {
    // Skip if destroyed or not initialized
    if (!aiShip || !$aiState || $aiState.isDestroyed) return;
    
    // Check for hits
    checkForHits();
    
    // Update repair systems
    updateRepairSystems(delta);
  });
</script>

{#if aiShip && soundEnabled}
  <!-- Add positional audio components to the scene -->
  <T.Group>
    <PositionalAudio
      bind:ref={hitAudio}
      src="/sound/hit.mp3"
      autoplay={false}
      volume={0.3}
      refDistance={10}
    />
    
    <PositionalAudio
      bind:ref={warningAudio}
      src="/sound/shield.mp3"
      autoplay={false}
      volume={0.1}
      refDistance={15}
    />
  </T.Group>
{/if}


