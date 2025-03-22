# Level Scene Management System Plan

## Current State
- No centralized system for managing levels/scenes
- Extensions like SkyBox, Map, Audio, etc. are configured independently
- Level transitions require manually changing multiple settings
- No way to save/load level configurations
- No concept of game progression between levels

## Goals
1. Create a flexible level/scene management system as a Studio Engine extension
2. Allow easy configuration of all extensions for different levels
3. Support level transitions and progression
4. Provide presets for common game level types
5. Enable saving and loading of custom level configurations

## Implementation Plan

### 1. Create Level Scene Extension Component

Create a `LevelSceneExtension.svelte` component that follows the Studio Engine extension pattern:

```svelte
<script lang="ts">
  import { useStudio } from '@threlte/studio/extend';
  import { ToolbarItem, Panel } from '@threlte/studio';
  
  // Extension scope
  const extensionScope = 'level-scene';
  
  // Create the extension
  const { createExtension } = useStudio();
  
  const extension = createExtension({
    scope: extensionScope,
    state({ persist }) {
      return {
        // Active level
        activeLevel: persist('default'),
        
        // Transition state
        transition: persist({
          active: false,
          from: '',
          to: '',
          progress: 0,
          type: 'fade',
          duration: 2
        }),
        
        // Level definitions
        levels: persist({
          default: {
            name: 'Default Level',
            description: 'Empty default level',
            
            // Extension configurations
            extensions: {
              // SkyBox extension settings
              skybox: {
                enabled: true,
                preset: 'bluesky',
                rotation: 0,
                ambientLightIntensity: 1.0,
                directionalLightIntensity: 0.8
              },
              
              // Map extension settings
              map: {
                enabled: true,
                activeMap: 'default',
                scale: 3,
                pointsOfInterest: []
              },
              
              // Audio extension settings
              audio: {
                enabled: true,
                masterVolume: 0.8,
                categories: {
                  music: { enabled: true, volume: 0.7 },
                  sfx: { enabled: true, volume: 0.8 },
                  ambience: { enabled: true, volume: 0.6 },
                  voice: { enabled: true, volume: 1.0 },
                  ui: { enabled: true, volume: 0.7 }
                },
                musicTrack: '/sound/default_music.mp3',
                ambienceTrack: '/sound/default_ambience.mp3'
              },
              
              // Player/Camera extension settings
              playerCamera: {
                activeControlScheme: 'spacecraft',
                camera: {
                  fov: 75,
                  shake: {
                    enabled: true,
                    maxIntensity: 0.3
                  }
                }
              },
              
              // Shooter extension settings
              shooter: {
                enabled: true,
                hitEffectsEnabled: true,
                soundEffectsEnabled: true
              },
              
              // Renderer extension settings
              renderer: {
                shadowsEnabled: true,
                shadowResolution: 'medium',
                postProcessing: {
                  enabled: true,
                  bloom: { enabled: true, intensity: 0.15 },
                  ssao: { enabled: true, intensity: 0.3 }
                }
              }
            },
            
            // Level-specific game objects
            gameObjects: [],
            
            // Level metadata
            metadata: {
              author: 'System',
              createdAt: new Date().toISOString(),
              difficulty: 'easy',
              tags: ['default']
            }
          },
          
          // Space battle level
          spaceBattle: {
            name: 'Space Battle',
            description: 'Deep space combat scenario',
            
            extensions: {
              skybox: {
                enabled: true,
                preset: 'deepspace',
                rotation: 25,
                ambientLightIntensity: 0.2,
                directionalLightIntensity: 0.3
              },
              
              map: {
                enabled: true,
                activeMap: 'asteroid-field',
                scale: 5,
                pointsOfInterest: [
                  {
                    id: 'space-station',
                    enabled: true,
                    model: '/models/station.glb',
                    position: [500, 0, -200],
                    rotation: [0, 45, 0],
                    scale: 20
                  }
                ]
              },
              
              audio: {
                enabled: true,
                masterVolume: 0.8,
                categories: {
                  music: { enabled: true, volume: 0.6 },
                  sfx: { enabled: true, volume: 0.9 },
                  ambience: { enabled: true, volume: 0.4 },
                  voice: { enabled: true, volume: 1.0 },
                  ui: { enabled: true, volume: 0.7 }
                },
                musicTrack: '/sound/battle_music.mp3',
                ambienceTrack: '/sound/space_ambience.mp3'
              },
              
              playerCamera: {
                activeControlScheme: 'spacecraft',
                camera: {
                  fov: 80,
                  shake: {
                    enabled: true,
                    maxIntensity: 0.5
                  }
                }
              },
              
              shooter: {
                enabled: true,
                hitEffectsEnabled: true,
                soundEffectsEnabled: true,
                weapons: {
                  'laser': {
                    damage: 30,
                    projectileSpeed: 250
                  }
                }
              },
              
              renderer: {
                shadowsEnabled: true,
                shadowResolution: 'high',
                postProcessing: {
                  enabled: true,
                  bloom: { enabled: true, intensity: 0.3 },
                  ssao: { enabled: false },
                  motionBlur: { enabled: true, intensity: 0.4 }
                }
              }
            },
            
            gameObjects: [
              {
                type: 'enemy',
                model: 'enemy-fighter',
                position: [100, 0, -200],
                behavior: 'attack'
              },
              {
                type: 'enemy',
                model: 'enemy-fighter',
                position: [-150, 50, -300],
                behavior: 'patrol'
              },
              {
                type: 'pickups',
                items: [
                  { type: 'health', position: [200, 30, -100] },
                  { type: 'weapon', position: [-120, -20, -150], weaponId: 'missile' }
                ]
              }
            ],
            
            metadata: {
              author: 'System',
              createdAt: new Date().toISOString(),
              difficulty: 'medium',
              tags: ['combat', 'space']
            }
          },
          
          // Desert world level
          desertWorld: {
            name: 'Desert World',
            description: 'Vast sandy landscape with ancient ruins',
            
            extensions: {
              skybox: {
                enabled: true,
                preset: 'desert',
                rotation: 120,
                ambientLightIntensity: 1.2,
                directionalLightIntensity: 1.5
              },
              
              map: {
                enabled: true,
                activeMap: 'desert',
                scale: 4,
                pointsOfInterest: [
                  {
                    id: 'ruins',
                    enabled: true,
                    model: '/models/ruins.glb',
                    position: [200, -10, 300],
                    rotation: [0, 30, 0],
                    scale: 15
                  }
                ]
              },
              
              audio: {
                enabled: true,
                masterVolume: 0.8,
                categories: {
                  music: { enabled: true, volume: 0.5 },
                  sfx: { enabled: true, volume: 0.7 },
                  ambience: { enabled: true, volume: 0.9 },
                  voice: { enabled: true, volume: 1.0 },
                  ui: { enabled: true, volume: 0.6 }
                },
                musicTrack: '/sound/desert_music.mp3',
                ambienceTrack: '/sound/desert_wind.mp3'
              },
              
              playerCamera: {
                activeControlScheme: 'spacecraft',
                camera: {
                  fov: 70,
                  shake: {
                    enabled: true,
                    maxIntensity: 0.2
                  }
                }
              },
              
              shooter: {
                enabled: true,
                hitEffectsEnabled: true,
                soundEffectsEnabled: true
              },
              
              renderer: {
                shadowsEnabled: true,
                shadowResolution: 'medium',
                postProcessing: {
                  enabled: true,
                  bloom: { enabled: true, intensity: 0.1 },
                  ssao: { enabled: true, intensity: 0.2 },
                  colorGrading: {
                    enabled: true,
                    temperature: 0.3, // Warmer
                    tint: 0.1,
                    saturation: 1.2
                  }
                }
              }
            },
            
            gameObjects: [
              {
                type: 'enemy',
                model: 'desert-drone',
                position: [150, 30, 200],
                behavior: 'patrol'
              }
            ],
            
            metadata: {
              author: 'System',
              createdAt: new Date().toISOString(),
              difficulty: 'easy',
              tags: ['exploration', 'desert']
            }
          }
        },
        
        // Level progression
        progression: persist({
          currentStage: 0,
          stages: [
            { levelId: 'default', objectives: [] },
            { levelId: 'spaceBattle', objectives: ['defeat_enemies', 'reach_station'] },
            { levelId: 'desertWorld', objectives: ['find_artifact', 'return_to_ship'] }
          ]
        }),
        
        // Transition presets
        transitionPresets: persist({
          fade: {
            type: 'fade',
            duration: 2.0,
            color: '#000000'
          },
          warp: {
            type: 'warp',
            duration: 1.5
          },
          crossFade: {
            type: 'crossFade',
            duration: 3.0
          }
        })
      };
    },
    actions: {
      // Load a level
      loadLevel: (levelId) => {
        const previousLevel = extension.state.activeLevel;
        
        if (!extension.state.levels[levelId]) {
          console.error(`Level ${levelId} not found`);
          return false;
        }
        
        // Set up transition
        extension.state.transition = {
          active: true,
          from: previousLevel,
          to: levelId,
          progress: 0,
          type: 'fade',
          duration: 2
        };
        
        // Set active level
        extension.state.activeLevel = levelId;
        
        // Apply level settings to all extensions
        const levelConfig = extension.state.levels[levelId];
        
        // Call other extension actions to update their state
        // This is where we would update all other extensions with the new settings
        
        return true;
      },
      
      // Create a new level based on current settings
      createLevel: (newLevelId, levelName) => {
        // Get current settings from all extensions
        
        // Create a new level with current settings
        extension.state.levels[newLevelId] = {
          name: levelName || `New Level ${Object.keys(extension.state.levels).length + 1}`,
          description: 'Custom level',
          extensions: {
            // This would be populated with current extension settings
            skybox: {},
            map: {},
            audio: {},
            playerCamera: {},
            shooter: {},
            renderer: {}
          },
          gameObjects: [],
          metadata: {
            author: 'User',
            createdAt: new Date().toISOString(),
            difficulty: 'custom',
            tags: ['custom']
          }
        };
        
        return newLevelId;
      },
      
      // Update level settings
      updateLevelSetting: (levelId, path, value) => {
        if (!extension.state.levels[levelId]) return false;
        
        const keys = path.split('.');
        let current = extension.state.levels[levelId];
        
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) current[keys[i]] = {};
          current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
        
        // If updating the active level, also apply changes right away
        if (levelId === extension.state.activeLevel) {
          // Apply this specific change to the appropriate extension
        }
        
        return true;
      },
      
      // Delete a level
      deleteLevel: (levelId) => {
        if (levelId === 'default') return false; // Prevent deleting default level
        
        if (extension.state.activeLevel === levelId) {
          extension.state.activeLevel = 'default';
        }
        
        delete extension.state.levels[levelId];
        return true;
      },
      
      // Advance to next stage in progression
      advanceStage: () => {
        const currentStage = extension.state.progression.currentStage;
        const nextStage = currentStage + 1;
        
        if (nextStage >= extension.state.progression.stages.length) {
          return false; // No more stages
        }
        
        extension.state.progression.currentStage = nextStage;
        const nextLevel = extension.state.progression.stages[nextStage].levelId;
        
        // Load the next level
        extension.actions.loadLevel(nextLevel);
        
        return true;
      },
      
      // Add a game object to the active level
      addGameObject: (objectData) => {
        const levelId = extension.state.activeLevel;
        if (!extension.state.levels[levelId]) return false;
        
        extension.state.levels[levelId].gameObjects.push(objectData);
        
        // Handle actual object creation in the scene
        
        return true;
      },
      
      // Remove a game object from the active level
      removeGameObject: (index) => {
        const levelId = extension.state.activeLevel;
        if (!extension.state.levels[levelId]) return false;
        
        if (index >= 0 && index < extension.state.levels[levelId].gameObjects.length) {
          extension.state.levels[levelId].gameObjects.splice(index, 1);
          return true;
        }
        
        return false;
      }
    }
  });
</script>

<!-- Extension UI -->
<ToolbarItem position="left">
  <Panel title="Level Scene">
    <!-- Level selection and controls would go here -->
  </Panel>
</ToolbarItem>

<slot />
```

### 2. Create Level Scene Manager Component

Create a `LevelSceneManager.svelte` as the core component:

```svelte
<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { T, useFrame, useThree } from '@threlte/core';
  import * as THREE from 'three';
  
  // Import necessary components for level management
  import TransitionEffect from './TransitionEffect.svelte';
  import GameObjectManager from './GameObjectManager.svelte';
  
  // Props
  export let activeLevel = 'default';
  export let levelConfig = {
    extensions: {},
    gameObjects: []
  };
  export let transition = {
    active: false,
    from: '',
    to: '',
    progress: 0,
    type: 'fade',
    duration: 2
  };
  
  // Event dispatcher
  const dispatch = createEventDispatcher();
  
  // Level state
  let levelLoaded = false;
  let objectsLoaded = false;
  let totalObjectsToLoad = 0;
  let loadedObjects = 0;
  
  // References
  let levelContainer: THREE.Group;
  
  // Handle level loading
  function loadLevel(levelId, config) {
    levelLoaded = false;
    objectsLoaded = false;
    
    // Reset loading counters
    totalObjectsToLoad = config?.gameObjects?.length || 0;
    loadedObjects = 0;
    
    // Start loading process
    console.log(`Loading level: ${levelId}`);
    
    // Apply configuration to all extensions
    applyExtensionConfigs(config?.extensions);
    
    // Dispatch event
    dispatch('levelLoading', { levelId, progress: 0 });
    
    // Mark level as loaded when everything is ready
    checkLoadingComplete();
  }
  
  // Apply configurations to all extensions
  function applyExtensionConfigs(configs) {
    if (!configs) return;
    
    // For each extension, apply its configuration
    Object.entries(configs).forEach(([extName, config]) => {
      console.log(`Configuring extension: ${extName}`, config);
      // This would trigger updates in other extensions
    });
  }
  
  // Check if level loading is complete
  function checkLoadingComplete() {
    if (loadedObjects >= totalObjectsToLoad) {
      objectsLoaded = true;
    }
    
    if (objectsLoaded) {
      levelLoaded = true;
      dispatch('levelLoaded', { levelId: activeLevel });
    } else {
      const progress = totalObjectsToLoad > 0 ? loadedObjects / totalObjectsToLoad : 1;
      dispatch('levelLoading', { levelId: activeLevel, progress });
    }
  }
  
  // Handle object loading completed
  function handleObjectLoaded() {
    loadedObjects++;
    checkLoadingComplete();
  }
  
  // Update when active level changes
  $: if (activeLevel && levelConfig) {
    loadLevel(activeLevel, levelConfig);
  }
  
  // Initialize
  onMount(() => {
    loadLevel(activeLevel, levelConfig);
  });
  
  // Update transition
  useFrame((_, delta) => {
    if (transition.active && transition.progress < 1) {
      transition.progress = Math.min(1, transition.progress + delta / transition.duration);
      
      if (transition.progress >= 1) {
        transition.active = false;
        dispatch('transitionComplete', { from: transition.from, to: transition.to });
      }
    }
  });
</script>

<T.Group bind:ref={levelContainer}>
  <!-- Level scene container -->
  
  <!-- Game objects -->
  {#if levelConfig?.gameObjects?.length > 0}
    <GameObjectManager
      objects={levelConfig.gameObjects}
      on:objectLoaded={handleObjectLoaded}
    />
  {/if}
  
  <!-- Level content -->
  <slot />
</T.Group>

<!-- Transition effects -->
{#if transition.active}
  <TransitionEffect
    type={transition.type}
    progress={transition.progress}
  />
{/if}
```

### 3. Create Transition Effect Component

```svelte
<script lang="ts">
  import { T, useThree } from '@threlte/core';
  import * as THREE from 'three';
  
  // Props
  export let type = 'fade';
  export let progress = 0;
  export let color = '#000000';
  
  // Get three.js context
  const { camera } = useThree();
  
  // Helper for fade effect
  function getFadeOpacity(progress) {
    // Fade in until halfway, then fade out
    if (progress < 0.5) {
      return progress * 2; // 0 to 1
    } else {
      return 2 - progress * 2; // 1 to 0
    }
  }
</script>

{#if type === 'fade'}
  <!-- Fade transition -->
  <T.Mesh scale={[100, 100, 1]} position={[0, 0, -5]}>
    <T.PlaneGeometry args={[1, 1]} />
    <T.MeshBasicMaterial
      color={color}
      transparent={true}
      opacity={getFadeOpacity(progress)}
      depthTest={false}
    />
  </T.Mesh>
{:else if type === 'warp'}
  <!-- Warp effect -->
  <!-- This would be a more complex shader-based effect -->
{:else if type === 'crossFade'}
  <!-- Cross fade between scenes -->
  <!-- This would require rendering both scenes to textures -->
{/if}
```

### 4. Create Game Object Manager Component

```svelte
<script lang="ts">
  import { T } from '@threlte/core';
  import { onMount, createEventDispatcher } from 'svelte';
  import { GLTF } from '@threlte/extras';
  
  // Props
  export let objects = [];
  
  // Event dispatcher
  const dispatch = createEventDispatcher();
  
  // Load object based on type
  function loadObject(object, index) {
    if (object.type === 'enemy') {
      return loadEnemyObject(object, index);
    } else if (object.type === 'pickups') {
      return loadPickupObjects(object, index);
    } else {
      return loadGenericObject(object, index);
    }
  }
  
  // Load enemy object
  function loadEnemyObject(object, index) {
    return (
      <T.Group
        key={`enemy-${index}`}
        position={object.position}
      >
        <GLTF
          url={`/models/${object.model}.glb`}
          onLoad={() => handleObjectLoaded(object, index)}
        />
      </T.Group>
    );
  }
  
  // Load pickup objects
  function loadPickupObjects(object, index) {
    return (
      <T.Group key={`pickups-${index}`}>
        {object.items.map((item, itemIndex) => (
          <T.Group
            key={`pickup-${index}-${itemIndex}`}
            position={item.position}
          >
            <GLTF
              url={`/models/pickups/${item.type}.glb`}
              onLoad={() => handleObjectLoaded(object, index)}
            />
          </T.Group>
        ))}
      </T.Group>
    );
  }
  
  // Load generic object
  function loadGenericObject(object, index) {
    return (
      <T.Group
        key={`object-${index}`}
        position={object.position}
        rotation={object.rotation}
        scale={object.scale}
      >
        <GLTF
          url={object.model}
          onLoad={() => handleObjectLoaded(object, index)}
        />
      </T.Group>
    );
  }
  
  // Handle object loaded
  function handleObjectLoaded(object, index) {
    console.log(`Loaded object ${index}: ${object.type}`);
    dispatch('objectLoaded', { object, index });
  }
</script>

<T.Group>
  {#each objects as object, index}
    {loadObject(object, index)}
  {/each}
</T.Group>
```

### 5. Create Level Types and Interfaces

```typescript
// levelTypes.ts
import * as THREE from 'three';

export interface LevelConfig {
  name: string;
  description: string;
  extensions: {
    skybox?: any;
    map?: any;
    audio?: any;
    playerCamera?: any;
    shooter?: any;
    renderer?: any;
    [key: string]: any;
  };
  gameObjects: GameObject[];
  metadata: LevelMetadata;
}

export interface GameObject {
  type: string;
  model?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  behavior?: string;
  [key: string]: any;
}

export interface LevelMetadata {
  author: string;
  createdAt: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'custom';
  tags: string[];
  [key: string]: any;
}

export interface LevelStage {
  levelId: string;
  objectives: string[];
}

export interface TransitionConfig {
  active: boolean;
  from: string;
  to: string;
  progress: number;
  type: 'fade' | 'warp' | 'crossFade' | string;
  duration: number;
  color?: string;
}

export interface LevelLoadEvent {
  levelId: string;
  progress: number;
}
```

### 6. Integration Plan
1. Add LevelSceneExtension to the available Studio extensions
2. Create LevelSceneManager and related components
3. Set up event dispatching between the level extension and other extensions
4. Create a communication system to apply level settings to all other extensions
5. Implement level switching and transitions

### 7. Migration Steps
1. Create LevelSceneExtension.svelte in the extensions directory
2. Create levelScene subdirectory for components
3. Implement LevelSceneManager.svelte
4. Implement TransitionEffect.svelte
5. Implement GameObjectManager.svelte
6. Create levelTypes.ts
7. Update other extensions to respond to level changes
8. Test thoroughly
9. Clean up old implementations

## Features for Future Enhancement
- Level editor with visual placement of objects
- Save/load of level configurations to files
- Procedural level generation
- Level transition cutscenes
- Level-specific objectives and completion tracking
- Dynamic level modification during gameplay
- Multi-user level editing
- Level sharing and publishing
- Performance optimization for large levels
- Level streaming for continuous worlds

## Performance Considerations
- Asynchronous loading of level resources
- Object pooling for common game objects
- Level of detail management for distant objects
- Frustum culling for large scenes
- Asset preloading for smooth transitions
- Memory management for large levels
- Efficient serialization/deserialization of level data 