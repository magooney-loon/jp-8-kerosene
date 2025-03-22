# Renderer Extension Documentation

## Overview
The Renderer Extension controls the visual quality and post-processing effects in the Studio Engine. It provides options for configuring bloom, anti-aliasing, vignette, and other visual effects to enhance the game's appearance.

## Current Implementation
The Renderer extension is implemented with the following features:

- Post-processing effects toggle
- Bloom with configurable intensity, threshold, and smoothing
- SMAA anti-aliasing toggle
- Vignette effect with configurable offset and darkness
- Reset to defaults functionality

## Usage

```svelte
<script>
  import RendererExtension from '$lib/extensions/RendererExtension.svelte';
</script>

<RendererExtension />
```

## Extension Architecture

### State
The extension's state includes:

```typescript
type RendererState = {
  // Core state property
  postProcessing: boolean // Whether post-processing is enabled
}
```

### Actions
The extension exposes these actions:

```typescript
type RendererActions = {
  // Core actions
  togglePostProcessing: () => void,
  setPostProcessing: (enabled: boolean) => void
}
```

### Store Integration
The extension uses a dedicated store (`rendererStore.ts`) with Svelte stores for various properties:

```typescript
// Core settings
export const postProcessingEnabled = writable<boolean>(RENDERER_DEFAULTS.postProcessing)

// Bloom settings
export const bloomEnabled = writable<boolean>(RENDERER_DEFAULTS.bloom.enabled)
export const bloomIntensity = writable<number>(RENDERER_DEFAULTS.bloom.intensity)
export const bloomLuminanceThreshold = writable<number>(RENDERER_DEFAULTS.bloom.luminanceThreshold)
export const bloomLuminanceSmoothing = writable<number>(RENDERER_DEFAULTS.bloom.luminanceSmoothing)

// Anti-aliasing settings
export const smaaEnabled = writable<boolean>(RENDERER_DEFAULTS.smaa.enabled)
export const smaaPreset = writable<string>(RENDERER_DEFAULTS.smaa.preset)

// Vignette settings
export const vignetteEnabled = writable<boolean>(RENDERER_DEFAULTS.vignette.enabled)
export const vignetteOffset = writable<number>(RENDERER_DEFAULTS.vignette.offset)
export const vignetteDarkness = writable<number>(RENDERER_DEFAULTS.vignette.darkness)
```

## UI Components
The Renderer extension provides the following UI components:

- Main toggle button for enabling/disabling post-processing effects
- Bloom panel with controls for:
  - Bloom toggle
  - Intensity slider
  - Threshold slider
  - Smoothing slider
- Anti-aliasing panel with SMAA toggle
- Vignette panel with:
  - Vignette toggle
  - Offset slider
  - Darkness slider
- Reset to defaults button

## Integration with Other Extensions
The Renderer extension integrates with:

- **SkyBox Extension**: Post-processing affects the appearance of the sky and stars
- **Level Scene Extension**: Level configurations can include renderer settings

## Configuration
Configure the Renderer extension within a level configuration:

```typescript
// Example configuration in LevelSceneExtension
extensions: {
  renderer: {
    postProcessing: true,
    bloom: {
      enabled: true,
      intensity: 1.5,
      luminanceThreshold: 0.2,
      luminanceSmoothing: 0.9
    },
    smaa: {
      enabled: true,
      preset: 'high'
    },
    vignette: {
      enabled: true,
      offset: 0.5,
      darkness: 0.7
    }
  }
}
```

## Implementation Details

### Key Components
- **Post-processing Pipeline**: Manages the sequence of post-processing effects
- **Bloom Effect**: Adds a glow to bright objects in the scene
- **SMAA Anti-aliasing**: Smooths jagged edges without significant performance impact
- **Vignette Effect**: Darkens the edges of the screen for a cinematic look

### Default Values
```typescript
export const RENDERER_DEFAULTS = {
  postProcessing: true,
  
  bloom: {
    enabled: true,
    intensity: 1.0,
    luminanceThreshold: 0.3,
    luminanceSmoothing: 0.9
  },
  
  smaa: {
    enabled: true,
    preset: 'medium'
  },
  
  vignette: {
    enabled: true,
    offset: 0.5,
    darkness: 0.5
  }
}
```

### Performance Considerations
- Post-processing can be entirely disabled for performance-critical scenarios
- Individual effects can be toggled separately to balance visual quality and performance
- SMAA provides a good balance between quality and performance compared to more expensive anti-aliasing methods

## Examples

### Basic Usage
```svelte
<RendererExtension />
```

### Custom Configuration
```svelte
<!-- Configuration is done via the rendererStore -->
<script>
  import { onMount } from 'svelte';
  import RendererExtension from '$lib/extensions/RendererExtension.svelte';
  import { postProcessingEnabled, bloomIntensity, vignetteEnabled } from '$lib/stores/rendererStore';
  
  onMount(() => {
    postProcessingEnabled.set(true);
    bloomIntensity.set(2.0); // More intense bloom
    vignetteEnabled.set(false); // No vignette
  });
</script>

<RendererExtension />
```

### Integration Example
Example showing integration with the Level Scene extension:

```svelte
<script>
  import { onMount } from 'svelte';
  import RendererExtension from '$lib/extensions/RendererExtension.svelte';
  import LevelSceneExtension from '$lib/extensions/LevelSceneExtension.svelte';
  import { useStudio } from '@threlte/studio/extend';
  
  onMount(() => {
    // Get extensions
    const rendererExt = useStudio().getExtension('renderer-extension');
    const levelExt = useStudio().getExtension('level-scene');
    
    // Respond to level changes
    useStudio().onEvent('levelChanged', (data) => {
      const level = data.level;
      if (level.extensions.renderer) {
        rendererExt.actions.setPostProcessing(level.extensions.renderer.postProcessing);
        // Apply other renderer settings
      }
    });
  });
</script>

<RendererExtension />
<LevelSceneExtension />
```

## Future Improvements
Planned improvements for future versions:

- Additional post-processing effects (depth of field, motion blur, color grading)
- Screen-space reflections
- Ambient occlusion settings
- Shadow quality controls
- Automatic quality presets based on device performance
- HDR and tone mapping controls
- Custom shader support 