# HUD System Refactoring Plan

## Current State
- No centralized HUD management system
- UI elements mixed with game logic
- Limited configurability for different UI styles
- No easy way to create responsive game UI
- No separation between gameplay and interface elements

## Goals
1. Create a flexible HUD system as a Studio Engine extension
2. Provide layered UI rendering with proper depth management
3. Support responsive design for different screen sizes
4. Allow for easy creation and management of UI elements
5. Implement smooth transitions between UI states
6. Support theming and style customization

## Implementation Plan

### 1. Create HUD Extension Component

Create a `HUDExtension.svelte` component that follows the Studio Engine extension pattern:

```svelte
<script lang="ts">
  import { useStudio } from '@threlte/studio/extend';
  import { ToolbarItem, Panel } from '@threlte/studio';
  import { HUD } from '@threlte/extras';
  
  // Extension scope
  const extensionScope = 'hud';
  
  // Create the extension
  const { createExtension } = useStudio();
  
  const extension = createExtension({
    scope: extensionScope,
    state({ persist }) {
      return {
        // Global HUD settings
        enabled: persist(true),
        
        // HUD layers configuration
        layers: persist({
          gameplay: {
            name: 'Gameplay HUD',
            enabled: true,
            zIndex: 10,
            opacity: 1.0,
            components: {
              healthBar: {
                enabled: true,
                position: 'bottom-left',
                style: 'default',
                showText: true,
                showIcon: true
              },
              ammoCounter: {
                enabled: true,
                position: 'bottom-right',
                style: 'default',
                showText: true,
                showIcon: true
              },
              minimap: {
                enabled: true,
                position: 'top-right',
                size: 'medium',
                style: 'default',
                showPOI: true,
                rotateWithPlayer: true
              },
              crosshair: {
                enabled: true,
                style: 'default',
                size: 'medium',
                color: '#ffffff',
                showHitMarker: true
              }
            }
          },
          
          status: {
            name: 'Status Indicators',
            enabled: true,
            zIndex: 20,
            opacity: 1.0,
            components: {
              objectives: {
                enabled: true,
                position: 'top-left',
                style: 'default',
                maxVisible: 3,
                showProgress: true
              },
              notifications: {
                enabled: true,
                position: 'top-center',
                style: 'default',
                duration: 3.0,
                maxVisible: 3
              },
              damageIndicator: {
                enabled: true,
                style: 'default',
                duration: 1.0,
                fadeOut: true
              }
            }
          },
          
          menus: {
            name: 'Game Menus',
            enabled: false,
            zIndex: 30,
            opacity: 0.95,
            components: {
              mainMenu: {
                enabled: true,
                style: 'default',
                animation: 'fade'
              },
              pauseMenu: {
                enabled: true,
                style: 'default', 
                animation: 'scale',
                blurBackground: true
              },
              inventory: {
                enabled: true,
                style: 'default',
                animation: 'slide-up',
                gridSize: [6, 4]
              },
              settings: {
                enabled: true,
                style: 'default',
                animation: 'fade',
                categories: ['gameplay', 'audio', 'graphics', 'controls']
              }
            }
          },
          
          debug: {
            name: 'Debug Information',
            enabled: false,
            zIndex: 40,
            opacity: 0.8,
            components: {
              stats: {
                enabled: true,
                position: 'top-right',
                style: 'default',
                showFPS: true,
                showMemory: true,
                showDrawCalls: true
              },
              playerInfo: {
                enabled: true,
                position: 'top-left',
                style: 'default',
                showPosition: true,
                showRotation: true,
                showVelocity: true
              }
            }
          }
        }),
        
        // Themes for styling
        themes: persist({
          default: {
            fontFamily: 'Roboto, sans-serif',
            fontSize: 16,
            primaryColor: '#3399ff',
            secondaryColor: '#66ccff',
            backgroundColor: 'rgba(0,0,0,0.5)',
            textColor: '#ffffff',
            accentColor: '#ff9900',
            warningColor: '#ffcc00',
            dangerColor: '#ff3300',
            borderRadius: 4,
            padding: 8,
            spacing: 4
          },
          
          minimal: {
            fontFamily: 'Arial, sans-serif',
            fontSize: 14,
            primaryColor: '#ffffff',
            secondaryColor: '#cccccc',
            backgroundColor: 'rgba(0,0,0,0.3)',
            textColor: '#ffffff',
            accentColor: '#99ccff',
            warningColor: '#ffcc00',
            dangerColor: '#ff6666',
            borderRadius: 2,
            padding: 4,
            spacing: 2
          },
          
          futuristic: {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: 16,
            primaryColor: '#00ffcc',
            secondaryColor: '#33ccff',
            backgroundColor: 'rgba(0,20,40,0.7)',
            textColor: '#ffffff',
            accentColor: '#ff00cc',
            warningColor: '#ffcc00',
            dangerColor: '#ff3300',
            borderRadius: 0,
            padding: 12,
            spacing: 6
          }
        }),
        
        // Active theme
        activeTheme: persist('default'),
        
        // Animation settings
        animations: persist({
          enabled: true,
          duration: 0.3,
          easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)'
        }),
        
        // Responsiveness configuration
        responsive: persist({
          breakpoints: {
            sm: 640,
            md: 768,
            lg: 1024,
            xl: 1280
          },
          adaptToScreenSize: true,
          scaleFactor: 1.0
        }),
        
        // Active notifications
        notifications: persist([])
      };
    },
    actions: {
      // Toggle HUD visibility
      toggleHUD: (visible) => {
        extension.state.enabled = visible;
      },
      
      // Toggle specific layer visibility
      toggleLayer: (layerId, visible) => {
        if (extension.state.layers[layerId]) {
          extension.state.layers[layerId].enabled = visible;
        }
      },
      
      // Update component setting
      updateComponent: (layerId, componentId, setting, value) => {
        if (
          extension.state.layers[layerId] && 
          extension.state.layers[layerId].components[componentId]
        ) {
          extension.state.layers[layerId].components[componentId][setting] = value;
        }
      },
      
      // Change active theme
      setTheme: (themeId) => {
        if (extension.state.themes[themeId]) {
          extension.state.activeTheme = themeId;
        }
      },
      
      // Add a notification
      addNotification: (text, type = 'info', duration = 3) => {
        const id = Date.now() + Math.random().toString(36).substring(2, 10);
        const notification = {
          id,
          text,
          type,
          createdAt: Date.now(),
          duration
        };
        
        extension.state.notifications = [
          ...extension.state.notifications, 
          notification
        ];
        
        // Auto-remove after duration
        if (duration > 0) {
          setTimeout(() => {
            extension.actions.removeNotification(id);
          }, duration * 1000);
        }
        
        return id;
      },
      
      // Remove a notification
      removeNotification: (id) => {
        extension.state.notifications = extension.state.notifications.filter(
          n => n.id !== id
        );
      },
      
      // Update responsive settings
      updateResponsive: (setting, value) => {
        extension.state.responsive[setting] = value;
      }
    }
  });
</script>

<!-- Extension UI -->
<ToolbarItem position="left">
  <Panel title="HUD Settings">
    <!-- HUD configuration controls would go here -->
  </Panel>
</ToolbarItem>

<slot />
```

### 2. Create HUD Manager Component

Create a `HUDManager.svelte` component to handle rendering the different HUD layers:

```svelte
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { T } from '@threlte/core';
  import { HUD } from '@threlte/extras';
  
  // Import UI components
  import GameplayHUD from './layers/GameplayHUD.svelte';
  import StatusHUD from './layers/StatusHUD.svelte';
  import MenusHUD from './layers/MenusHUD.svelte';
  import DebugHUD from './layers/DebugHUD.svelte';
  
  // Props
  export let config = {
    enabled: true,
    layers: {},
    activeTheme: 'default',
    themes: {},
    animations: {
      enabled: true,
      duration: 0.3
    },
    responsive: {
      breakpoints: {},
      adaptToScreenSize: true,
      scaleFactor: 1.0
    },
    notifications: []
  };
  
  // Event dispatcher
  const dispatch = createEventDispatcher();
  
  // Screen size state
  let screenWidth = window.innerWidth;
  let screenHeight = window.innerHeight;
  let currentBreakpoint = 'md';
  
  // Track resize events
  function handleResize() {
    screenWidth = window.innerWidth;
    screenHeight = window.innerHeight;
    updateBreakpoint();
  }
  
  // Determine current breakpoint
  function updateBreakpoint() {
    const { breakpoints } = config.responsive;
    
    if (screenWidth < breakpoints.sm) {
      currentBreakpoint = 'xs';
    } else if (screenWidth < breakpoints.md) {
      currentBreakpoint = 'sm';
    } else if (screenWidth < breakpoints.lg) {
      currentBreakpoint = 'md';
    } else if (screenWidth < breakpoints.xl) {
      currentBreakpoint = 'lg';
    } else {
      currentBreakpoint = 'xl';
    }
    
    dispatch('breakpointChanged', { breakpoint: currentBreakpoint });
  }
  
  // Calculate scale factor based on screen size
  function getScaleFactor() {
    if (!config.responsive.adaptToScreenSize) {
      return config.responsive.scaleFactor;
    }
    
    // Base scale on the smaller dimension to fit better on various devices
    const baseSize = Math.min(screenWidth, screenHeight);
    const baseReference = 1080; // Reference height
    return (baseSize / baseReference) * config.responsive.scaleFactor;
  }
  
  // Initialize
  onMount(() => {
    updateBreakpoint();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });
  
  // Computed values
  $: scale = getScaleFactor();
  $: theme = config.themes[config.activeTheme] || config.themes.default;
  $: gameplayLayer = config.layers.gameplay || {};
  $: statusLayer = config.layers.status || {};
  $: menusLayer = config.layers.menus || {};
  $: debugLayer = config.layers.debug || {};
</script>

{#if config.enabled}
  <!-- Gameplay HUD layer (always visible during gameplay) -->
  {#if gameplayLayer.enabled}
    <HUD>
      <GameplayHUD
        config={gameplayLayer}
        {theme}
        {scale}
        {currentBreakpoint}
      />
    </HUD>
  {/if}
  
  <!-- Status indicators layer (notifications, objectives, etc.) -->
  {#if statusLayer.enabled}
    <HUD>
      <StatusHUD
        config={statusLayer}
        {theme}
        {scale}
        {currentBreakpoint}
        notifications={config.notifications}
      />
    </HUD>
  {/if}
  
  <!-- Menus layer (pause menu, inventory, etc.) -->
  {#if menusLayer.enabled}
    <HUD>
      <MenusHUD
        config={menusLayer}
        {theme}
        {scale}
        {currentBreakpoint}
        on:menuAction={(e) => dispatch('menuAction', e.detail)}
      />
    </HUD>
  {/if}
  
  <!-- Debug layer (stats, debug info, etc.) -->
  {#if debugLayer.enabled}
    <HUD>
      <DebugHUD
        config={debugLayer}
        {theme}
        {scale}
        {currentBreakpoint}
      />
    </HUD>
  {/if}
{/if}
```

### 3. Create HUD Layer Components

Example of a gameplay HUD layer component (`GameplayHUD.svelte`):

```svelte
<script lang="ts">
  import { T, useThree, useFrame } from '@threlte/core';
  import { useViewport, useCursor } from '@threlte/extras';
  
  // Props
  export let config = {
    components: {
      healthBar: { enabled: true, position: 'bottom-left' },
      ammoCounter: { enabled: true, position: 'bottom-right' },
      minimap: { enabled: true, position: 'top-right' },
      crosshair: { enabled: true }
    }
  };
  export let theme = {};
  export let scale = 1.0;
  export let currentBreakpoint = 'md';
  
  // Get viewport dimensions
  const viewport = useViewport();
  
  // Create orthographic camera for HUD
  onMount(() => {
    // Setup HUD camera and scene
  });
  
  // Position helpers
  function getPositionForElement(position, elementWidth, elementHeight) {
    const width = $viewport.width;
    const height = $viewport.height;
    const padding = theme.padding * scale;
    
    switch (position) {
      case 'top-left':
        return { x: padding, y: padding };
      case 'top-center':
        return { x: (width - elementWidth) / 2, y: padding };
      case 'top-right':
        return { x: width - elementWidth - padding, y: padding };
      case 'middle-left':
        return { x: padding, y: (height - elementHeight) / 2 };
      case 'middle-center':
        return { x: (width - elementWidth) / 2, y: (height - elementHeight) / 2 };
      case 'middle-right':
        return { x: width - elementWidth - padding, y: (height - elementHeight) / 2 };
      case 'bottom-left':
        return { x: padding, y: height - elementHeight - padding };
      case 'bottom-center':
        return { x: (width - elementWidth) / 2, y: height - elementHeight - padding };
      case 'bottom-right':
        return { x: width - elementWidth - padding, y: height - elementHeight - padding };
      default:
        return { x: 0, y: 0 };
    }
  }
</script>

<T.OrthographicCamera
  makeDefault
  position={[0, 0, 100]}
  zoom={1}
  left={-$viewport.width / 2}
  right={$viewport.width / 2}
  top={$viewport.height / 2}
  bottom={-$viewport.height / 2}
  near={0.1}
  far={1000}
/>

<!-- Health Bar Component -->
{#if config.components.healthBar?.enabled}
  {@const elementWidth = 200 * scale}
  {@const elementHeight = 30 * scale}
  {@const pos = getPositionForElement(config.components.healthBar.position, elementWidth, elementHeight)}
  
  <T.Group position={[pos.x - $viewport.width / 2 + elementWidth / 2, $viewport.height / 2 - pos.y - elementHeight / 2, 0]}>
    <!-- Health bar background -->
    <T.Mesh>
      <T.PlaneGeometry args={[elementWidth, elementHeight]} />
      <T.MeshBasicMaterial 
        color={theme.backgroundColor} 
        transparent={true}
        opacity={0.7}
      />
    </T.Mesh>
    
    <!-- Health bar fill -->
    <T.Mesh position={[0, 0, 1]}>
      <T.PlaneGeometry args={[elementWidth * 0.95 * 0.8, elementHeight * 0.7]} /> <!-- 80% health example -->
      <T.MeshBasicMaterial color={theme.primaryColor} />
    </T.Mesh>
    
    <!-- Health bar text (would use HTML or ThreeJS text) -->
  </T.Group>
{/if}

<!-- Ammo Counter Component -->
{#if config.components.ammoCounter?.enabled}
  {@const elementWidth = 150 * scale}
  {@const elementHeight = 40 * scale}
  {@const pos = getPositionForElement(config.components.ammoCounter.position, elementWidth, elementHeight)}
  
  <T.Group position={[pos.x - $viewport.width / 2 + elementWidth / 2, $viewport.height / 2 - pos.y - elementHeight / 2, 0]}>
    <!-- Ammo counter background -->
    <T.Mesh>
      <T.PlaneGeometry args={[elementWidth, elementHeight]} />
      <T.MeshBasicMaterial 
        color={theme.backgroundColor} 
        transparent={true}
        opacity={0.7}
      />
    </T.Mesh>
    
    <!-- Ammo counter would go here -->
  </T.Group>
{/if}

<!-- Minimap Component -->
{#if config.components.minimap?.enabled}
  {@const size = config.components.minimap.size === 'small' ? 100 : config.components.minimap.size === 'large' ? 200 : 150}
  {@const elementWidth = size * scale}
  {@const elementHeight = size * scale}
  {@const pos = getPositionForElement(config.components.minimap.position, elementWidth, elementHeight)}
  
  <T.Group position={[pos.x - $viewport.width / 2 + elementWidth / 2, $viewport.height / 2 - pos.y - elementHeight / 2, 0]}>
    <!-- Minimap background -->
    <T.Mesh>
      <T.CircleGeometry args={[elementWidth / 2, 32]} />
      <T.MeshBasicMaterial 
        color={theme.backgroundColor} 
        transparent={true}
        opacity={0.8}
      />
    </T.Mesh>
    
    <!-- Minimap contents would go here -->
  </T.Group>
{/if}

<!-- Crosshair Component -->
{#if config.components.crosshair?.enabled}
  {@const size = config.components.crosshair.size === 'small' ? 20 : config.components.crosshair.size === 'large' ? 40 : 30}
  {@const elementSize = size * scale}
  
  <T.Group position={[0, 0, 0]}>
    <!-- Crosshair horizontal line -->
    <T.Mesh>
      <T.PlaneGeometry args={[elementSize, elementSize / 10]} />
      <T.MeshBasicMaterial color={config.components.crosshair.color || theme.primaryColor} />
    </T.Mesh>
    
    <!-- Crosshair vertical line -->
    <T.Mesh>
      <T.PlaneGeometry args={[elementSize / 10, elementSize]} />
      <T.MeshBasicMaterial color={config.components.crosshair.color || theme.primaryColor} />
    </T.Mesh>
  </T.Group>
{/if}
```

### 4. Create HUD Types and Interfaces

```typescript
// hudTypes.ts

export interface HUDTheme {
  fontFamily: string;
  fontSize: number;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  warningColor: string;
  dangerColor: string;
  borderRadius: number;
  padding: number;
  spacing: number;
}

export interface HUDComponentConfig {
  enabled: boolean;
  position?: string;
  style?: string;
  [key: string]: any;
}

export interface HUDLayerConfig {
  name: string;
  enabled: boolean;
  zIndex: number;
  opacity: number;
  components: {
    [key: string]: HUDComponentConfig;
  };
}

export interface HUDNotification {
  id: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
  createdAt: number;
  duration: number;
}

export interface HUDAnimationConfig {
  enabled: boolean;
  duration: number;
  easing: string;
}

export interface HUDResponsiveConfig {
  breakpoints: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  adaptToScreenSize: boolean;
  scaleFactor: number;
}

export interface HUDConfig {
  enabled: boolean;
  layers: {
    [key: string]: HUDLayerConfig;
  };
  themes: {
    [key: string]: HUDTheme;
  };
  activeTheme: string;
  animations: HUDAnimationConfig;
  responsive: HUDResponsiveConfig;
  notifications: HUDNotification[];
}

export type BreakpointSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
```

### 5. HTML-Based UI Component System

For more complex UI components, create a system that leverages HTML with Threlte's HTML component:

```svelte
<!-- HTMLUIComponent.svelte -->
<script lang="ts">
  import { HTML } from '@threlte/extras';
  import { onMount } from 'svelte';
  
  // Props
  export let position = { x: 0, y: 0, z: 0 };
  export let rotation = { x: 0, y: 0, z: 0 };
  export let scale = 1.0;
  export let transform = true;
  export let occlude = false;
  export let theme = {};
  export let zIndexOffset = 0;
  
  // Root element
  let element;
  
  // Apply theme to element
  onMount(() => {
    applyTheme(element, theme);
  });
  
  // Apply theme to element and children
  function applyTheme(el, theme) {
    if (!el || !theme) return;
    
    // Apply theme styles to element
    Object.assign(el.style, {
      fontFamily: theme.fontFamily,
      fontSize: `${theme.fontSize * scale}px`,
      color: theme.textColor,
      '--primary-color': theme.primaryColor,
      '--secondary-color': theme.secondaryColor,
      '--background-color': theme.backgroundColor,
      '--text-color': theme.textColor,
      '--accent-color': theme.accentColor,
      '--warning-color': theme.warningColor,
      '--danger-color': theme.dangerColor,
      '--border-radius': `${theme.borderRadius * scale}px`,
      '--padding': `${theme.padding * scale}px`,
      '--spacing': `${theme.spacing * scale}px`
    });
  }
</script>

<HTML
  position={[position.x, position.y, position.z]}
  rotation={[rotation.x, rotation.y, rotation.z]}
  transform={transform}
  occlude={occlude}
  zIndexRange={[1000 + zIndexOffset, 1100 + zIndexOffset]}
>
  <div bind:this={element} class="html-ui-component">
    <slot />
  </div>
</HTML>

<style>
  .html-ui-component {
    transform-origin: center center;
    transform: scale(var(--scale, 1));
    transition: all 0.2s ease;
  }
</style>
```

### 6. Integration with Game State

Create a system to bind the HUD components to the game state:

```typescript
// hudBindings.ts

import { derived, writable, type Readable } from 'svelte/store';

// Store for player state
export const playerState = writable({
  health: 100,
  maxHealth: 100,
  shield: 50,
  maxShield: 50,
  ammo: 30,
  maxAmmo: 30,
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  experience: 0,
  level: 1
});

// Store for game state
export const gameState = writable({
  paused: false,
  score: 0,
  time: 0,
  objective: 'Explore the area',
  objectiveProgress: 0,
  enemiesKilled: 0,
  itemsCollected: 0
});

// Derived stores for HUD components
export const healthPercentage: Readable<number> = derived(
  playerState,
  $playerState => ($playerState.health / $playerState.maxHealth) * 100
);

export const shieldPercentage: Readable<number> = derived(
  playerState,
  $playerState => ($playerState.shield / $playerState.maxShield) * 100
);

export const ammoPercentage: Readable<number> = derived(
  playerState,
  $playerState => ($playerState.ammo / $playerState.maxAmmo) * 100
);

// Function to update player state from game
export function updatePlayerState(newState) {
  playerState.update(state => ({ ...state, ...newState }));
}

// Function to update game state
export function updateGameState(newState) {
  gameState.update(state => ({ ...state, ...newState }));
}
```

### 7. Integration Plan
1. Add HUDExtension to the available Studio extensions
2. Create HUDManager and related components
3. Implement HUD layers for different UI states (gameplay, menus, etc.)
4. Create UI component library with consistent styling
5. Connect HUD to game state through stores/bindings
6. Implement responsive scaling for different screen sizes

### 8. Migration Steps
1. Create HUDExtension.svelte in the extensions directory
2. Create hud subdirectory for components
3. Implement HUDManager.svelte
4. Implement layer components (GameplayHUD.svelte, etc.)
5. Create hudTypes.ts and hudBindings.ts
6. Build reusable UI components
7. Test thoroughly on different screen sizes
8. Integrate with other extensions (particularly Player/Camera)

## Features for Future Enhancement
- Customizable UI layouts through editor
- Drag-and-drop UI component placement
- UI animation system
- Component templates library
- Interactive UI tutorials
- VR-compatible HUD elements
- Multi-player split-screen HUD support
- Dynamic UI based on game context
- Localization support
- Accessibility features

## Performance Considerations
- Minimize Three.js draw calls for UI elements
- Use instanced meshes for repeated elements
- Cache DOM elements for HTML-based UI
- Use efficient state management to minimize rerenders
- Properly clean up event listeners
- Batch UI updates
- Lazy-load UI components when possible
- Use texture atlases for UI elements
- Consider LOD for complex UI at different distances 