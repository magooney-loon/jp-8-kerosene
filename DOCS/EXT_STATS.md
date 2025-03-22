# Stats Extension Documentation

## Overview
The Stats Extension provides performance monitoring tools for the Studio Engine. It displays real-time metrics such as frames per second (FPS), frame time in milliseconds, and memory usage to help developers optimize their games.

## Current Implementation
The Stats extension is implemented with the following features:

- Toggle for showing/hiding stats display
- FPS counter
- Frame time (ms) display
- Memory usage (MB) monitoring
- Integration with Threlte's built-in performance monitor

## Usage

```svelte
<script>
  import StatsExtension from '$lib/extensions/StatsExtension.svelte';
</script>

<StatsExtension />
```

## Extension Architecture

### State
The extension's state includes:

```typescript
type StatsState = {
  // Core state property
  visible: boolean // Whether the stats display is visible
}
```

### Actions
The extension exposes these actions:

```typescript
type StatsActions = {
  // Core actions
  toggleStats: () => void,
  setVisible: (visible: boolean) => void
}
```

## UI Components
The Stats extension provides the following UI components:

- Main toggle button for showing/hiding the stats display
- Three stats panels positioned at the bottom left of the screen:
  - FPS counter (frames per second)
  - MS display (milliseconds per frame)
  - MB counter (memory usage)
- Threlte PerfMonitor component when stats are visible

## Integration with Other Extensions
The Stats extension is primarily a utility for developers and doesn't directly interact with other extensions. However, it can be useful to:

- Monitor the performance impact of other extensions
- Debug performance issues in complex scenes
- Ensure the game maintains a target framerate when multiple extensions are active

## Configuration
Configure the Stats extension within a level configuration:

```typescript
// Example configuration in LevelSceneExtension
extensions: {
  stats: {
    visible: false // Hide stats in production builds
  }
}
```

## Implementation Details

### Key Components
- **Stats Panels**: Uses the Three.js Stats module to display performance metrics
- **Animation Frame Loop**: Updates the stats displays on every animation frame
- **DOM Management**: Handles the addition and removal of stats DOM elements
- **Threlte PerfMonitor**: Integrates with Threlte's built-in performance monitor

### Performance Considerations
- The stats display itself has a small performance impact
- Can be disabled in production builds
- Useful for identifying performance bottlenecks during development

## Examples

### Basic Usage
```svelte
<StatsExtension />
```

### Custom Configuration
```svelte
<script>
  import { onMount } from 'svelte';
  import StatsExtension from '$lib/extensions/StatsExtension.svelte';
  import { useStudio } from '@threlte/studio/extend';
  
  onMount(() => {
    // Get the stats extension
    const statsExt = useStudio().getExtension('stats-extension');
    
    // Hide stats initially
    statsExt.actions.setVisible(false);
    
    // Toggle stats when pressing F3 key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F3') {
        statsExt.actions.toggleStats();
      }
    });
  });
</script>

<StatsExtension />
```

### Integration Example
Example showing integration with debug mode:

```svelte
<script>
  import { onMount } from 'svelte';
  import StatsExtension from '$lib/extensions/StatsExtension.svelte';
  import { useStudio } from '@threlte/studio/extend';
  
  // Debug mode flag
  let debugMode = false;
  
  onMount(() => {
    // Get the stats extension
    const statsExt = useStudio().getExtension('stats-extension');
    
    // Function to toggle debug mode
    function toggleDebugMode() {
      debugMode = !debugMode;
      statsExt.actions.setVisible(debugMode);
      
      // Also enable other debug features...
    }
    
    // Register global command for toggling debug mode
    window.toggleDebugMode = toggleDebugMode;
  });
</script>

<StatsExtension />

<!-- Debug controls UI -->
{#if debugMode}
  <div class="debug-controls">
    <!-- Debug UI components -->
  </div>
{/if}
```

## Future Improvements
Planned improvements for future versions:

- Custom statistics for game-specific metrics
- Expanded metrics (draw calls, triangle count, texture memory)
- Performance logging and history visualization
- Customizable positioning of stats panels
- Performance budget warnings
- CPU/GPU usage breakdown (where supported by browsers)
- Network performance monitoring for multiplayer games 