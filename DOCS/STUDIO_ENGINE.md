# Studio Engine Architecture Plan

## Overview
Studio Engine is a modular, extensible framework for building 3D games with Svelte and Three.js, using the Threlte library. It provides a set of core extensions that handle common game development tasks, allowing developers to quickly prototype and build games without reinventing fundamental systems.

The architecture follows a modular extension pattern, where each major subsystem is implemented as a self-contained extension with its own state management, UI components, and functionality.

## Core Principles
1. **Modularity**: Each extension is self-contained and can be enabled/disabled independently
2. **Configurability**: All aspects of the engine can be configured through UI panels or API
3. **Persistence**: Settings and configurations are persisted across sessions
4. **Performance**: Systems are optimized for performance in 3D environments
5. **Flexibility**: Support for different game types and genres
6. **Integration**: Extensions communicate with each other through a central registry

## Architecture Overview

```mermaid
flowchart TD
    subgraph StudioEngine["Studio Engine"]
        subgraph ExtReg["Extension Registry"]
            ER1["register"]
            ER2["retrieve"]
            ER3["communicate"]
        end
        
        subgraph Extensions["Extensions"]
            Ext1["SkyBox"] 
            Ext2["Renderer"]
            Ext3["Stats"]
            Ext4["Level Scene"]
            Ext5["..."]
        end
        
        ExtReg <--> Extensions
    end
    
    StudioEngine --- Three["Three.js / Threlte"]
    Three --- Svelte["Svelte"]
    
    style StudioEngine fill:#f9f9f9,stroke:#333,stroke-width:2px
    style ExtReg fill:#e1f5fe,stroke:#333,stroke-width:1px
    style Extensions fill:#e8f5e9,stroke:#333,stroke-width:1px
    style Three fill:#ede7f6,stroke:#333,stroke-width:1px
    style Svelte fill:#fff3e0,stroke:#333,stroke-width:1px
```

## Extension System
The heart of Studio Engine is its extension system. Extensions are modular components that add specific functionality to the engine. Each extension follows a standard pattern:

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
        // Persistent state with defaults
        setting1: persist('default-value'),
        setting2: persist(true),
        // ...
      };
    },
    actions: {
      // Methods that modify state or perform operations
      doSomething: (param) => {
        extension.state.setting1 = param;
      },
      // ...
    }
  });
</script>

<!-- Extension UI -->
<ToolbarItem position="left">
  <Panel title="Extension Name">
    <!-- Controls -->
  </Panel>
</ToolbarItem>

<!-- Content -->
<slot />
```

## Extension Architecture

```mermaid
classDiagram
    class Extension {
        +string scope
        +state
        +actions
        +createExtension()
    }
    
    class State {
        +persist()
        +settings
    }
    
    class Actions {
        +actionMethods()
    }
    
    class UI {
        +ToolbarItems
        +Panels
        +Controls
    }
    
    Extension *-- State
    Extension *-- Actions
    Extension *-- UI
    
    class StudioRegistry {
        +getExtension(scope)
        +emitEvent(name, data)
        +onEvent(name, callback)
    }
    
    StudioRegistry -- Extension
```

## Core Extensions

### 1. Level Scene Extension
The Level Scene extension is the top-level manager that ties everything together. It allows configuring all other extensions for different game levels and manages transitions between levels.

**Key Features:**
- Level definitions with extension configurations
- Level switching with transitions
- Game object management
- Level progression tracking

### 2. Player Camera Extension
Handles player controls and camera movement, with configurable control schemes for different game types.

**Key Features:**
- Multiple control schemes (spacecraft, FPS, third-person)
- Physics-based movement
- Camera management
- Input handling

### 3. Map Extension
Manages the game world and terrain, including points of interest and environmental features.

**Key Features:**
- Multiple map types and configurations
- Dynamic map loading
- Points of interest management
- Map rotation and positioning

### 4. Audio Extension
Provides comprehensive audio management with spatial audio support, categories, and presets.

**Key Features:**
- Audio categories (music, sfx, ambience, voice, UI)
- Spatial audio for 3D environments
- Volume controls
- Audio presets

### 5. Combat Extension
Centralizes combat mechanics including projectiles, hit detection, and damage handling.

**Key Features:**
- Projectile management
- Hit detection
- Weapon systems
- Team/faction management

### 6. Renderer Extension (Implemented)
Controls rendering settings, post-processing effects, and performance optimizations.

**Key Features:**
- Post-processing effects toggle
- Bloom configuration (intensity, threshold, smoothing)
- Anti-aliasing (SMAA)
- Vignette effects
- Reset to defaults

### 7. Stats Extension (Implemented)
Provides performance monitoring and debugging tools.

**Key Features:**
- FPS counter
- Milliseconds per frame
- Memory usage
- Toggle visibility

### 8. SkyBox Extension (Implemented)
Manages the sky and environment lighting.

**Key Features:**
- Day/Night cycle configuration
- Sky atmospheric properties
- Star field appearance and layers
- Constellation settings
- Moon properties and positioning
- Reset to defaults

## Extension Relationships

```mermaid
graph TD
    LevelScene["Level Scene"]
    Camera["Player Camera"]
    Map["Map"]
    Audio["Audio"]
    Combat["Combat"]
    Renderer["Renderer"]
    Stats["Stats"]
    SkyBox["SkyBox"]
    Physics["Rapier Physics"]
    Input["Input"]
    HUD["HUD"]
    
    LevelScene --> Camera
    LevelScene --> Map
    LevelScene --> Audio
    LevelScene --> Combat
    LevelScene --> Renderer
    LevelScene --> SkyBox
    LevelScene --> Physics
    LevelScene --> HUD
    
    Camera --> Input
    Combat --> Physics
    Combat --> Audio
    HUD --> Input
    
    style Renderer fill:#c8e6c9,stroke:#1b5e20,stroke-width:2px
    style Stats fill:#c8e6c9,stroke:#1b5e20,stroke-width:2px
    style SkyBox fill:#c8e6c9,stroke:#1b5e20,stroke-width:2px
    style LevelScene fill:#e1bee7,stroke:#6a1b9a,stroke-width:1px
    style Camera fill:#e1bee7,stroke:#6a1b9a,stroke-width:1px
    style Map fill:#e1bee7,stroke:#6a1b9a,stroke-width:1px
    style Audio fill:#e1bee7,stroke:#6a1b9a,stroke-width:1px
    style Combat fill:#e1bee7,stroke:#6a1b9a,stroke-width:1px
    style Physics fill:#e1bee7,stroke:#6a1b9a,stroke-width:1px
    style Input fill:#e1bee7,stroke:#6a1b9a,stroke-width:1px
    style HUD fill:#e1bee7,stroke:#6a1b9a,stroke-width:1px
```

## Extension Integration

Extensions communicate through the Extension Registry, which provides methods for:

1. **Registration**: Extensions register themselves with a unique scope
2. **Retrieval**: Components can retrieve extensions by scope
3. **Eventing**: Extensions can emit and listen for events
4. **State Access**: Authorized components can access and modify extension state

### Communication Example:

```typescript
// Extension A needs to notify Extension B about a change
const extensionA = useStudio().getExtension('extension-a');
const extensionB = useStudio().getExtension('extension-b');

// Direct method call
extensionB.actions.handleChange(newValue);

// Or through events
useStudio().emitEvent('objectSelected', { id: 'object-1' });

// Listening for events
useStudio().onEvent('objectSelected', (data) => {
  // Handle event
});
```

### Communication Flow

```mermaid
sequenceDiagram
    participant ExtA as Extension A
    participant Reg as Extension Registry
    participant ExtB as Extension B
    
    ExtA->>Reg: emitEvent('eventName', data)
    Reg->>ExtB: notify via onEvent handler
    ExtB->>ExtB: update internal state
    
    alt Direct Method Call
        ExtA->>Reg: getExtension('extension-b')
        Reg-->>ExtA: return ExtB reference
        ExtA->>ExtB: call actions.someMethod()
    end
```

## Level System Integration

The Level Scene extension serves as a controller for all other extensions, configuring them based on the current level:

```typescript
// When loading a new level
function loadLevel(levelId) {
  // Get level configuration
  const levelConfig = levels[levelId];
  
  // Configure each extension
  Object.entries(levelConfig.extensions).forEach(([extName, config]) => {
    const extension = useStudio().getExtension(extName);
    if (extension) {
      // Apply configuration
      Object.entries(config).forEach(([key, value]) => {
        if (extension.actions.updateSetting) {
          extension.actions.updateSetting(key, value);
        } else {
          extension.state[key] = value;
        }
      });
    }
  });
  
  // Load game objects
  levelConfig.gameObjects.forEach(obj => {
    // Create game objects in the scene
  });
}
```

### Level System Flow

```mermaid
flowchart TD
    LevelConfig[("Level Config\n(JSON/Object)")]
    LevelScene["Level Scene Extension"]
    Ext1["SkyBox Extension"]
    Ext2["Renderer Extension"]
    Ext3["Audio Extension"]
    GameObjects["Game Objects"]
    
    LevelConfig -->|load| LevelScene
    LevelScene -->|configure| Ext1
    LevelScene -->|configure| Ext2
    LevelScene -->|configure| Ext3
    LevelScene -->|create| GameObjects
    
    subgraph Level["Level Instance"]
        Ext1
        Ext2
        Ext3
        GameObjects
    end
    
    style LevelConfig fill:#fff9c4,stroke:#f57f17,stroke-width:1px
    style LevelScene fill:#bbdefb,stroke:#0d47a1,stroke-width:2px
    style Level fill:#f3e5f5,stroke:#4a148c,stroke-width:1px,stroke-dasharray: 5 5
```

## Data Flow

The data flow in Studio Engine follows this pattern:

1. **User Interaction**: User interacts with UI or game
2. **Action Dispatch**: Actions are dispatched to the appropriate extension
3. **State Update**: Extension updates its internal state
4. **UI Update**: UI components react to state changes
5. **Scene Update**: Three.js/Threlte scene updates based on state

```mermaid
flowchart LR
    User((User))
    UI["UI Controls"]
    Action["Extension Actions"]
    State["Extension State"]
    UIComp["UI Components"]
    Scene["Three.js Scene"]
    
    User -->|interact| UI
    UI -->|dispatch| Action
    Action -->|modify| State
    State -->|react| UIComp
    State -->|update| Scene
    Scene -->|render| User
    
    style User fill:#e8eaf6,stroke:#3949ab,stroke-width:2px
    style UI fill:#e3f2fd,stroke:#1565c0,stroke-width:1px
    style Action fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px
    style State fill:#fffde7,stroke:#f9a825,stroke-width:1px
    style UIComp fill:#e3f2fd,stroke:#1565c0,stroke-width:1px
    style Scene fill:#fff3e0,stroke:#e65100,stroke-width:1px
```

## Implementation Steps

### 1. Core Framework
- Set up Threlte and Three.js integration
- Implement extension registry
- Create base extension patterns
- Establish communication protocols

### 2. Individual Extensions
- Implement each core extension
- Design and implement extension UIs
- Create extension-specific components
- Establish extension tests

### 3. Integration
- Implement communication between extensions
- Create level management system
- Integrate extensions with level system
- Develop demo showcasing extension integration

### 4. Optimization
- Performance profiling
- Memory management
- Rendering optimizations
- Load time improvements

### 5. Documentation
- API documentation
- Usage examples
- Extension development guide
- Performance best practices

## Usage Example

There are two ways to use Studio Engine extensions:

### Method 1: Using the Studio component with extensions prop (Recommended)

```svelte
<script>
  import { Studio } from '@threlte/studio';
  import { Canvas } from '@threlte/core';
  
  // Import extensions
  import StatsExtension from '$lib/extensions/StatsExtension.svelte';
  import RendererExtension from '$lib/extensions/RendererExtension.svelte';
  import SkyBoxExtension from '$lib/extensions/SkyBoxExtension.svelte';
  
  // Custom game components
  import DemoScene from '$lib/demo/demoScene.svelte';
</script>

<Canvas>
  <Studio extensions={[StatsExtension, RendererExtension, SkyBoxExtension]}>
    <DemoScene />
  </Studio>
</Canvas>
```

### Method 2: Using extension components directly

```svelte
<script>
  import { Canvas } from '@threlte/core';
  
  // Import components
  import SkyBox from '$lib/components/SkyBox.svelte';
  import Renderer from '$lib/components/Renderer.svelte';
  import DemoScene from '$lib/demo/demoScene.svelte';
</script>

<Canvas>
  <SkyBox />
  <Renderer />
  <DemoScene />
</Canvas>
```

## Extension Development

To create a new extension, developers follow these steps:

1. Create an extension component using the extension pattern
2. Define the extension state and persistence needs
3. Implement actions for state manipulation
4. Create UI components for the extension
5. Register the extension with the Studio Engine
6. Implement integration with other extensions as needed
7. Create documentation following the extension template

## Future Extensions

Potential future extensions include:

1. **Rapier Physics Extension**: Advanced physics simulation
2. **Input Extension**: Advanced input handling and mapping
3. **HUD Extension**: Heads-up display and UI overlays
4. **Inventory Extension**: Item and inventory systems
5. **Quest Extension**: Mission and objective tracking
6. **Save System Extension**: Game saving and loading
7. **Weather Extension**: Dynamic weather effects
8. **Dialogue Extension**: Character dialogue systems

## Conclusion

Studio Engine provides a comprehensive framework for building 3D games with Svelte and Three.js (Threlte). Its modular extension architecture allows for flexibility and customization while providing the core functionality needed for game development. By separating concerns into focused extensions, it enables developers to build complex games without becoming overwhelmed by interdependent systems. 