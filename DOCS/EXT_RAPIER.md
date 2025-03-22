# Physics Engine Extension Plan (Using Rapier.js)

## Current State
- Advanced flight physics in cameraController.ts
- Rigid body dynamics in demoSpaceship.svelte
- Auto-stabilization system
- G-force calculations
- Inertia and momentum handling
- Collision detection for projectiles

## Goals
1. Create a unified physics engine extension using Rapier.js
2. Port existing flight model to Rapier.js
3. Support multiple physics models (spacecraft, vehicles, characters)
4. Provide high-performance collision detection and response
5. Enable physics-based animations and effects

## Implementation Plan

### 1. Core Physics Engine Component

Create a `PhysicsEngineExtension.svelte` component that wraps Rapier.js:

```typescript
import RAPIER from '@dimforge/rapier3d';

interface PhysicsConfig {
  gravity: { x: number; y: number; z: number };
  timeStep: number;
  debugRender: boolean;
}

// Our wrapper around Rapier's physics world
class PhysicsWorld {
  private world: RAPIER.World;
  private bodies: Map<string, RAPIER.RigidBody>;
  private colliders: Map<string, RAPIER.Collider>;
  private debugRenderPipeline?: RAPIER.DebugRenderPipeline;

  constructor(config: PhysicsConfig) {
    // Initialize Rapier world with gravity
    this.world = new RAPIER.World(config.gravity);
    this.bodies = new Map();
    this.colliders = new Map();

    if (config.debugRender) {
      this.debugRenderPipeline = new RAPIER.DebugRenderPipeline();
    }
  }

  update(delta: number) {
    this.world.step();
    // Additional custom update logic
  }

  // Debug rendering helper
  debugRender() {
    if (!this.debugRenderPipeline) return null;
    return this.world.debugRender();
  }
}
```

### 2. Physics Models

Create specialized physics models using Rapier's rigid body system:

#### Aircraft Model (F-16)
```typescript
class F16PhysicsModel {
  private rigidBody: RAPIER.RigidBody;
  private collider: RAPIER.Collider;

  constructor(world: RAPIER.World, params: F16Params) {
    // Create dynamic rigid body for aircraft
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, 0, 0)
      .setLinearDamping(0.1)
      .setAngularDamping(0.1);
    
    this.rigidBody = world.createRigidBody(bodyDesc);

    // Create collider for aircraft
    const colliderDesc = RAPIER.ColliderDesc.capsule(1.0, 0.5)
      .setFriction(0.7)
      .setRestitution(0.3);
    
    this.collider = world.createCollider(colliderDesc, this.rigidBody);
  }

  update(controls: ShipControls, delta: number) {
    // Port existing F-16 flight model logic to work with Rapier
    // Apply forces and torques through Rapier's physics system
  }
}
```

### 3. Integration with Rapier Features

1. Rigid Bodies
   - Dynamic bodies for vehicles and characters
   - Static bodies for terrain and structures
   - Kinematic bodies for platforms and moving objects

2. Colliders
   - Compound shapes for complex objects
   - Triggers for gameplay events
   - Collision groups and filters

3. Joints
   - Revolute joints for wheels
   - Spherical joints for character limbs
   - Fixed joints for structural connections

4. Character Controller
   - Use Rapier's KinematicCharacterController
   - Custom character movement logic
   - Collision response and sliding

### 4. Debug Visualization

Utilize Rapier's built-in debug rendering:

```typescript
function renderDebug(world: RAPIER.World) {
  const { vertices, colors } = world.debugRender();
  
  // Render debug lines using Three.js
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
  
  const material = new THREE.LineBasicMaterial({ vertexColors: true });
  return new THREE.LineSegments(geometry, material);
}
```

### 5. Integration Plan

1. Setup and Configuration
   ```typescript
   // package.json
   {
     "dependencies": {
       "@dimforge/rapier3d": "latest"
     }
   }
   ```

2. World Initialization
   ```typescript
   import('@dimforge/rapier3d').then(RAPIER => {
     const gravity = { x: 0.0, y: -9.81, z: 0.0 };
     const world = new RAPIER.World(gravity);
     // Initialize physics world
   });
   ```

3. Migration Steps
   1. Port F-16 flight model to use Rapier's physics
   2. Update collision detection to use Rapier's system
   3. Implement character controllers using Rapier
   4. Add physics debug visualization
   5. Test and optimize performance

### 6. Performance Optimizations

1. Broad Phase
   - Use Rapier's optimized broad phase
   - Configure collision groups appropriately

2. Memory Management
   - Reuse rigid bodies and colliders
   - Pool temporary vectors and matrices

3. Threading
   - Use Web Workers for physics computation
   - Maintain deterministic simulation

## Features for Future Enhancement

1. Vehicle Physics
   - Wheel colliders and suspension
   - Engine and transmission simulation
   - Aerodynamics integration

2. Character Physics
   - Ragdoll systems
   - Physical animation blending
   - Dynamic obstacle traversal

3. Advanced Features
   - Continuous collision detection
   - Soft body simulation
   - Destructible objects
   - Particle effects

## Integration with Other Extensions

1. Player/Camera Extension
   - Physics-driven camera movement
   - Impact reactions
   - View frustum optimization

2. Input Controller
   - Force feedback
   - Physics-based input response
   - Predictive collision avoidance

3. HUD System
   - Physics state visualization
   - Performance metrics
   - Debug overlays

4. Level System
   - Physical environment setup
   - Dynamic object spawning
   - Physics-based triggers and events

## References
- [Rapier.js Documentation](https://rapier.rs/javascript3d/index.html)
- [Getting Started with Rapier.js](https://rapier.rs/docs/user_guides/javascript/getting_started_js) 