# Studio Engine Documentation

## Overview
This folder contains documentation for the Studio Engine, a modular, extensible framework for building 3D games with Svelte and Three.js using the Threlte library.

## Architecture

The [Studio Engine Architecture Plan](STUDIO_ENGINE.md) provides a comprehensive overview of the engine's design principles, core components, and implementation approach.

```mermaid
flowchart TD
    subgraph StudioEngine["Studio Engine"]
        Registry["Extension Registry"]
        Registry <--> Extensions
        
        subgraph Extensions["Extensions"]
            Implemented["Implemented"]
            Planned["Planned"]
            
            subgraph Implemented
                SkyBox["SkyBox"]
                Renderer["Renderer"]
                Stats["Stats"]
            end
            
            subgraph Planned
                Scene["Level Scene"]
                Camera["Camera"]
                Map["Map"]
                Audio["Audio"]
                Combat["Combat"]
                Input["Input"]
                HUD["HUD"]
                Physics["Rapier Physics"]
            end
        end
    end
    
    StudioEngine --- Three["Three.js / Threlte"]
    Three --- Svelte["Svelte"]
    
    style StudioEngine fill:#f9f9f9,stroke:#333,stroke-width:2px
    style Registry fill:#e1f5fe,stroke:#333,stroke-width:1px
    style Extensions fill:#e8f5e9,stroke:#333,stroke-width:1px
    style Implemented fill:#c8e6c9,stroke:#1b5e20,stroke-width:2px
    style Planned fill:#e1bee7,stroke:#6a1b9a,stroke-width:1px
    style Three fill:#ede7f6,stroke:#333,stroke-width:1px
    style Svelte fill:#fff3e0,stroke:#333,stroke-width:1px
```

## Extensions

The Studio Engine is built around a modular extension system. Each extension handles a specific aspect of game development and can be enabled, disabled, or configured independently.

### Core Extensions

| Extension | Documentation | Implementation |
|-----------|---------------|----------------|
| 🌟 SkyBox | [EXT_SKYBOX.md](EXT_SKYBOX.md) | Implemented |
| 🎨 Renderer | [EXT_RENDERER.md](EXT_RENDERER.md) | Implemented |
| 📊 Stats | [EXT_STATS.md](EXT_STATS.md) | Implemented |
| 🎮 Level Scene | [EXT_SCENE.md](EXT_SCENE.md) | Planned |
| 📷 Camera | [EXT_CAMERA.md](EXT_CAMERA.md) | Planned |
| 🗺️ Map | [EXT_MAP.md](EXT_MAP.md) | Planned |
| 🔊 Audio | [EXT_AUDIO.md](EXT_AUDIO.md) | Planned |
| ⚔️ Combat | [EXT_COMBAT.md](EXT_COMBAT.md) | Planned |
| 📱 Input | [EXT_INPUT.md](EXT_INPUT.md) | Planned |
| 💻 HUD | [EXT_HUD.md](EXT_HUD.md) | Planned |
| 🧮 Rapier Physics | [EXT_RAPIER.md](EXT_RAPIER.md) | Planned |

## Using Extensions

There are two ways to use Studio Engine extensions:

```mermaid
flowchart TD
    subgraph Method1["Method 1: Using Studio component"]
        Studio["<Studio extensions={[...]}/>"]
        ExtImports1["Import extension components"] --> Studio
        Studio --> Content1["Game content"]
    end
    
    subgraph Method2["Method 2: Using components directly"]
        Components["<SkyBox/> <Renderer/> etc."]
        ExtImports2["Import component implementations"] --> Components
        Components --> Content2["Game content"]
    end
    
    style Method1 fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style Method2 fill:#ffecb3,stroke:#ff6f00,stroke-width:2px
```

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

This is an alternative approach as seen in App.svelte:

```svelte
<script>
  import { Canvas } from '@threlte/core';
  
  // Import components rather than extensions
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

## Creating New Extensions

To create a new extension:

1. Follow the [extension template](EXTENSION_TEMPLATE.md) to create documentation
2. Implement the extension following the pattern in existing extensions
3. Add documentation to this README

## Code Structure

```mermaid
flowchart TD
    Extensions["src/lib/extensions/
    Extension UI components"]
    Components["src/lib/components/
    Core implementations"]
    Stores["src/lib/stores/
    State management"]
    
    Extensions <--> Stores
    Components <--> Stores
    
    style Extensions fill:#bbdefb,stroke:#0d47a1,stroke-width:2px
    style Components fill:#c8e6c9,stroke:#1b5e20,stroke-width:2px
    style Stores fill:#ffecb3,stroke:#ff6f00,stroke-width:2px
```

The actual implementation of extensions can be found in:
- `/src/lib/extensions/` - Extension components (UI controls and configuration)
- `/src/lib/components/` - Core components (actual implementation)
- `/src/lib/stores/` - State stores for extensions

## Extension Architecture

```mermaid
classDiagram
    class Extension {
        +string scope
        +createExtension()
    }
    
    class State {
        +persist()
        +properties
    }
    
    class Actions {
        +methods()
    }
    
    class UI {
        +ToolbarItems
        +Controls
    }
    
    Extension *-- State : contains
    Extension *-- Actions : contains
    Extension *-- UI : renders
    
    note for Extension "Each extension is a standalone Svelte component"
```

All extensions follow a standard pattern:

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

## Level Scene Integration

```mermaid
flowchart TD
    LevelScene["Level Scene Extension"]
    config[("Level Configuration")]
    
    config -->|loads into| LevelScene
    LevelScene -->|configures| SkyBox["SkyBox"]
    LevelScene -->|configures| Renderer["Renderer"]
    LevelScene -->|configures| Audio["Audio"]
    LevelScene -->|configures| Camera["Camera"]
    LevelScene -->|manages| GameObjects["Game Objects"]
    
    style LevelScene fill:#bbdefb,stroke:#0d47a1,stroke-width:2px
    style config fill:#fff9c4,stroke:#f57f17,stroke-width:1px
    style SkyBox fill:#e1bee7,stroke:#6a1b9a,stroke-width:1px
    style Renderer fill:#e1bee7,stroke:#6a1b9a,stroke-width:1px
    style Audio fill:#e1bee7,stroke:#6a1b9a,stroke-width:1px
    style Camera fill:#e1bee7,stroke:#6a1b9a,stroke-width:1px
    style GameObjects fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px
```

The Level Scene extension serves as a central manager for configuring all other extensions based on the current game level. Each level includes extension configurations that set appropriate values for that level.

See [EXT_SCENE.md](EXT_SCENE.md) for more details on how extensions are integrated through the level system.

## Future Development

Studio Engine is under active development. The roadmap includes:

1. Implementing all planned extensions
2. Creating a robust level editing system
3. Supporting game state and saving/loading
4. Providing additional example games
5. Improving performance and compatibility

## Contributing

To contribute to Studio Engine:

1. Follow the extension architecture pattern
2. Create documentation using the template
3. Ensure your code is well-tested and performant
4. Submit a pull request with your changes 