# Shooter System Refactoring Plan

## Current State
- Combat logic is scattered across multiple components
- Hit detection in demoAICombat.svelte 
- Projectile creation/firing in demoSpaceship.svelte
- Combat stats in hudStore.ts
- No centralized system for handling shooter mechanics
- Limited reusability across different game types
- Hardcoded values for damage, hitboxes, etc.

## Goals
1. Create a flexible, general-purpose shooter system as a Studio Engine extension
2. Centralize targeting, hitbox detection, and projectile management
3. Support different weapon types and combat scenarios
4. Make combat parameters easily configurable
5. Optimize performance for many simultaneous projectiles
6. Support different game types (FPS, space shooter, third-person, etc.)

## Implementation Plan

### 1. Create Shooter Extension Component

Create a `ShooterExtension.svelte` component that follows the Studio Engine extension pattern:

```svelte
<script lang="ts">
  import { useStudio } from '@threlte/studio/extend';
  import { ToolbarItem, Panel } from '@threlte/studio';
  
  // Extension scope
  const extensionScope = 'shooter';
  
  // Create the extension
  const { createExtension } = useStudio();
  
  const extension = createExtension({
    scope: extensionScope,
    state({ persist }) {
      return {
        // Global combat settings
        enabled: persist(true),
        debugMode: persist(false),
        hitEffectsEnabled: persist(true),
        soundEffectsEnabled: persist(true),
        
        // Projectile settings
        projectiles: persist({
          maxCount: 100,
          cullDistance: 1000,
          poolSize: 200,
          defaultLifetime: 5.0,
        }),
        
        // Weapon types
        weapons: persist({
          'default-gun': {
            name: 'Standard Gun',
            projectileSpeed: 150,
            fireRate: 8,
            damage: 18,
            energyUsage: 5,
            projectileModel: 'default',
            projectileScale: 1.0,
            spread: 0.02,
            recoil: 0.2,
            soundEffect: '/sound/gun.mp3',
            muzzleFlash: true
          },
          'laser': {
            name: 'Laser Beam',
            projectileSpeed: 300,
            fireRate: 5,
            damage: 25,
            energyUsage: 12,
            projectileModel: 'laser',
            projectileScale: 1.0,
            spread: 0.01,
            recoil: 0.1,
            soundEffect: '/sound/laser.mp3',
            muzzleFlash: true
          },
          'missile': {
            name: 'Homing Missile',
            projectileSpeed: 80,
            fireRate: 1,
            damage: 120,
            energyUsage: 35,
            projectileModel: 'missile',
            projectileScale: 1.0,
            spread: 0,
            recoil: 0.5,
            soundEffect: '/sound/missile.mp3',
            homingEnabled: true,
            homingStrength: 0.8,
            blastRadius: 20
          },
          // More weapon types
        }),
        
        // Team/faction settings for friend/foe identification
        teams: persist({
          player: {
            name: 'Player',
            canDamage: ['enemy', 'neutral'],
            color: '#00aaff'
          },
          enemy: {
            name: 'Enemy',
            canDamage: ['player', 'neutral'],
            color: '#ff3333'
          },
          neutral: {
            name: 'Neutral',
            canDamage: [],
            color: '#aaaaaa'
          },
          // More teams
        }),
        
        // Hit effect presets
        hitEffects: persist({
          default: {
            particleCount: 15,
            particleSize: 0.2,
            particleSpeed: 5,
            particleLifetime: 0.8,
            sound: '/sound/hit.mp3',
            soundVolume: 0.3
          },
          shield: {
            particleCount: 20,
            particleSize: 0.3,
            particleSpeed: 3,
            particleLifetime: 1.2,
            sound: '/sound/shield.mp3',
            soundVolume: 0.2
          },
          explosion: {
            particleCount: 50,
            particleSize: 0.5,
            particleSpeed: 8,
            particleLifetime: 2.0,
            sound: '/sound/explosion.mp3',
            soundVolume: 0.5
          }
          // More hit effect types
        }),
        
        // Combat stats presets
        combatStats: persist({
          fighter: {
            maxHealth: 100,
            healthRegen: 0,
            maxShield: 100,
            shieldRegen: 5,
            shieldRegenDelay: 3,
            invulnerabilityTime: 0.2
          },
          tank: {
            maxHealth: 300,
            healthRegen: 1,
            maxShield: 200,
            shieldRegen: 2,
            shieldRegenDelay: 5,
            invulnerabilityTime: 0.1
          },
          boss: {
            maxHealth: 2000,
            healthRegen: 5,
            maxShield: 1000,
            shieldRegen: 10,
            shieldRegenDelay: 8,
            invulnerabilityTime: 0.3
          }
          // More combat stat presets
        })
      };
    },
    actions: {
      // Weapon management
      createProjectile: (params) => {
        // Will be implemented in ShooterManager
        console.log('Create projectile called from extension', params);
      },
      
      registerWeapon: (weaponId, config) => {
        extension.state.weapons[weaponId] = config;
      },
      
      updateWeaponSetting: (weaponId, setting, value) => {
        if (extension.state.weapons[weaponId]) {
          extension.state.weapons[weaponId][setting] = value;
        }
      },
      
      // Team management
      setTeam: (objectId, teamId) => {
        // Will be implemented in ShooterManager
        console.log('Set team called from extension', objectId, teamId);
      },
      
      // Hit effect management
      createHitEffect: (type, position) => {
        // Will be implemented in ShooterManager
        console.log('Create hit effect called from extension', type, position);
      }
    }
  });
</script>

<!-- Extension UI -->
<ToolbarItem position="left">
  <Panel title="Shooter Settings">
    <!-- Combat and weapon controls would go here -->
  </Panel>
</ToolbarItem>

<slot />
```

### 2. Create Shooter Manager Component

Create a `ShooterManager.svelte` as the core component:

```svelte
<script lang="ts">
  import { T, useTask, useFrame } from '@threlte/core';
  import * as THREE from 'three';
  import { onMount, onDestroy } from 'svelte';
  
  // Import types
  import type { Projectile, CombatEntity, HitResult } from './shooterTypes';
  
  // Props
  export let enabled = true;
  export let debugMode = false;
  
  // Projectile management
  let projectilePool: Projectile[] = [];
  let activeProjectiles: Projectile[] = [];
  let projectileGroup: THREE.Group;
  
  // Entity registration
  let registeredEntities: Map<string, CombatEntity> = new Map();
  
  // Initialize projectile pool
  onMount(() => {
    initProjectilePool();
  });
  
  function initProjectilePool(size = 200) {
    projectilePool = Array(size).fill(null).map(() => ({
      id: crypto.randomUUID(),
      object: new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      ),
      active: false,
      direction: new THREE.Vector3(),
      speed: 0,
      lifeTime: 0,
      maxLifeTime: 5,
      damage: 0,
      sourceId: '',
      sourceTeam: '',
      targetId: '',
      homing: false,
      homingStrength: 0,
      blastRadius: 0
    }));
    
    // Add all objects to the group
    projectilePool.forEach(projectile => {
      projectile.object.visible = false;
      projectileGroup.add(projectile.object);
    });
  }
  
  // Register an entity in the combat system
  export function registerEntity(entity: CombatEntity) {
    registeredEntities.set(entity.id, entity);
  }
  
  // Unregister an entity
  export function unregisterEntity(entityId: string) {
    registeredEntities.delete(entityId);
  }
  
  // Create a projectile
  export function createProjectile(params: {
    position: THREE.Vector3,
    direction: THREE.Vector3,
    speed: number,
    damage: number,
    sourceId: string,
    sourceTeam: string,
    targetId?: string,
    homing?: boolean,
    homingStrength?: number,
    blastRadius?: number,
    lifeTime?: number,
    model?: string,
    scale?: number
  }) {
    // Find an available projectile from the pool
    const projectile = projectilePool.find(p => !p.active);
    
    if (!projectile) {
      console.warn('Projectile pool exhausted');
      return null;
    }
    
    // Configure the projectile
    projectile.active = true;
    projectile.object.position.copy(params.position);
    projectile.direction.copy(params.direction.normalize());
    projectile.speed = params.speed;
    projectile.damage = params.damage;
    projectile.sourceId = params.sourceId;
    projectile.sourceTeam = params.sourceTeam;
    projectile.targetId = params.targetId || '';
    projectile.homing = params.homing || false;
    projectile.homingStrength = params.homingStrength || 0;
    projectile.blastRadius = params.blastRadius || 0;
    projectile.lifeTime = 0;
    projectile.maxLifeTime = params.lifeTime || 5;
    
    // Make projectile visible
    projectile.object.visible = true;
    
    // Add to active projectiles
    activeProjectiles.push(projectile);
    
    return projectile;
  }
  
  // Handle hit detection and effects
  function processHit(entity: CombatEntity, projectile: Projectile): HitResult {
    // Skip if entity and projectile are from same team
    if (entity.teamId === projectile.sourceTeam) {
      return { hit: false };
    }
    
    // Skip if entity is invulnerable
    if (entity.invulnerable) {
      return { hit: false };
    }
    
    // Apply damage
    let shieldDamage = 0;
    let healthDamage = 0;
    
    // Apply to shield first if available
    if (entity.shield > 0) {
      shieldDamage = Math.min(entity.shield, projectile.damage);
      entity.shield -= shieldDamage;
      
      // Remaining damage goes to health
      if (shieldDamage < projectile.damage) {
        healthDamage = projectile.damage - shieldDamage;
        entity.health -= healthDamage;
      }
    } else {
      // Direct health damage
      healthDamage = projectile.damage;
      entity.health -= healthDamage;
    }
    
    // Update entity state
    entity.lastHitTime = performance.now() / 1000;
    entity.invulnerable = true;
    entity.invulnerableUntil = entity.lastHitTime + entity.invulnerabilityTime;
    
    // Check if destroyed
    const destroyed = entity.health <= 0;
    
    return {
      hit: true,
      shieldDamage,
      healthDamage,
      destroyed,
      position: projectile.object.position.clone(),
      hitType: entity.shield > 0 ? 'shield' : 'health'
    };
  }
  
  // Update projectiles and hit detection
  useFrame((_, delta) => {
    if (!enabled) return;
    
    // Update projectiles
    for (let i = activeProjectiles.length - 1; i >= 0; i--) {
      const projectile = activeProjectiles[i];
      
      // Update lifetime
      projectile.lifeTime += delta;
      
      // Remove if exceeded lifetime
      if (projectile.lifeTime >= projectile.maxLifeTime) {
        projectile.active = false;
        projectile.object.visible = false;
        activeProjectiles.splice(i, 1);
        continue;
      }
      
      // Update position
      const movement = projectile.direction.clone().multiplyScalar(projectile.speed * delta);
      projectile.object.position.add(movement);
      
      // Handle homing behavior
      if (projectile.homing && projectile.targetId) {
        const target = registeredEntities.get(projectile.targetId);
        if (target) {
          // Calculate direction to target
          const toTarget = new THREE.Vector3();
          target.object.getWorldPosition(toTarget);
          toTarget.sub(projectile.object.position).normalize();
          
          // Adjust direction based on homing strength
          projectile.direction.lerp(toTarget, projectile.homingStrength * delta);
          projectile.direction.normalize();
          
          // Update projectile orientation to face direction
          const lookAt = projectile.object.position.clone().add(projectile.direction);
          projectile.object.lookAt(lookAt);
        }
      }
      
      // Hit detection against entities
      let hit = false;
      registeredEntities.forEach(entity => {
        if (hit) return; // Skip if already hit something
        
        // Skip self hits
        if (entity.id === projectile.sourceId) return;
        
        // Get entity position and check distance
        const entityPos = new THREE.Vector3();
        entity.object.getWorldPosition(entityPos);
        
        const distance = projectile.object.position.distanceTo(entityPos);
        
        // Check collision with hitbox
        if (distance < entity.hitboxRadius) {
          // Process the hit
          const hitResult = processHit(entity, projectile);
          
          if (hitResult.hit) {
            hit = true;
            
            // Create hit effect
            if (hitResult.hitType === 'shield') {
              createHitEffect('shield', hitResult.position);
            } else {
              createHitEffect('default', hitResult.position);
            }
            
            // Handle entity destruction
            if (hitResult.destroyed) {
              createHitEffect('explosion', entityPos);
              entity.onDestroyed?.(projectile);
            } else {
              entity.onHit?.(hitResult, projectile);
            }
          }
        }
      });
      
      // Remove projectile if it hit something
      if (hit) {
        projectile.active = false;
        projectile.object.visible = false;
        activeProjectiles.splice(i, 1);
      }
    }
    
    // Update entity states
    registeredEntities.forEach(entity => {
      const currentTime = performance.now() / 1000;
      
      // Turn off invulnerability when time is up
      if (entity.invulnerable && currentTime >= entity.invulnerableUntil) {
        entity.invulnerable = false;
      }
      
      // Shield regeneration
      if (entity.shield < entity.maxShield && 
          currentTime - entity.lastHitTime > entity.shieldRegenDelay) {
        entity.shield = Math.min(
          entity.maxShield,
          entity.shield + entity.shieldRegen * delta
        );
      }
      
      // Health regeneration
      if (entity.health < entity.maxHealth && entity.healthRegen > 0) {
        entity.health = Math.min(
          entity.maxHealth,
          entity.health + entity.healthRegen * delta
        );
      }
    });
  });
  
  // Create hit effect
  function createHitEffect(type: string, position: THREE.Vector3) {
    // Implementation will depend on particle system
    console.log('Hit effect', type, 'at', position);
    // In a real implementation, this would spawn particles and play sound
  }
  
  // Clean up on destroy
  onDestroy(() => {
    // Clean up any resources
  });
</script>

<T.Group bind:ref={projectileGroup}>
  <!-- Projectiles will be managed here -->
</T.Group>

<!-- Debug visualization if enabled -->
{#if debugMode}
  <T.Group>
    {#each Array.from(registeredEntities.values()) as entity}
      <T.Mesh position={entity.object.position}>
        <T.SphereGeometry args={[entity.hitboxRadius, 16, 8]} />
        <T.MeshBasicMaterial color={entity.teamId === 'player' ? 0x00ff00 : 0xff0000} wireframe={true} transparent={true} opacity={0.3} />
      </T.Mesh>
    {/each}
  </T.Group>
{/if}

<slot />
```

### 3. Create Combat Entity Component

Create reusable component for entities that can participate in combat:

```svelte
<script lang="ts">
  import { T } from '@threlte/core';
  import * as THREE from 'three';
  import { getContext, onMount, onDestroy } from 'svelte';
  import type { CombatEntity, HitResult } from './shooterTypes';
  
  // Props
  export let id = crypto.randomUUID();
  export let teamId = 'default';
  export let hitboxRadius = 2;
  export let maxHealth = 100;
  export let health = maxHealth;
  export let maxShield = 0;
  export let shield = maxShield;
  export let shieldRegen = 0;
  export let shieldRegenDelay = 3;
  export let healthRegen = 0;
  export let invulnerabilityTime = 0.2;
  
  // Object reference
  export let object: THREE.Object3D;
  
  // Optional callbacks
  export let onHit: (result: HitResult, projectile: any) => void = () => {};
  export let onDestroyed: (projectile: any) => void = () => {};
  
  // Get the shooter manager from context
  const shooterManager = getContext('shooterManager');
  
  // Entity state
  let lastHitTime = 0;
  let invulnerable = false;
  let invulnerableUntil = 0;
  
  // Create the combat entity
  const combatEntity: CombatEntity = {
    id,
    object,
    teamId,
    hitboxRadius,
    health,
    maxHealth,
    shield,
    maxShield,
    shieldRegen,
    shieldRegenDelay,
    healthRegen,
    lastHitTime,
    invulnerable,
    invulnerableUntil,
    invulnerabilityTime,
    onHit,
    onDestroyed
  };
  
  // Register with shooter manager
  onMount(() => {
    shooterManager.registerEntity(combatEntity);
    
    // Keep entity updated
    $: {
      combatEntity.health = health;
      combatEntity.shield = shield;
      combatEntity.maxHealth = maxHealth;
      combatEntity.maxShield = maxShield;
    }
  });
  
  // Clean up on destroy
  onDestroy(() => {
    shooterManager.unregisterEntity(id);
  });
</script>

<slot />
```

### 4. Create Weapon Component

```svelte
<script lang="ts">
  import { T, useFrame } from '@threlte/core';
  import * as THREE from 'three';
  import { getContext } from 'svelte';
  
  // Props
  export let id = 'default-gun';
  export let sourceId: string;
  export let teamId = 'player';
  export let muzzlePosition: THREE.Object3D;
  export let targetingDirection: THREE.Vector3 | null = null;
  export let autoFire = false;
  export let firing = false;
  export let targetId: string | null = null;
  
  // Weapon specific properties
  export let projectileSpeed = 150;
  export let fireRate = 8;
  export let damage = 18;
  export let energyUsage = 5;
  export let spread = 0.02;
  export let recoil = 0.2;
  export let soundEffect = '/sound/gun.mp3';
  export let muzzleFlash = true;
  export let projectileModel = 'default';
  export let projectileScale = 1.0;
  export let homing = false;
  export let homingStrength = 0;
  export let blastRadius = 0;
  
  // Get the shooter manager from context
  const shooterManager = getContext('shooterManager');
  
  // State
  let lastFireTime = 0;
  let canFire = true;
  let currentEnergy = 100;
  
  // Muzzle flash state
  let flashVisible = false;
  let flashIntensity = 0;
  
  // Events
  export let onFire = () => {};
  export let onEnergyDepleted = () => {};
  
  // Update firing state
  useFrame((_, delta) => {
    const currentTime = performance.now() / 1000;
    
    // Update muzzle flash
    if (flashVisible) {
      flashIntensity -= delta * 10;
      if (flashIntensity <= 0) {
        flashVisible = false;
        flashIntensity = 0;
      }
    }
    
    // Check if enough time has passed for next shot
    if (!canFire && currentTime - lastFireTime > 1 / fireRate) {
      canFire = true;
    }
    
    // Auto fire if enabled
    if (autoFire && firing && canFire && currentEnergy >= energyUsage) {
      fireWeapon();
    }
  });
  
  // Fire the weapon
  function fireWeapon() {
    if (!canFire || currentEnergy < energyUsage) return;
    
    const currentTime = performance.now() / 1000;
    lastFireTime = currentTime;
    canFire = false;
    
    // Use energy
    currentEnergy -= energyUsage;
    
    // Get muzzle position
    const position = new THREE.Vector3();
    muzzlePosition.getWorldPosition(position);
    
    // Get direction
    let direction = new THREE.Vector3(0, 0, -1);
    if (targetingDirection) {
      direction.copy(targetingDirection);
    } else {
      muzzlePosition.getWorldDirection(direction);
      direction.negate(); // Typically models face -Z
    }
    
    // Apply spread
    if (spread > 0) {
      direction.x += (Math.random() - 0.5) * spread;
      direction.y += (Math.random() - 0.5) * spread;
      direction.z += (Math.random() - 0.5) * spread;
      direction.normalize();
    }
    
    // Create the projectile
    shooterManager.createProjectile({
      position,
      direction,
      speed: projectileSpeed,
      damage,
      sourceId,
      sourceTeam: teamId,
      targetId: targetId || undefined,
      homing,
      homingStrength,
      blastRadius,
      model: projectileModel,
      scale: projectileScale
    });
    
    // Show muzzle flash
    if (muzzleFlash) {
      flashVisible = true;
      flashIntensity = 1.0;
    }
    
    // Trigger onFire callback
    onFire();
    
    // Check if out of energy
    if (currentEnergy < energyUsage) {
      onEnergyDepleted();
    }
    
    return true;
  }
  
  // Export fire method
  export { fireWeapon as fire };
</script>

{#if muzzleFlash && flashVisible}
  <T.PointLight 
    position={[0, 0, 0]} 
    color="#ffaa33" 
    intensity={flashIntensity * 10} 
    distance={5} 
  />
{/if}

<slot />
```

### 5. Create Combat Types and Interfaces

```typescript
// shooterTypes.ts
import * as THREE from 'three';

export interface Projectile {
  id: string;
  object: THREE.Object3D;
  active: boolean;
  direction: THREE.Vector3;
  speed: number;
  lifeTime: number;
  maxLifeTime: number;
  damage: number;
  sourceId: string;
  sourceTeam: string;
  targetId?: string;
  homing: boolean;
  homingStrength: number;
  blastRadius: number;
}

export interface CombatEntity {
  id: string;
  object: THREE.Object3D;
  teamId: string;
  hitboxRadius: number;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  shieldRegen: number;
  shieldRegenDelay: number;
  healthRegen: number;
  lastHitTime: number;
  invulnerable: boolean;
  invulnerableUntil: number;
  invulnerabilityTime: number;
  onHit?: (result: HitResult, projectile: Projectile) => void;
  onDestroyed?: (projectile: Projectile) => void;
}

export interface HitResult {
  hit: boolean;
  shieldDamage?: number;
  healthDamage?: number;
  destroyed?: boolean;
  position?: THREE.Vector3;
  hitType?: 'shield' | 'health';
}

export interface WeaponConfig {
  name: string;
  projectileSpeed: number;
  fireRate: number;
  damage: number;
  energyUsage: number;
  projectileModel: string;
  projectileScale: number;
  spread: number;
  recoil: number;
  soundEffect: string;
  muzzleFlash: boolean;
  homing?: boolean;
  homingStrength?: number;
  blastRadius?: number;
}

export interface HitEffectConfig {
  particleCount: number;
  particleSize: number;
  particleSpeed: number;
  particleLifetime: number;
  sound: string;
  soundVolume: number;
}

export interface TeamConfig {
  name: string;
  canDamage: string[];
  color: string;
}
```

### 6. Integration Plan
1. Add ShooterExtension to the available Studio extensions
2. Create ShooterManager component for central projectile and hitbox management
3. Create CombatEntity component for targets and players 
4. Create Weapon component for standardized firing
5. Move code from demoAICombat, demoSpaceship into new components
6. Update existing components to use the new shooter system

### 7. Migration Steps
1. Create ShooterExtension.svelte in the extensions directory
2. Create shooter subdirectory for components
3. Implement ShooterManager.svelte
4. Implement CombatEntity.svelte 
5. Implement Weapon.svelte
6. Create shooterTypes.ts
7. Refactor demoAICombat.svelte to use the new system
8. Refactor demoSpaceship.svelte to use the new weapon system
9. Test thoroughly
10. Clean up old implementations

## Features for Future Enhancement
- Raycast weapons (lasers, beams)
- Weapon cooldown system
- Weapon heat management
- Ammo management
- Weapon upgrades and customization
- Advanced targeting systems (auto-aim, lead targeting)
- Advanced hit effects and decals
- Ricochet projectiles
- Status effects (stun, slow, damage over time)
- Crosshair and targeting UI

## Performance Considerations
- Object pooling for projectiles and effects
- Distance-based culling
- Optimized collision detection using octrees or spatial hashing
- Level of detail (LOD) for projectile models
- Batched rendering for multiple projectiles
- Particle system optimization 