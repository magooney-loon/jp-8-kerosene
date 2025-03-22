# Input Controller System Plan

## Current State
- Input handling scattered across different components
- No unified gamepad support
- Limited key rebinding capabilities
- No input action mapping system
- Inconsistent input handling between different control schemes
- No support for multiple input devices simultaneously

## Goals
1. Create a unified input system as a Studio Engine extension
2. Support keyboard, mouse, and gamepad inputs
3. Allow for easy input remapping
4. Support multiple control schemes
5. Enable simultaneous input from different devices
6. Provide input action mapping system

## Implementation Plan

### 1. Create Input Controller Extension Component

Create an `InputControllerExtension.svelte` component that follows the Studio Engine extension pattern:

```svelte
<script lang="ts">
  import { useStudio } from '@threlte/studio/extend';
  import { ToolbarItem, Panel } from '@threlte/studio';
  import { useGamepad } from '@threlte/extras';
  
  // Extension scope
  const extensionScope = 'input-controller';
  
  // Create the extension
  const { createExtension } = useStudio();
  
  const extension = createExtension({
    scope: extensionScope,
    state({ persist }) {
      return {
        // Global input settings
        enabled: persist(true),
        
        // Input devices configuration
        devices: persist({
          keyboard: {
            enabled: true,
            sensitivity: 1.0
          },
          mouse: {
            enabled: true,
            sensitivity: 1.0,
            invertY: false,
            lockPointer: true
          },
          gamepad: {
            enabled: true,
            deadzone: 0.1,
            vibration: true,
            sensitivity: {
              stick: 1.0,
              trigger: 1.0
            }
          }
        }),
        
        // Control schemes
        schemes: persist({
          spacecraft: {
            name: 'Spacecraft Controls',
            actions: {
              thrust: {
                name: 'Thrust',
                keyboard: 'KeyW',
                gamepad: 'RightTrigger'
              },
              brake: {
                name: 'Brake',
                keyboard: 'KeyS',
                gamepad: 'LeftTrigger'
              },
              yawLeft: {
                name: 'Yaw Left',
                keyboard: 'KeyA',
                gamepad: 'LeftStickLeft'
              },
              yawRight: {
                name: 'Yaw Right',
                keyboard: 'KeyD',
                gamepad: 'LeftStickRight'
              },
              pitchUp: {
                name: 'Pitch Up',
                keyboard: 'ArrowUp',
                gamepad: 'RightStickUp'
              },
              pitchDown: {
                name: 'Pitch Down',
                keyboard: 'ArrowDown',
                gamepad: 'RightStickDown'
              },
              rollLeft: {
                name: 'Roll Left',
                keyboard: 'KeyQ',
                gamepad: 'LeftBumper'
              },
              rollRight: {
                name: 'Roll Right',
                keyboard: 'KeyE',
                gamepad: 'RightBumper'
              },
              boost: {
                name: 'Boost',
                keyboard: 'ShiftLeft',
                gamepad: 'ButtonA'
              },
              fire: {
                name: 'Fire',
                keyboard: 'Space',
                mouse: 'Left',
                gamepad: 'ButtonR2'
              }
            }
          },
          
          fps: {
            name: 'FPS Controls',
            actions: {
              moveForward: {
                name: 'Move Forward',
                keyboard: 'KeyW',
                gamepad: 'LeftStickUp'
              },
              moveBackward: {
                name: 'Move Backward',
                keyboard: 'KeyS',
                gamepad: 'LeftStickDown'
              },
              moveLeft: {
                name: 'Move Left',
                keyboard: 'KeyA',
                gamepad: 'LeftStickLeft'
              },
              moveRight: {
                name: 'Move Right',
                keyboard: 'KeyD',
                gamepad: 'LeftStickRight'
              },
              jump: {
                name: 'Jump',
                keyboard: 'Space',
                gamepad: 'ButtonA'
              },
              crouch: {
                name: 'Crouch',
                keyboard: 'ControlLeft',
                gamepad: 'ButtonB'
              },
              sprint: {
                name: 'Sprint',
                keyboard: 'ShiftLeft',
                gamepad: 'LeftStickButton'
              },
              aim: {
                name: 'Aim',
                mouse: 'Right',
                gamepad: 'LeftTrigger'
              },
              fire: {
                name: 'Fire',
                mouse: 'Left',
                gamepad: 'RightTrigger'
              },
              reload: {
                name: 'Reload',
                keyboard: 'KeyR',
                gamepad: 'ButtonX'
              }
            }
          }
        }),
        
        // Active control scheme
        activeScheme: persist('spacecraft'),
        
        // Input state
        inputState: {
          keyboard: new Map(),
          mouse: {
            buttons: new Map(),
            position: { x: 0, y: 0 },
            movement: { x: 0, y: 0 },
            wheel: 0
          },
          gamepad: {
            buttons: new Map(),
            axes: new Map(),
            connected: false,
            id: null
          }
        },
        
        // Action state (computed from input state)
        actionState: new Map(),
        
        // Input history for combos/macros
        inputHistory: [],
        
        // Input recording for macros
        recording: {
          active: false,
          startTime: 0,
          inputs: []
        }
      };
    },
    actions: {
      // Set active control scheme
      setControlScheme: (schemeId) => {
        if (extension.state.schemes[schemeId]) {
          extension.state.activeScheme = schemeId;
        }
      },
      
      // Update device settings
      updateDeviceSettings: (device, settings) => {
        if (extension.state.devices[device]) {
          Object.assign(extension.state.devices[device], settings);
        }
      },
      
      // Rebind action
      rebindAction: (schemeId, actionId, device, input) => {
        if (
          extension.state.schemes[schemeId]?.actions[actionId] &&
          extension.state.devices[device]?.enabled
        ) {
          extension.state.schemes[schemeId].actions[actionId][device] = input;
        }
      },
      
      // Start input recording
      startRecording: () => {
        extension.state.recording = {
          active: true,
          startTime: Date.now(),
          inputs: []
        };
      },
      
      // Stop input recording
      stopRecording: () => {
        extension.state.recording.active = false;
        return extension.state.recording.inputs;
      },
      
      // Get action value
      getActionValue: (actionId) => {
        return extension.state.actionState.get(actionId) || 0;
      },
      
      // Check if action is active
      isActionActive: (actionId) => {
        return extension.state.actionState.get(actionId) > 0.5;
      },
      
      // Get raw input value
      getRawInput: (device, input) => {
        switch (device) {
          case 'keyboard':
            return extension.state.inputState.keyboard.get(input) ? 1 : 0;
          case 'mouse':
            if (input === 'position' || input === 'movement') {
              return extension.state.inputState.mouse[input];
            }
            return extension.state.inputState.mouse.buttons.get(input) ? 1 : 0;
          case 'gamepad':
            if (input.startsWith('axis')) {
              return extension.state.inputState.gamepad.axes.get(input) || 0;
            }
            return extension.state.inputState.gamepad.buttons.get(input) || 0;
          default:
            return 0;
        }
      }
    }
  });
  
  // Initialize gamepad support
  const gamepad = useGamepad();
  
  // Update gamepad state
  $effect(() => {
    if (!gamepad.connected) {
      extension.state.inputState.gamepad.connected = false;
      extension.state.inputState.gamepad.id = null;
      return;
    }
    
    extension.state.inputState.gamepad.connected = true;
    extension.state.inputState.gamepad.id = gamepad.id;
    
    // Update button states
    gamepad.buttons.forEach((value, index) => {
      extension.state.inputState.gamepad.buttons.set(`button${index}`, value);
    });
    
    // Update axes
    gamepad.axes.forEach((value, index) => {
      extension.state.inputState.gamepad.axes.set(`axis${index}`, value);
    });
  });
  
  // Handle keyboard events
  function handleKeyDown(event: KeyboardEvent) {
    if (!extension.state.devices.keyboard.enabled) return;
    extension.state.inputState.keyboard.set(event.code, true);
    
    if (extension.state.recording.active) {
      extension.state.recording.inputs.push({
        time: Date.now() - extension.state.recording.startTime,
        device: 'keyboard',
        type: 'keydown',
        code: event.code
      });
    }
  }
  
  function handleKeyUp(event: KeyboardEvent) {
    if (!extension.state.devices.keyboard.enabled) return;
    extension.state.inputState.keyboard.set(event.code, false);
    
    if (extension.state.recording.active) {
      extension.state.recording.inputs.push({
        time: Date.now() - extension.state.recording.startTime,
        device: 'keyboard',
        type: 'keyup',
        code: event.code
      });
    }
  }
  
  // Handle mouse events
  function handleMouseMove(event: MouseEvent) {
    if (!extension.state.devices.mouse.enabled) return;
    
    extension.state.inputState.mouse.position = {
      x: event.clientX,
      y: event.clientY
    };
    
    extension.state.inputState.mouse.movement = {
      x: event.movementX * extension.state.devices.mouse.sensitivity,
      y: event.movementY * (extension.state.devices.mouse.invertY ? 1 : -1) 
        * extension.state.devices.mouse.sensitivity
    };
    
    if (extension.state.recording.active) {
      extension.state.recording.inputs.push({
        time: Date.now() - extension.state.recording.startTime,
        device: 'mouse',
        type: 'mousemove',
        position: { x: event.clientX, y: event.clientY },
        movement: { x: event.movementX, y: event.movementY }
      });
    }
  }
  
  function handleMouseDown(event: MouseEvent) {
    if (!extension.state.devices.mouse.enabled) return;
    extension.state.inputState.mouse.buttons.set(event.button, true);
    
    if (extension.state.recording.active) {
      extension.state.recording.inputs.push({
        time: Date.now() - extension.state.recording.startTime,
        device: 'mouse',
        type: 'mousedown',
        button: event.button
      });
    }
  }
  
  function handleMouseUp(event: MouseEvent) {
    if (!extension.state.devices.mouse.enabled) return;
    extension.state.inputState.mouse.buttons.set(event.button, false);
    
    if (extension.state.recording.active) {
      extension.state.recording.inputs.push({
        time: Date.now() - extension.state.recording.startTime,
        device: 'mouse',
        type: 'mouseup',
        button: event.button
      });
    }
  }
  
  function handleWheel(event: WheelEvent) {
    if (!extension.state.devices.mouse.enabled) return;
    extension.state.inputState.mouse.wheel = Math.sign(event.deltaY);
    
    if (extension.state.recording.active) {
      extension.state.recording.inputs.push({
        time: Date.now() - extension.state.recording.startTime,
        device: 'mouse',
        type: 'wheel',
        delta: event.deltaY
      });
    }
  }
  
  // Update action states based on input
  function updateActionStates() {
    const scheme = extension.state.schemes[extension.state.activeScheme];
    if (!scheme) return;
    
    Object.entries(scheme.actions).forEach(([actionId, action]) => {
      let value = 0;
      
      // Check keyboard
      if (action.keyboard && extension.state.devices.keyboard.enabled) {
        if (extension.state.inputState.keyboard.get(action.keyboard)) {
          value = Math.max(value, 1);
        }
      }
      
      // Check mouse
      if (action.mouse && extension.state.devices.mouse.enabled) {
        if (extension.state.inputState.mouse.buttons.get(action.mouse)) {
          value = Math.max(value, 1);
        }
      }
      
      // Check gamepad
      if (action.gamepad && extension.state.devices.gamepad.enabled) {
        const gamepadValue = extension.state.inputState.gamepad.buttons.get(action.gamepad) ||
          extension.state.inputState.gamepad.axes.get(action.gamepad) || 0;
        
        if (Math.abs(gamepadValue) > extension.state.devices.gamepad.deadzone) {
          value = Math.max(value, Math.abs(gamepadValue));
        }
      }
      
      extension.state.actionState.set(actionId, value);
    });
  }
  
  // Initialize event listeners
  onMount(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('wheel', handleWheel);
    
    // Lock pointer if enabled
    if (extension.state.devices.mouse.lockPointer) {
      document.addEventListener('click', () => {
        document.body.requestPointerLock();
      });
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('wheel', handleWheel);
    };
  });
  
  // Update loop
  useFrame(() => {
    updateActionStates();
  });
</script>

<!-- Extension UI -->
<ToolbarItem position="left">
  <Panel title="Input Settings">
    <!-- Input configuration controls would go here -->
  </Panel>
</ToolbarItem>

<slot />
```

### 2. Create Input Types and Interfaces

```typescript
// inputTypes.ts

export type InputDevice = 'keyboard' | 'mouse' | 'gamepad';

export type MouseButton = 'Left' | 'Middle' | 'Right' | number;

export interface InputDeviceConfig {
  enabled: boolean;
  sensitivity?: number;
  [key: string]: any;
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface MouseState {
  buttons: Map<MouseButton, boolean>;
  position: Vector2;
  movement: Vector2;
  wheel: number;
}

export interface GamepadState {
  buttons: Map<string, number>;
  axes: Map<string, number>;
  connected: boolean;
  id: string | null;
}

export interface InputState {
  keyboard: Map<string, boolean>;
  mouse: MouseState;
  gamepad: GamepadState;
}

export interface InputAction {
  name: string;
  keyboard?: string;
  mouse?: MouseButton;
  gamepad?: string;
}

export interface ControlScheme {
  name: string;
  actions: {
    [key: string]: InputAction;
  };
}

export interface InputConfig {
  enabled: boolean;
  devices: {
    [key in InputDevice]: InputDeviceConfig;
  };
  schemes: {
    [key: string]: ControlScheme;
  };
  activeScheme: string;
}

export interface InputRecord {
  time: number;
  device: InputDevice;
  type: string;
  [key: string]: any;
}
```

### 3. Create Input Utility Functions

```typescript
// inputUtils.ts

import type { Vector2 } from './inputTypes';

// Convert gamepad stick value to normalized direction
export function getStickDirection(x: number, y: number, deadzone: number): Vector2 {
  const magnitude = Math.sqrt(x * x + y * y);
  if (magnitude < deadzone) {
    return { x: 0, y: 0 };
  }
  
  return {
    x: x / magnitude,
    y: y / magnitude
  };
}

// Convert keyboard WASD to normalized direction
export function getKeyboardDirection(
  up: boolean,
  down: boolean,
  left: boolean,
  right: boolean
): Vector2 {
  const x = (right ? 1 : 0) - (left ? 1 : 0);
  const y = (up ? 1 : 0) - (down ? 1 : 0);
  const magnitude = Math.sqrt(x * x + y * y);
  
  if (magnitude === 0) {
    return { x: 0, y: 0 };
  }
  
  return {
    x: x / magnitude,
    y: y / magnitude
  };
}

// Apply sensitivity and deadzone to raw input value
export function processInputValue(
  value: number,
  sensitivity: number = 1,
  deadzone: number = 0
): number {
  if (Math.abs(value) < deadzone) {
    return 0;
  }
  
  const sign = Math.sign(value);
  const normalized = (Math.abs(value) - deadzone) / (1 - deadzone);
  return sign * normalized * sensitivity;
}

// Check if a gamepad button is pressed
export function isGamepadButtonPressed(value: number, threshold: number = 0.5): boolean {
  return value >= threshold;
}

// Convert mouse movement to rotation
export function mouseMovementToRotation(
  movement: Vector2,
  sensitivity: number,
  invertY: boolean
): Vector2 {
  return {
    x: movement.x * sensitivity,
    y: movement.y * (invertY ? 1 : -1) * sensitivity
  };
}
```

### 4. Integration Plan
1. Add InputControllerExtension to the available Studio extensions
2. Create input management system with device support
3. Implement control scheme configuration
4. Add input recording and playback
5. Create input binding UI
6. Integrate with other extensions (Player/Camera, HUD)

### 5. Migration Steps
1. Create InputControllerExtension.svelte in the extensions directory
2. Create input subdirectory for components
3. Create inputTypes.ts and inputUtils.ts
4. Implement input binding UI
5. Test with different input devices
6. Update existing components to use the new input system

## Features for Future Enhancement
- Input combination detection (key combos)
- Macro recording and playback
- Input sequence recognition
- Advanced gamepad features (rumble, etc.)
- Touch input support
- VR controller support
- Input visualization for tutorials
- Custom input device support
- Input profiles system
- Input event recording/replay

## Performance Considerations
- Efficient input polling
- Debounce rapid input changes
- Optimize action state updates
- Minimize garbage collection
- Cache computed values
- Use request animation frame for updates
- Batch input event processing
- Clean up event listeners properly
