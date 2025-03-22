# SkyBox Extension Documentation

## Overview
The SkyBox Extension provides controls for the sky, stars, day/night cycle, and atmospheric effects. It allows detailed customization of the sky appearance, star field, constellations, and moon properties.

## Current Implementation
The SkyBox extension is fully implemented with the following features:

- Day/night cycle with configurable timing
- Atmospheric sky settings (rayleigh, turbidity, etc.)
- Star field with multiple configurable layers
- Constellation system with customizable appearance
- Moon with configurable appearance and movement
- Reset to defaults functionality

## Usage

```svelte
<script>
  import SkyBoxExtension from '$lib/extensions/SkyBoxExtension.svelte';
</script>

<SkyBoxExtension />
```

## Extension Architecture

### State
The extension's state includes:

```typescript
type SkyBoxState = {
  // Core state property
  skybox: boolean // Whether the skybox is enabled
}
```

### Actions
The extension exposes these actions:

```typescript
type SkyBoxActions = {
  // Core actions
  toggleSkybox: () => void,
  setSkybox: (enabled: boolean) => void
}
```

### Store Integration
The extension uses a dedicated store (`skyboxStore.ts`) with Svelte stores for various properties:

```typescript
// Core settings
export const skyboxEnabled = writable<boolean>(SKYBOX_DEFAULTS.enabled)
export const cycleLengthMs = writable<number>(SKYBOX_DEFAULTS.cycleLengthMs)

// Sky atmospheric settings
export const skyRayleigh = writable<number>(SKYBOX_DEFAULTS.sky.rayleigh)
export const skyTurbidity = writable<number>(SKYBOX_DEFAULTS.sky.turbidity)
export const skyMieCoefficient = writable<number>(SKYBOX_DEFAULTS.sky.mieCoefficient)
export const skyMieDirectionalG = writable<number>(SKYBOX_DEFAULTS.sky.mieDirectionalG)

// Stars settings
export const starsDepth = writable<number>(SKYBOX_DEFAULTS.stars.depth)
export const starsLayers = writable<StarLayer[]>(SKYBOX_DEFAULTS.stars.layers)
export const starsDawnApproach = writable<number>(SKYBOX_DEFAULTS.stars.dawnApproach)
export const starsDaylightStart = writable<number>(SKYBOX_DEFAULTS.stars.daylightStart)

// Constellation settings
export const constellationsCount = writable<number>(SKYBOX_DEFAULTS.stars.constellations.count)
export const constellationsSize = writable<number>(SKYBOX_DEFAULTS.stars.constellations.size)
export const constellationsDepth = writable<number>(SKYBOX_DEFAULTS.stars.constellations.depth)
export const constellationsFactor = writable<number>(SKYBOX_DEFAULTS.stars.constellations.factor)
export const constellationsSpeed = writable<number>(SKYBOX_DEFAULTS.stars.constellations.speed)
export const constellationsRadius = writable<number>(SKYBOX_DEFAULTS.stars.constellations.radius)
export const constellationsSaturation = writable<number>(SKYBOX_DEFAULTS.stars.constellations.saturation)
export const constellationsColor = writable<string>(SKYBOX_DEFAULTS.stars.constellations.color)

// Moon settings
export const moonEnabled = writable<boolean>(SKYBOX_DEFAULTS.moon.enabled)
export const moonSize = writable<number>(SKYBOX_DEFAULTS.moon.size)
export const moonDistance = writable<number>(SKYBOX_DEFAULTS.moon.distance)
export const moonOffset = writable<number>(SKYBOX_DEFAULTS.moon.offset)
export const moonColor = writable<string>(SKYBOX_DEFAULTS.moon.color)
export const moonEmissiveEnabled = writable<boolean>(SKYBOX_DEFAULTS.moon.emissive.enabled)
export const moonEmissiveIntensity = writable<number>(SKYBOX_DEFAULTS.moon.emissive.intensity)
export const moonEmissiveColor = writable<string>(SKYBOX_DEFAULTS.moon.emissive.color)
export const moonPhaseEnabled = writable<boolean>(SKYBOX_DEFAULTS.moon.phase.enabled)
export const moonPhaseOffset = writable<number>(SKYBOX_DEFAULTS.moon.phase.offset)
export const moonHeightFactor = writable<number>(SKYBOX_DEFAULTS.moon.movement.heightFactor)
export const moonSpeedFactor = writable<number>(SKYBOX_DEFAULTS.moon.movement.speedFactor)
```

## UI Components
The SkyBox extension provides the following UI components:

- Main toggle button for enabling/disabling the skybox
- Day/Night cycle controls including cycle length
- Sky properties panel with atmospheric settings
- Stars panel with controls for star appearance and fading
- Star layers panel with controls for multiple star layers
- Constellation panel with detailed constellation settings
- Moon panel with controls for size, appearance, and orbit
- Reset to defaults button

## Integration with Other Extensions
The SkyBox extension integrates with:

- **Renderer Extension**: The skybox's appearance is affected by renderer settings like bloom
- **Level Scene Extension**: Level configurations can include skybox settings

## Configuration
Configure the SkyBox extension within a level configuration:

```typescript
// Example configuration in LevelSceneExtension
extensions: {
  skybox: {
    enabled: true,
    preset: 'deepspace',
    rotation: 25,
    ambientLightIntensity: 0.2,
    directionalLightIntensity: 0.3,
    cycleLengthMs: 600000, // 10 minutes
    sky: {
      rayleigh: 0.5,
      turbidity: 10,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8
    },
    stars: {
      enabled: true,
      depth: 80,
      dawnApproach: 0.3,
      daylightStart: 0.4
    },
    moon: {
      enabled: true,
      size: 0.5,
      distance: 40,
      offset: 0.2
    }
  }
}
```

## Implementation Details

### Key Components
- **Day/Night Cycle**: Controls the lighting and appearance of the sky based on time
- **Sky System**: Atmospheric scattering simulation for realistic sky appearance
- **Star System**: Multi-layered star field with visibility based on day/night cycle
- **Constellation System**: Procedurally generated constellations with customizable properties
- **Moon System**: Moon object with customizable appearance, phase, and orbit

### Default Values
```typescript
export const SKYBOX_DEFAULTS = {
  enabled: true,
  cycleLengthMs: 600000, // 10 minutes
  
  sky: {
    rayleigh: 1,
    turbidity: 10,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.8
  },
  
  stars: {
    depth: 80,
    dawnApproach: 0.35,
    daylightStart: 0.40,
    layers: [
      { size: 0.7, count: 1000, color: '#ffffff', speed: 0.0001 },
      { size: 0.5, count: 1500, color: '#ffffcc', speed: 0.00008 },
      { size: 0.3, count: 2000, color: '#ffddff', speed: 0.00005 }
    ],
    constellations: {
      count: 10,
      size: 1.0,
      depth: 85,
      factor: 1.0,
      speed: 0.2,
      radius: 1.0,
      saturation: 0.3,
      color: '#ffddee'
    }
  },
  
  moon: {
    enabled: true,
    size: 0.5,
    distance: 40,
    offset: 0.2,
    color: '#ffffff',
    emissive: {
      enabled: true,
      intensity: 0.7,
      color: '#aaaaff'
    },
    phase: {
      enabled: true,
      offset: 0
    },
    movement: {
      heightFactor: 1.0,
      speedFactor: 1.0
    }
  }
}
```

### Performance Considerations
- Star layers use instanced rendering for improved performance
- The star and constellation visibility calculations are optimized with caching
- The entire skybox can be disabled for performance-critical scenarios

## Examples

### Basic Usage
```svelte
<SkyBoxExtension />
```

### Custom Configuration
```svelte
<!-- Configuration is done via the skyboxStore -->
<script>
  import { onMount } from 'svelte';
  import SkyBoxExtension from '$lib/extensions/SkyBoxExtension.svelte';
  import { skyboxEnabled, cycleLengthMs, skyRayleigh } from '$lib/stores/skyboxStore';
  
  onMount(() => {
    skyboxEnabled.set(true);
    cycleLengthMs.set(300000); // 5-minute cycle
    skyRayleigh.set(0.8);
  });
</script>

<SkyBoxExtension />
```

### Integration Example
Example showing integration with the Level Scene extension:

```svelte
<script>
  import { onMount } from 'svelte';
  import SkyBoxExtension from '$lib/extensions/SkyBoxExtension.svelte';
  import LevelSceneExtension from '$lib/extensions/LevelSceneExtension.svelte';
  import { useStudio } from '@threlte/studio/extend';
  
  onMount(() => {
    // Get extensions
    const skyboxExt = useStudio().getExtension('skybox-extension');
    const levelExt = useStudio().getExtension('level-scene');
    
    // Respond to level changes
    useStudio().onEvent('levelChanged', (data) => {
      const level = data.level;
      if (level.extensions.skybox) {
        skyboxExt.actions.setSkybox(level.extensions.skybox.enabled);
        // Apply other skybox settings
      }
    });
  });
</script>

<SkyBoxExtension />
<LevelSceneExtension />
```

## Future Improvements
Planned improvements for future versions:

- Weather integration with dynamic cloud rendering
- Animated space backgrounds (nebulae, galaxies)
- Custom skybox texture support
- Procedural planet/celestial body rendering
- Day/night cycle driven by in-game time system 