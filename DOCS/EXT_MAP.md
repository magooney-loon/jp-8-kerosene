# Map System Refactoring Plan

## Current State
- Map implementation is contained within demoTerrain.svelte
- Hard-coded map model (meteora_greece.glb)
- Basic rotation and position logic based on player movement
- Map enhancements (Godzilla, King Kong) directly embedded in terrain component
- No way to switch between different map types or terrain styles
- Limited configuration options

## Goals
1. Create a flexible, general-purpose map system as a Studio Engine extension
2. Support multiple map types and terrain styles
3. Provide easy configuration for game developers
4. Implement map features like:
   - Different biomes/environments
   - Time of day effects
   - Weather integration
   - Scale and positioning controls
   - Level of detail (LOD) management
5. Allow for runtime map switching

## Implementation Plan

### 1. Create Map Extension Component

Create a `MapExtension.svelte` component that follows the Studio Engine extension pattern:

```svelte
<script lang="ts">
  import { useStudio } from '@threlte/studio/extend';
  import { ToolbarItem, Panel } from '@threlte/studio';
  
  // Extension scope
  const extensionScope = 'map';
  
  // Create the extension
  const { createExtension } = useStudio();
  
  const extension = createExtension({
    scope: extensionScope,
    state({ persist }) {
      return {
        // General map settings
        activeMap: persist('default'),
        scale: persist(3),
        parallaxFactor: persist(0.01),
        rotationEnabled: persist(true),
        rotationSpeed: persist(0.0001),
        
        // Map types with configurations
        maps: persist({
          default: {
            url: '/maps/default.glb',
            scale: 3,
            position: [0, 0, 0],
            rotation: [0, 0, 0]
          },
          'meteora-greece': {
            url: '/mainMenu/map/meteora_greece.glb',
            scale: 3,
            position: [0, 0, 0],
            rotation: [0, 1, 0.001]
          },
          desert: {
            url: '/maps/desert.glb',
            scale: 5,
            position: [0, -10, 0],
            rotation: [0, 0, 0]
          },
          ocean: {
            url: '/maps/ocean.glb',
            scale: 4,
            position: [0, -20, 0],
            rotation: [0, 0, 0]
          },
          // More map types
        }),
        
        // Advanced features
        features: persist({
          enhancedObjects: true,
          objectDensity: 0.8,
          lodDistance: 1000,
          fogEnabled: true
        }),
        
        // POIs (Points of Interest)
        pointsOfInterest: persist([
          {
            id: 'godzilla',
            enabled: true,
            model: '/mainMenu/godzilla/scene.gltf',
            position: [1500, -350, -190],
            rotation: [0, -20, 0],
            scale: 10
          },
          {
            id: 'kingkong',
            enabled: true,
            model: '/mainMenu/kingkong/scene.gltf',
            position: [380, -360, 360],
            rotation: [0, 2.7, 0],
            scale: 200
          }
        ])
      };
    },
    actions: {
      // Map selection and configuration
      setActiveMap: (mapId) => {
        extension.state.activeMap = mapId;
      },
      
      // Map scale and position
      setMapScale: (scale) => {
        extension.state.scale = scale;
      },
      
      // Toggle features
      toggleFeature: (featureId, enabled) => {
        if (extension.state.features.hasOwnProperty(featureId)) {
          extension.state.features[featureId] = enabled;
        }
      },
      
      // POI management
      togglePOI: (poiId, enabled) => {
        const poiIndex = extension.state.pointsOfInterest.findIndex(poi => poi.id === poiId);
        if (poiIndex >= 0) {
          extension.state.pointsOfInterest[poiIndex].enabled = enabled;
        }
      },
      
      // Add custom POI
      addPOI: (poi) => {
        extension.state.pointsOfInterest.push(poi);
      },
      
      // Remove POI
      removePOI: (poiId) => {
        const poiIndex = extension.state.pointsOfInterest.findIndex(poi => poi.id === poiId);
        if (poiIndex >= 0) {
          extension.state.pointsOfInterest.splice(poiIndex, 1);
        }
      }
    }
  });
</script>

<!-- Extension UI -->
<ToolbarItem position="left">
  <Panel title="Map Settings">
    <!-- Map selection and controls would go here -->
  </Panel>
</ToolbarItem>

<slot />
```

### 2. Create MapManager Component

Create a `MapManager.svelte` as the core component:

```svelte
<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import { GLTF, useDraco } from '@threlte/extras';
  import * as THREE from 'three';
  import { onDestroy } from 'svelte';
  
  // Props for map control
  export let activeMap = 'default';
  export let mapConfig = {
    url: '/maps/default.glb',
    scale: 3,
    position: [0, 0, 0],
    rotation: [0, 0, 0]
  };
  export let rotationEnabled = true;
  export let rotationSpeed = 0.0001;
  export let parallaxFactor = 0.01;
  export let worldOffset = { x: 0, y: 0, z: 0 };
  export let virtualVelocity = { x: 0, y: 0, z: 0 };
  export let speed = 0;
  
  // For POIs (Points of Interest)
  export let pointsOfInterest = [];
  
  // References
  let mapRef;
  let mapRotation = { x: 0, y: 0, z: 0 };
  const dracoLoader = useDraco();
  
  // Update map rotation based on movement
  useTask((delta) => {
    if (!mapRef || !rotationEnabled) return;
    
    // Scale rotation speed based on ship speed
    const speedFactor = Math.min(2, speed / 30) * delta;
    
    // Rotate based on velocity and speed
    mapRotation.y += (virtualVelocity.x * 0.0001) * speedFactor;
    mapRotation.x += (virtualVelocity.y * 0.0001) * speedFactor;
    
    // Constant rotation based on speed
    mapRotation.y += (speed * rotationSpeed) * delta;
    
    // Apply rotations with some constraints
    mapRef.rotation.set(
      THREE.MathUtils.clamp(mapRotation.x, -0.2, 0.2),  // Limit x tilt
      mapRotation.y,  // Allow full 360 on y
      mapRef.rotation.z
    );
    
    // Move map position based on world offset for parallax
    mapRef.position.x = -worldOffset.x * parallaxFactor;
    mapRef.position.z = -worldOffset.z * parallaxFactor;
  });
  
  // Clean up any resources
  onDestroy(() => {
    // Any cleanup needed
  });
</script>

<!-- Main map container -->
<T.Group bind:ref={mapRef}>
  <GLTF
    dracoLoader={dracoLoader}
    url={mapConfig.url}
    position={mapConfig.position}
    rotation={mapConfig.rotation}
    scale={mapConfig.scale}
  />
  
  <!-- Render POIs -->
  {#each pointsOfInterest.filter(poi => poi.enabled) as poi}
    <T.Group position={poi.position} rotation={poi.rotation} scale={poi.scale}>
      <GLTF
        dracoLoader={dracoLoader}
        url={poi.model}
      />
      <!-- POI could have other components like audio, effects, etc. -->
    </T.Group>
  {/each}
  
  <!-- Slot for additional content -->
  <slot />
</T.Group>
```

### 3. Create Map Presets and Utilities

Create a set of map presets and utility functions:

```typescript
// mapPresets.ts
export const mapPresets = {
  // Default empty map
  default: {
    url: '/maps/default.glb',
    name: 'Default Plain',
    description: 'A simple flat terrain',
    scale: 3,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    thumbnail: '/thumbnails/default_map.jpg',
    features: {
      water: false,
      trees: false,
      mountains: false
    }
  },
  
  // Greece 
  'meteora-greece': {
    url: '/mainMenu/map/meteora_greece.glb',
    name: 'Meteora Greece',
    description: 'Rocky mountain landscape inspired by Meteora, Greece',
    scale: 3,
    position: [0, 0, 0],
    rotation: [0, 1, 0.001],
    thumbnail: '/thumbnails/meteora_map.jpg',
    features: {
      water: false,
      trees: true,
      mountains: true
    }
  },
  
  // Desert
  desert: {
    url: '/maps/desert.glb',
    name: 'Desert Wasteland',
    description: 'Vast desert with sand dunes and rock formations',
    scale: 5,
    position: [0, -10, 0],
    rotation: [0, 0, 0],
    thumbnail: '/thumbnails/desert_map.jpg',
    features: {
      water: false,
      trees: false,
      mountains: true,
      dunes: true
    }
  },
  
  // Ocean world
  ocean: {
    url: '/maps/ocean.glb',
    name: 'Ocean World',
    description: 'Water world with small islands and waves',
    scale: 4,
    position: [0, -20, 0],
    rotation: [0, 0, 0],
    thumbnail: '/thumbnails/ocean_map.jpg',
    features: {
      water: true,
      trees: true,
      mountains: false,
      islands: true
    }
  },
  
  // Add more map presets here
};

// Map utility functions
export function getMapConfig(mapId) {
  return mapPresets[mapId] || mapPresets.default;
}

export function getAvailableMaps() {
  return Object.keys(mapPresets).map(id => ({
    id,
    name: mapPresets[id].name,
    thumbnail: mapPresets[id].thumbnail,
    description: mapPresets[id].description
  }));
}
```

### 4. Create Map Types and Interfaces

```typescript
// mapTypes.ts
export interface MapConfig {
  url: string;
  name: string;
  description: string;
  scale: number;
  position: [number, number, number];
  rotation: [number, number, number];
  thumbnail: string;
  features: Record<string, boolean>;
}

export interface POI {
  id: string;
  enabled: boolean;
  model: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number | [number, number, number];
  audio?: {
    src: string;
    volume: number;
    distance: number;
    loop: boolean;
  };
  animation?: {
    enabled: boolean;
    speed: number;
  };
}

export interface MapState {
  activeMap: string;
  scale: number;
  parallaxFactor: number;
  rotationEnabled: boolean;
  rotationSpeed: number;
  maps: Record<string, MapConfig>;
  features: Record<string, boolean | number>;
  pointsOfInterest: POI[];
}
```

### 5. Specialized Map Components

#### BiomeEffect.svelte
```svelte
<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import * as THREE from 'three';
  
  export let type = 'forest';
  export let density = 0.5;
  export let radius = 100;
  export let center = [0, 0, 0];
  
  let instancedMeshRef;
  let count = Math.floor(density * radius * 10);
  let positions = [];
  let scales = [];
  
  // Different biome configs
  const biomeConfigs = {
    forest: {
      color: '#0a5c0a',
      maxHeight: 5,
      minHeight: 2,
      geometry: new THREE.ConeGeometry(1, 3, 8)
    },
    desert: {
      color: '#c2b280',
      maxHeight: 3,
      minHeight: 0.5,
      geometry: new THREE.CylinderGeometry(0, 0.8, 2, 6)
    },
    snow: {
      color: '#f0f0f0',
      maxHeight: 4,
      minHeight: 2,
      geometry: new THREE.ConeGeometry(1, 4, 8)
    }
  };
  
  // Initialize positions
  onMount(() => {
    // Generate random positions within radius
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;
      const x = center[0] + Math.cos(angle) * dist;
      const z = center[2] + Math.sin(angle) * dist;
      
      positions.push([x, center[1], z]);
      
      // Random scale for variety
      const scale = biomeConfigs[type].minHeight + 
        Math.random() * (biomeConfigs[type].maxHeight - biomeConfigs[type].minHeight);
      scales.push(scale);
    }
  });
</script>

<T.Group>
  <T.InstancedMesh 
    bind:ref={instancedMeshRef} 
    args={[biomeConfigs[type].geometry, null, count]}
  >
    <T.MeshStandardMaterial color={biomeConfigs[type].color} />
  </T.InstancedMesh>
</T.Group>
```

#### MapSelector.svelte
```svelte
<script lang="ts">
  import { getAvailableMaps } from './mapPresets';
  
  export let selectedMap = 'default';
  export let onSelectMap = (mapId) => {};
  
  const maps = getAvailableMaps();
</script>

<div class="map-selector">
  <h3>Select Map</h3>
  <div class="map-grid">
    {#each maps as map}
      <div 
        class="map-item" 
        class:active={selectedMap === map.id}
        on:click={() => onSelectMap(map.id)}
      >
        <img src={map.thumbnail} alt={map.name} />
        <div class="map-name">{map.name}</div>
      </div>
    {/each}
  </div>
</div>

<style>
  .map-selector {
    width: 100%;
  }
  
  .map-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 10px;
  }
  
  .map-item {
    border: 2px solid #333;
    border-radius: 4px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .map-item:hover {
    transform: scale(1.05);
  }
  
  .map-item.active {
    border-color: #0088ff;
    box-shadow: 0 0 8px rgba(0, 136, 255, 0.5);
  }
  
  .map-item img {
    width: 100%;
    height: 80px;
    object-fit: cover;
  }
  
  .map-name {
    padding: 5px;
    font-size: 12px;
    text-align: center;
  }
</style>
```

### 6. Integration Plan
1. Add MapExtension to the available Studio extensions
2. Create MapManager component
3. Move map-related code from demoTerrain.svelte to the new system
4. Update existing components to use the new map system
5. Create documentation for the map extension

### 7. Migration Steps
1. Create MapExtension.svelte in the extensions directory
2. Create MapManager.svelte in a new map directory
3. Create map presets and utility functions
4. Create map types and interfaces
5. Implement specialized map components
6. Test thoroughly
7. Remove old map implementation from demoTerrain.svelte

## Features for Future Enhancement
- Procedural terrain generation
- Height map based terrain
- Dynamic weather effects that interact with terrain
- Day/night cycle effects on terrain
- Destructible terrain features
- Collision system integration
- Mini-map system
- Map editor tools
- Saving/loading custom maps
- Level systems with map transitions
- Biome-specific audio and particle effects

## Performance Considerations
- LOD (Level of Detail) for distant terrain
- Map chunking for large terrains
- Instanced rendering for repetitive elements (trees, rocks)
- Occlusion culling
- Texture atlas for terrain materials
- Normal map optimization 