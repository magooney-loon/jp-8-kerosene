# Studio Engine Extensions

This folder contains extensions that provide functionality for various aspects of the Studio Engine. Each extension follows a standard pattern and can be independently enabled/disabled.

## Extension Architecture

All extensions follow this pattern:

```svelte
<script lang="ts">
  import { useStudio } from '@threlte/studio/extend';
  
  // Extension scope - must be unique
  const extensionScope = 'extension-name';
  
  // Create the extension
  const { createExtension } = useStudio();
  
  // Define the extension state and actions types
  type ExtensionState = {
    // State properties
  }
  
  type ExtensionActions = {
    // Action methods
  }
  
  const extension = createExtension<ExtensionState, ExtensionActions>({
    scope: extensionScope,
    state({ persist }) {
      return {
        // Your state here with persist() for values you want saved
      };
    },
    actions: {
      // Your actions here
    }
  });
</script>

<!-- Extension UI -->
<ToolbarItem position="left">
  <!-- Your controls here -->
</ToolbarItem>

<slot />
```

## Available Extensions

### RendererExtension

Controls post-processing effects like bloom, anti-aliasing, and vignette.

```svelte
<script>
  import RendererExtension from '$lib/extensions/RendererExtension.svelte';
</script>

<RendererExtension />
```

**Key Features:**
- Toggle post-processing effects
- Bloom configuration (intensity, threshold, smoothing)
- Anti-aliasing (SMAA)
- Vignette effects
- Reset to defaults

### SkyBoxExtension

Controls the skybox, stars, atmospheric effects, and day/night cycle.

```svelte
<script>
  import SkyBoxExtension from '$lib/extensions/SkyBoxExtension.svelte';
</script>

<SkyBoxExtension />
```

**Key Features:**
- Day/Night cycle configuration
- Sky atmospheric properties (rayleigh, turbidity, etc.)
- Star field appearance and layers
- Constellation settings
- Moon properties and positioning
- Reset to defaults

### StatsExtension

Provides performance monitoring tools.

```svelte
<script>
  import StatsExtension from '$lib/extensions/StatsExtension.svelte';
</script>

<StatsExtension />
```

**Key Features:**
- FPS counter
- Milliseconds per frame
- Memory usage
- Toggle visibility

## Planned Extensions

The following extensions are planned or in development:

### LevelSceneExtension

Manages level configuration, transitions, and game object management.

**Key Features:**
- Level definitions with extension configurations
- Level switching with transitions
- Game object management
- Level progression tracking

### PlayerCameraExtension

Handles player movement and camera controls.

**Key Features:**
- Multiple control schemes
- Physics-based movement
- Camera management
- Input handling

### MapExtension

Manages the game world and terrain.

**Key Features:**
- Map configuration
- Points of interest
- Map rotation and position

### AudioExtension

Provides sound management with spatial audio support.

**Key Features:**
- Audio categories (music, sfx, ambience, voice, UI)
- Spatial audio for 3D environments 
- Volume controls
- Audio presets

### CombatExtension

Centralizes combat mechanics and weapon systems.

**Key Features:**
- Projectile management
- Hit detection
- Weapon systems
- Team/faction management

## Adding New Extensions

When creating new extensions:

1. Create a new .svelte file in this directory
2. Follow the extension pattern shown above
3. Define a unique scope name for your extension
4. Create state and actions as needed
5. Add UI controls using Threlte's `ToolbarItem`, `ToolbarButton`, etc.
6. Add documentation to this README following the same format

## Extension Integration

Extensions can communicate with each other through the Extension Registry:

```typescript
// Get references to other extensions
const extensionA = useStudio().getExtension('extension-a');
const extensionB = useStudio().getExtension('extension-b');

// Direct method call
extensionB.actions.handleChange(newValue);

// Event-based communication
useStudio().emitEvent('objectSelected', { id: 'object-1' });
useStudio().onEvent('objectSelected', (data) => {
  // Handle event
});
``` 