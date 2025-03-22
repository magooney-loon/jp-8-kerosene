# Player Camera System Refactoring Plan

## Current State
- Complex camera controller in cameraController.ts (1600+ lines)
- Ship controls and physics mixed together with camera movement
- Ship state management embedded in the controller
- Limited configurability for different game styles
- Hard to reuse for different game types
- No separation between player controls and camera behavior

## Goals
1. Create a modular player/camera system as a Studio Engine extension
2. Separate player controls from camera behavior
3. Support different player types (spaceship, FPS, third-person, etc.)
4. Make all parameters configurable
5. Allow for easy swapping between control schemes
6. Provide presets for common game types

## Implementation Plan

### 1. Create Player Camera Extension Component

Create a `PlayerCameraExtension.svelte` component that follows the Studio Engine extension pattern:

```svelte
<script lang="ts">
  import { useStudio } from '@threlte/studio/extend';
  import { ToolbarItem, Panel } from '@threlte/studio';
  
  // Extension scope
  const extensionScope = 'player-camera';
  
  // Create the extension
  const { createExtension } = useStudio();
  
  const extension = createExtension({
    scope: extensionScope,
    state({ persist }) {
      return {
        // Active control scheme
        activeControlScheme: persist('spacecraft'),
        
        // Camera settings
        camera: persist({
          fov: 75,
          near: 0.1,
          far: 10000,
          damping: 0.05,
          lookAhead: true,
          lookAheadFactor: 0.2,
          shake: {
            enabled: true,
            maxIntensity: 0.3,
            dampingFactor: 0.95
          }
        }),
        
        // Control schemes
        controlSchemes: persist({
          spacecraft: {
            name: 'Spacecraft',
            type: 'six-dof',
            keyBindings: {
              thrust: 'KeyW',
              reverse: 'KeyS',
              roll_left: 'KeyA',
              roll_right: 'KeyD',
              yaw_left: 'ArrowLeft',
              yaw_right: 'ArrowRight',
              pitch_up: 'ArrowUp',
              pitch_down: 'ArrowDown',
              boost: 'ShiftLeft',
              fire: 'Space',
              stabilize: 'KeyX'
            },
            physics: {
              mass: 1000,
              drag: 0.03,
              angularDrag: 0.1,
              maxSpeed: 300,
              acceleration: 50,
              rotationSpeed: 1.0,
              boostMultiplier: 2.5,
              boostFuelConsumption: 15,
              gForceLimit: 10
            },
            camera: {
              position: [0, 1.5, 8],
              lookAt: [0, 0, -1],
              offsetFromPlayer: true,
              followDistance: 8,
              height: 1.5,
              damping: 0.05,
              fov: 75
            }
          },
          
          fps: {
            name: 'First Person',
            type: 'fps',
            keyBindings: {
              forward: 'KeyW',
              backward: 'KeyS',
              left: 'KeyA',
              right: 'KeyD',
              jump: 'Space',
              sprint: 'ShiftLeft',
              crouch: 'ControlLeft',
              fire: 'Mouse0'
            },
            physics: {
              height: 1.8,
              walkSpeed: 5,
              runSpeed: 10,
              jumpForce: 8,
              gravity: 20,
              mouseSensitivity: 0.002
            },
            camera: {
              position: [0, 1.7, 0],
              fov: 80,
              headBobEnabled: true,
              headBobFrequency: 10,
              headBobAmplitude: 0.05
            }
          },
          
          thirdPerson: {
            name: 'Third Person',
            type: 'third-person',
            keyBindings: {
              forward: 'KeyW',
              backward: 'KeyS',
              left: 'KeyA',
              right: 'KeyD',
              jump: 'Space',
              sprint: 'ShiftLeft',
              crouch: 'ControlLeft',
              fire: 'Mouse0'
            },
            physics: {
              height: 1.8,
              walkSpeed: 5,
              runSpeed: 8,
              jumpForce: 7,
              gravity: 20,
              rotationSpeed: 10
            },
            camera: {
              followDistance: 5,
              height: 2,
              damping: 0.1,
              minZoom: 2,
              maxZoom: 10,
              collisionDetection: true
            }
          },
          
          // More control schemes can be added
        }),
        
        // Debug settings
        debug: persist({
          showPhysicsBody: false,
          showTrajectory: false,
          logState: false
        })
      };
    },
    actions: {
      // Change active control scheme
      setControlScheme: (schemeId) => {
        extension.state.activeControlScheme = schemeId;
      },
      
      // Update camera settings
      updateCameraSetting: (path, value) => {
        const keys = path.split('.');
        let current = extension.state.camera;
        
        for (let i = 0; i < keys.length - 1; i++) {
          current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
      },
      
      // Update control scheme settings
      updateControlSchemeSetting: (schemeId, path, value) => {
        if (!extension.state.controlSchemes[schemeId]) return;
        
        const keys = path.split('.');
        let current = extension.state.controlSchemes[schemeId];
        
        for (let i = 0; i < keys.length - 1; i++) {
          current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
      },
      
      // Create new control scheme based on existing one
      createControlScheme: (newId, basedOnId) => {
        if (!extension.state.controlSchemes[basedOnId]) return;
        
        extension.state.controlSchemes[newId] = {
          ...JSON.parse(JSON.stringify(extension.state.controlSchemes[basedOnId])),
          name: `Custom ${extension.state.controlSchemes[basedOnId].name}`
        };
      }
    }
  });
</script>

<!-- Extension UI -->
<ToolbarItem position="left">
  <Panel title="Player & Camera">
    <!-- Player and camera controls will go here -->
  </Panel>
</ToolbarItem>

<slot />
```

### 2. Create Player Controller Component

Create a `PlayerController.svelte` as the core component:

```svelte
<script lang="ts">
  import { T, useFrame, useThree } from '@threlte/core';
  import * as THREE from 'three';
  import { getContext, onMount, onDestroy, setContext } from 'svelte';
  
  // Import types
  import type { ControlScheme, ControlInput, PlayerState } from './playerTypes';
  
  // Props
  export let controlScheme: ControlScheme = 'spacecraft';
  export let config = {
    physics: {},
    camera: {},
    keyBindings: {}
  };
  export let initialPosition = [0, 0, 0];
  export let initialRotation = [0, 0, 0];
  
  // Get three.js context
  const { scene, camera } = useThree();
  
  // Player state
  let playerState: PlayerState = {
    position: new THREE.Vector3(...initialPosition),
    rotation: new THREE.Euler(...initialRotation),
    velocity: new THREE.Vector3(),
    angularVelocity: new THREE.Vector3(),
    speed: 0,
    onGround: false,
    jumping: false,
    running: false,
    fuel: 100,
    shakeMagnitude: 0
  };
  
  // Input state
  let input: ControlInput = {
    forward: 0,
    backward: 0,
    left: 0,
    right: 0,
    up: 0,
    down: 0,
    roll_left: 0,
    roll_right: 0,
    yaw_left: 0,
    yaw_right: 0,
    pitch_up: 0,
    pitch_down: 0,
    boost: false,
    jump: false,
    crouch: false,
    fire: false,
    mouseX: 0,
    mouseY: 0
  };
  
  // References
  let playerObject: THREE.Group;
  
  // Make player state available to other components
  setContext('playerState', playerState);
  
  // Configure based on control scheme
  $: updateControllerConfig(controlScheme, config);
  
  function updateControllerConfig(scheme, conf) {
    // Configure controller based on scheme
    // This would be implemented based on the scheme type
    console.log('Configuring controller for scheme', scheme);
  }
  
  // Set up controls based on key bindings
  function setupControls(bindings) {
    // Set up key event listeners
    const handleKeyDown = (e) => {
      updateInputForKey(e.code, 1);
    };
    
    const handleKeyUp = (e) => {
      updateInputForKey(e.code, 0);
    };
    
    const handleMouseMove = (e) => {
      input.mouseX = e.movementX;
      input.mouseY = e.movementY;
    };
    
    // Map key codes to input actions
    function updateInputForKey(code, value) {
      Object.entries(bindings).forEach(([action, keyCode]) => {
        if (keyCode === code) {
          input[action] = value;
        }
      });
    }
    
    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }
  
  // Initialize
  onMount(() => {
    const cleanupControls = setupControls(config.keyBindings);
    
    onDestroy(() => {
      cleanupControls();
    });
  });
  
  // Update physics and movement - this is the core loop
  useFrame((_, delta) => {
    // Skip if not initialized
    if (!playerObject) return;
    
    // Select the right update function based on controller type
    switch (config.type) {
      case 'spacecraft':
        updateSpacecraft(delta);
        break;
      case 'fps':
        updateFPS(delta);
        break;
      case 'third-person':
        updateThirdPerson(delta);
        break;
      default:
        updateSpacecraft(delta);
    }
    
    // Apply any special effects (like camera shake)
    updateEffects(delta);
  });
  
  // Specific update functions for different controller types
  
  function updateSpacecraft(delta) {
    const {
      mass, drag, angularDrag, maxSpeed, acceleration,
      rotationSpeed, boostMultiplier, boostFuelConsumption
    } = config.physics;
    
    // Calculate forces
    let accelerationForce = 0;
    
    // Handle input
    // Forward/backward thrust
    if (input.forward > 0) {
      accelerationForce = acceleration;
    } else if (input.backward > 0) {
      accelerationForce = -acceleration * 0.5; // Braking is less powerful
    }
    
    // Apply boost
    let currentMaxSpeed = maxSpeed;
    if (input.boost && playerState.fuel > 0) {
      accelerationForce *= boostMultiplier;
      currentMaxSpeed *= boostMultiplier;
      playerState.fuel = Math.max(0, playerState.fuel - boostFuelConsumption * delta);
    } else if (playerState.fuel < 100) {
      // Regenerate fuel when not boosting
      playerState.fuel = Math.min(100, playerState.fuel + delta * 5);
    }
    
    // Calculate rotation from input
    const rotationChange = new THREE.Vector3(0, 0, 0);
    
    if (input.pitch_up > 0) rotationChange.x += rotationSpeed * delta;
    if (input.pitch_down > 0) rotationChange.x -= rotationSpeed * delta;
    if (input.yaw_left > 0) rotationChange.y += rotationSpeed * delta;
    if (input.yaw_right > 0) rotationChange.y -= rotationSpeed * delta;
    if (input.roll_left > 0) rotationChange.z += rotationSpeed * delta;
    if (input.roll_right > 0) rotationChange.z -= rotationSpeed * delta;
    
    // Apply angular velocity changes
    playerState.angularVelocity.add(rotationChange);
    
    // Apply angular drag
    playerState.angularVelocity.multiplyScalar(1 - angularDrag);
    
    // Apply rotation based on angular velocity
    playerObject.rotation.x += playerState.angularVelocity.x;
    playerObject.rotation.y += playerState.angularVelocity.y;
    playerObject.rotation.z += playerState.angularVelocity.z;
    
    // Get forward direction based on current rotation
    const forwardDirection = new THREE.Vector3(0, 0, -1);
    forwardDirection.applyEuler(playerObject.rotation);
    
    // Apply acceleration in the forward direction
    const acceleration = forwardDirection.multiplyScalar(accelerationForce * delta);
    playerState.velocity.add(acceleration);
    
    // Apply drag
    playerState.velocity.multiplyScalar(1 - drag);
    
    // Clamp velocity to max speed
    const speed = playerState.velocity.length();
    if (speed > currentMaxSpeed) {
      playerState.velocity.normalize().multiplyScalar(currentMaxSpeed);
    }
    
    // Update position based on velocity
    playerObject.position.add(playerState.velocity.clone().multiplyScalar(delta));
    
    // Update state
    playerState.position.copy(playerObject.position);
    playerState.rotation.copy(playerObject.rotation);
    playerState.speed = playerState.velocity.length();
    
    // Calculate camera shake based on acceleration
    playerState.shakeMagnitude = Math.min(
      0.5,
      Math.abs(accelerationForce) / (acceleration * 4)
    );
  }
  
  function updateFPS(delta) {
    // Implement FPS controller physics and movement
    // This would be similar to standard FPS controls
  }
  
  function updateThirdPerson(delta) {
    // Implement third-person controller physics and movement
    // This would include character movement and camera following
  }
  
  function updateEffects(delta) {
    // Handle effects like camera shake, etc.
    // These would be applied after the main physics update
    
    // Dampen camera shake
    if (playerState.shakeMagnitude > 0) {
      playerState.shakeMagnitude *= 0.95;
    }
  }
</script>

<T.Group bind:ref={playerObject} position={initialPosition} rotation={initialRotation}>
  <slot />
</T.Group>
```

### 3. Create Camera Controller Component

```svelte
<script lang="ts">
  import { T, useFrame, useThree } from '@threlte/core';
  import * as THREE from 'three';
  import { getContext, onMount } from 'svelte';
  
  // Props
  export let target = null;
  export let config = {
    position: [0, 1.5, 8],
    lookAt: [0, 0, -1],
    offsetFromPlayer: true,
    followDistance: 8,
    height: 1.5,
    damping: 0.05,
    fov: 75,
    near: 0.1,
    far: 1000,
    shake: {
      enabled: true,
      maxIntensity: 0.3,
      dampingFactor: 0.95
    }
  };
  
  // Get three.js context and camera
  const { camera } = useThree();
  
  // Get player state from context if available
  const playerState = getContext('playerState');
  
  // Camera state
  let idealPosition = new THREE.Vector3();
  let idealLookAt = new THREE.Vector3();
  let shakeOffset = new THREE.Vector3();
  
  // Set up camera
  onMount(() => {
    // Set initial camera properties
    if (camera) {
      camera.fov = config.fov;
      camera.near = config.near;
      camera.far = config.far;
      camera.updateProjectionMatrix();
    }
  });
  
  // Update camera position and orientation
  useFrame((_, delta) => {
    if (!camera || !target) return;
    
    // Different camera behaviors based on control type
    if (config.type === 'spacecraft') {
      updateSpacecraftCamera(delta);
    } else if (config.type === 'fps') {
      updateFPSCamera(delta);
    } else if (config.type === 'third-person') {
      updateThirdPersonCamera(delta);
    }
    
    // Apply camera shake if enabled
    if (config.shake?.enabled && playerState?.shakeMagnitude > 0) {
      applyShake(delta, playerState.shakeMagnitude);
    }
  });
  
  function updateSpacecraftCamera(delta) {
    if (!target) return;
    
    // Get target position
    const targetPosition = new THREE.Vector3();
    target.getWorldPosition(targetPosition);
    
    // Calculate ideal position - behind and above the target
    const lookDirection = new THREE.Vector3(0, 0, -1);
    lookDirection.applyQuaternion(target.quaternion);
    
    // Calculate camera position behind the player
    idealPosition.copy(targetPosition)
      .sub(lookDirection.multiplyScalar(config.followDistance))
      .add(new THREE.Vector3(0, config.height, 0));
    
    // Look slightly ahead for smoother camera
    const lookAheadPosition = targetPosition.clone()
      .add(lookDirection.clone().multiplyScalar(20));
    
    idealLookAt.copy(lookAheadPosition);
    
    // Apply damping for smooth camera movement
    camera.position.lerp(idealPosition, config.damping);
    
    // Add shake offset
    camera.position.add(shakeOffset);
    
    // Look at target
    camera.lookAt(idealLookAt);
  }
  
  function updateFPSCamera(delta) {
    if (!target) return;
    
    // For FPS, the camera should be positioned at the player's head
    const targetPosition = new THREE.Vector3();
    target.getWorldPosition(targetPosition);
    
    // Offset camera to eye level
    targetPosition.y += config.height;
    
    // Set camera position directly to player's head position
    camera.position.copy(targetPosition);
    
    // Add shake offset
    camera.position.add(shakeOffset);
    
    // Apply head bob if walking/running
    if (config.headBobEnabled && playerState?.onGround && 
        (playerState?.velocity.length() > 0.1)) {
      const bobAmount = Math.sin(Date.now() * 0.01 * config.headBobFrequency) * 
                        config.headBobAmplitude * playerState.speed;
      camera.position.y += bobAmount;
    }
    
    // Camera rotation is set by the player's rotation directly
  }
  
  function updateThirdPersonCamera(delta) {
    if (!target) return;
    
    // Get target position
    const targetPosition = new THREE.Vector3();
    target.getWorldPosition(targetPosition);
    
    // Calculate ideal position - behind and above the target
    const offset = new THREE.Vector3(0, config.height, config.followDistance);
    offset.applyQuaternion(target.quaternion);
    
    idealPosition.copy(targetPosition).sub(offset);
    
    // Check for camera collisions with environment (simplified)
    if (config.collisionDetection) {
      // Pseudo-code for collision detection:
      // const ray = new THREE.Raycaster(targetPosition, direction to camera);
      // const collisions = ray.intersectObjects(scene.children);
      // if (collisions.length > 0 && collisions[0].distance < config.followDistance) {
      //   idealPosition = collision point;
      // }
    }
    
    // Apply damping for smooth camera movement
    camera.position.lerp(idealPosition, config.damping);
    
    // Add shake offset
    camera.position.add(shakeOffset);
    
    // Look at target
    camera.lookAt(targetPosition);
  }
  
  function applyShake(delta, intensity) {
    // Generate random shake offset
    const shakeIntensity = intensity * config.shake.maxIntensity;
    shakeOffset.set(
      (Math.random() - 0.5) * shakeIntensity,
      (Math.random() - 0.5) * shakeIntensity,
      (Math.random() - 0.5) * shakeIntensity
    );
    
    // Dampen shake
    shakeOffset.multiplyScalar(config.shake.dampingFactor);
  }
</script>
```

### 4. Create Player Types and Interfaces

```typescript
// playerTypes.ts
import * as THREE from 'three';

export type ControlScheme = 'spacecraft' | 'fps' | 'third-person' | string;

export interface ControlInput {
  // Generic inputs
  forward: number;
  backward: number;
  left: number;
  right: number;
  up: number;
  down: number;
  
  // Flight-specific
  roll_left: number;
  roll_right: number;
  yaw_left: number;
  yaw_right: number;
  pitch_up: number;
  pitch_down: number;
  
  // Common actions
  boost: boolean;
  jump: boolean;
  crouch: boolean;
  fire: boolean;
  
  // Mouse
  mouseX: number;
  mouseY: number;
}

export interface PlayerState {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  speed: number;
  onGround: boolean;
  jumping: boolean;
  running: boolean;
  fuel: number;
  shakeMagnitude: number;
}

export interface PhysicsConfig {
  [key: string]: any;
  mass?: number;
  drag?: number;
  angularDrag?: number;
  maxSpeed?: number;
  acceleration?: number;
  rotationSpeed?: number;
  boostMultiplier?: number;
  boostFuelConsumption?: number;
  gravity?: number;
  walkSpeed?: number;
  runSpeed?: number;
  jumpForce?: number;
}

export interface CameraConfig {
  [key: string]: any;
  position?: [number, number, number];
  lookAt?: [number, number, number];
  offsetFromPlayer?: boolean;
  followDistance?: number;
  height?: number;
  damping?: number;
  fov?: number;
  near?: number;
  far?: number;
  headBobEnabled?: boolean;
  headBobFrequency?: number;
  headBobAmplitude?: number;
  shake?: {
    enabled: boolean;
    maxIntensity: number;
    dampingFactor: number;
  };
}

export interface KeyBindings {
  [key: string]: string;
}

export interface ControlSchemeConfig {
  name: string;
  type: string;
  keyBindings: KeyBindings;
  physics: PhysicsConfig;
  camera: CameraConfig;
}
```

### 5. Create Helper Functions

Create utility functions for common player/camera operations:

```typescript
// playerUtils.ts
import * as THREE from 'three';

// Get forward direction from rotation
export function getForwardDirection(rotation: THREE.Euler): THREE.Vector3 {
  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyEuler(rotation);
  return direction;
}

// Get right direction from rotation
export function getRightDirection(rotation: THREE.Euler): THREE.Vector3 {
  const direction = new THREE.Vector3(1, 0, 0);
  direction.applyEuler(rotation);
  return direction;
}

// Get up direction from rotation
export function getUpDirection(rotation: THREE.Euler): THREE.Vector3 {
  const direction = new THREE.Vector3(0, 1, 0);
  direction.applyEuler(rotation);
  return direction;
}

// Calculate yaw angle in degrees (0-360)
export function calculateYawAngle(rotationY: number): number {
  // Convert to degrees and normalize to 0-360 range
  let degrees = (rotationY * 180 / Math.PI) % 360;
  if (degrees < 0) degrees += 360;
  return degrees;
}

// Calculate pitch angle in degrees (-90 to 90)
export function calculatePitchAngle(rotationX: number): number {
  // Convert to degrees and clamp to -90 to 90 range
  let degrees = (rotationX * 180 / Math.PI);
  return Math.max(-90, Math.min(90, degrees));
}

// Calculate roll angle in degrees (-180 to 180)
export function calculateRollAngle(rotationZ: number): number {
  // Convert to degrees and normalize to -180 to 180 range
  let degrees = (rotationZ * 180 / Math.PI) % 360;
  if (degrees > 180) degrees -= 360;
  else if (degrees < -180) degrees += 360;
  return degrees;
}

// Calculate angle of attack (AoA) for flight dynamics
export function calculateAoA(velocity: THREE.Vector3, forwardVector: THREE.Vector3): number {
  if (velocity.length() < 0.001) return 0;
  
  const normalizedVelocity = velocity.clone().normalize();
  const dot = normalizedVelocity.dot(forwardVector);
  
  // Convert to degrees
  return Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;
}

// Apply g-force calculations for flight dynamics
export function calculateGForce(
  velocity: THREE.Vector3, 
  prevVelocity: THREE.Vector3, 
  delta: number
): number {
  if (delta <= 0) return 1;
  
  // Calculate acceleration
  const acceleration = velocity.clone().sub(prevVelocity).length() / delta;
  
  // Convert to g-force (1g = 9.8 m/s²)
  const gForce = acceleration / 9.8;
  
  // Add 1g for baseline (earth gravity)
  return gForce + 1;
}
```

### 6. Integration Plan
1. Add PlayerCameraExtension to the available Studio extensions
2. Create PlayerController and CameraController components
3. Create utility functions and types
4. Move code from cameraController.ts and demoSpaceship.svelte into new system
5. Update existing components to use the new player/camera system

### 7. Migration Steps
1. Create PlayerCameraExtension.svelte in the extensions directory
2. Create player subdirectory for components
3. Implement PlayerController.svelte
4. Implement CameraController.svelte
5. Create playerTypes.ts and playerUtils.ts
6. Refactor demoSpaceship.svelte to use the new player system
7. Test thoroughly
8. Clean up old implementations

## Features for Future Enhancement
- VR support and camera modes
- Camera path recording and playback
- Cinematic camera modes
- Custom physics models
- Vehicle switching support
- Input remapping UI
- Advanced flight models (lift, drag, etc.)
- Advanced vehicle damage model
- Mobile/touch controls
- Gamepad support
- Multiple camera viewpoints (cockpit, external, etc.)

## Performance Considerations
- Smooth interpolation between camera positions
- Optimized physics calculations
- Efficient input processing
- Level of detail adjustments based on distance
- Adaptive physics step rate
- Efficient collision detection 