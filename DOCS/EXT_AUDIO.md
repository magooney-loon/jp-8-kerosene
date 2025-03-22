# Audio System Refactoring Plan

## Current State
- Audio implementation is scattered across demo components (e.g., demoAI.svelte)
- Simple audioStore.ts with just a soundEnabled flag
- No centralized audio management
- Manual event listeners for audio initialization

## Goals
1. Create a centralized audio system using Threlte audio components
2. Improve audio performance and features
3. Make audio easier to manage across the application
4. Properly handle audio context and browser limitations
5. Implement as a Studio Engine extension for better integration

## Threlte Audio Components to Use
- `<AudioListener>` - Virtual listener component required for all audio
- `<Audio>` - For non-positional (global) audio
- `<PositionalAudio>` - For 3D positional audio
- `useAudioListener` - Hook for audio listener functionality
- `useThrelteAudio` - Hook for audio management

## Component Examples

### AudioListener
```svelte
<script>
  import { T } from '@threlte/core'
  import { AudioListener } from '@threlte/extras'
</script>

<T.PerspectiveCamera makeDefault position={[0, 5, 10]}>
  <AudioListener id="main-listener" />
</T.PerspectiveCamera>
```

### Audio (Non-positional)
```svelte
<script>
  import { Audio } from '@threlte/extras'
</script>

<!-- Global background music -->
<Audio 
  src="/sound/background.mp3"
  autoplay={true}
  loop={true}
  volume={0.5}
  id="main-listener"
/>
```

### PositionalAudio
```svelte
<script>
  import { T } from '@threlte/core'
  import { PositionalAudio } from '@threlte/extras'
</script>

<T.Mesh position={[0, 0, 0]}>
  <!-- Some mesh geometry and material -->
  
  <PositionalAudio
    src="/sound/engine.mp3"
    autoplay={true}
    loop={true}
    volume={0.3}
    refDistance={10}
    directionalCone={{
      coneInnerAngle: 180,
      coneOuterAngle: 320,
      coneOuterGain: 0.4
    }}
    id="main-listener"
  />
</T.Mesh>
```

### useAudioListener
```svelte
<script>
  import { useAudioListener } from '@threlte/extras'
  
  // Get the audio listener and context
  const { audioContext, resumeContext } = useAudioListener('main-listener')
  
  // Resume audio context on user interaction
  function handleUserInteraction() {
    resumeContext()
  }
</script>

<button on:click={handleUserInteraction}>
  Enable Audio
</button>
```

### useThrelteAudio
```svelte
<script>
  import { useThrelteAudio } from '@threlte/extras'
  
  // Create audio instance without rendering a component
  const { play, pause, stop } = useThrelteAudio({
    src: '/sound/effect.mp3',
    autoplay: false,
    volume: 0.7,
    id: 'main-listener'
  })
  
  // Play sound on event
  function playSound() {
    play()
  }
</script>

<button on:click={playSound}>
  Play Sound Effect
</button>
```

## Implementation Plan

### 1. Create Audio Extension Component

Create an `AudioExtension.svelte` component that follows the Studio Engine extension pattern:

```svelte
<script lang="ts">
  import { useStudio } from '@threlte/studio/extend';
  import { ToolbarItem, ToolbarButton, Panel } from '@threlte/studio';
  
  // Extension scope - must be unique
  const extensionScope = 'audio';
  
  // Create the extension
  const { createExtension } = useStudio();
  
  const extension = createExtension({
    scope: extensionScope,
    state({ persist }) {
      return {
        // General settings
        masterVolume: persist(0.8),
        enabled: persist(true),
        
        // General-purpose audio categories for any game type
        categories: persist({
          music: { enabled: true, volume: 0.7 },
          sfx: { enabled: true, volume: 0.8 },
          ambience: { enabled: true, volume: 0.6 },
          voice: { enabled: true, volume: 1.0 },
          ui: { enabled: true, volume: 0.7 }
        }),
        
        // Audio presets
        presets: persist({
          default: {
            masterVolume: 0.8,
            music: 0.7,
            sfx: 0.8,
            ambience: 0.6,
            voice: 1.0,
            ui: 0.7
          },
          // Add more presets as needed
        }),
        
        // Audio performance settings
        performance: persist({
          maxConcurrentSounds: 16,
          distanceCulling: true,
          cullDistance: 100
        })
      };
    },
    actions: {
      toggleAudio: () => {
        extension.state.enabled = !extension.state.enabled;
      },
      toggleCategory: (category) => {
        extension.state.categories[category].enabled = 
          !extension.state.categories[category].enabled;
      },
      setCategoryVolume: (category, volume) => {
        extension.state.categories[category].volume = volume;
      },
      setMasterVolume: (volume) => {
        extension.state.masterVolume = volume;
      },
      applyPreset: (presetName) => {
        const preset = extension.state.presets[presetName];
        if (preset) {
          extension.state.masterVolume = preset.masterVolume;
          Object.keys(preset).forEach(key => {
            if (key !== 'masterVolume' && extension.state.categories[key]) {
              extension.state.categories[key].volume = preset[key];
            }
          });
        }
      }
    }
  });
</script>

<!-- Extension UI - will implement proper UI controls -->
<ToolbarItem position="left">
  <!-- Audio control buttons -->
</ToolbarItem>

<slot />
```

### 2. Create Audio Manager Component

Create `AudioManager.svelte` as the core component:

```svelte
<script lang="ts">
  import { T } from '@threlte/core'
  import { AudioListener, useAudioListener } from '@threlte/extras'
  import { getContext } from 'svelte'
  
  // Get the camera from context if available
  const camera = getContext('camera')
  
  // Constants
  const LISTENER_ID = 'main-listener'
  
  // Get audio listener API
  const { audioContext, resumeContext } = useAudioListener(LISTENER_ID)
  
  // Handle audio context resuming on user interaction
  function setupAudioContext() {
    const handleInteraction = () => {
      resumeContext()
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
    }
    
    window.addEventListener('click', handleInteraction)
    window.addEventListener('keydown', handleInteraction)
  }
  
  // Initialize on mount
  onMount(() => {
    setupAudioContext()
  })
</script>

{#if camera}
  <!-- Add AudioListener to the main camera -->
  <T.Group>
    <AudioListener id={LISTENER_ID} />
  </T.Group>
{:else}
  <!-- Fallback if no camera is found -->
  <T.Group>
    <AudioListener id={LISTENER_ID} />
  </T.Group>
{/if}

<slot />
```

### 3. Create Enhanced Audio Store

Replace the current `audioStore.ts` with an enhanced version:

```typescript
import { writable, derived, get } from 'svelte/store';
import { useAudioListener } from '@threlte/extras';

// Define audio category types
export type AudioCategory = 'music' | 'sfx' | 'ambience' | 'voice' | 'ui';

// Audio state interface 
interface AudioState {
  enabled: boolean;
  masterVolume: number;
  categories: Record<AudioCategory, {
    enabled: boolean;
    volume: number;
  }>;
}

// Create the main audio store with initial state
export const audioState = writable<AudioState>({
  enabled: true,
  masterVolume: 0.8,
  categories: {
    music: { enabled: true, volume: 0.7 },
    sfx: { enabled: true, volume: 0.8 },
    ambience: { enabled: true, volume: 0.6 },
    voice: { enabled: true, volume: 1.0 },
    ui: { enabled: true, volume: 0.7 }
  }
});

// Derived store for effective volume calculations
export const effectiveVolume = derived(audioState, ($state) => {
  if (!$state.enabled) {
    return {
      music: 0,
      sfx: 0,
      ambience: 0,
      voice: 0,
      ui: 0
    };
  }
  
  const result = {} as Record<AudioCategory, number>;
  
  Object.entries($state.categories).forEach(([category, settings]) => {
    result[category as AudioCategory] = settings.enabled 
      ? settings.volume * $state.masterVolume 
      : 0;
  });
  
  return result;
});

// Audio context management
let mainAudioListener: ReturnType<typeof useAudioListener> | null = null;

// Initialize audio listener
export function initAudioListener(id = 'main-listener') {
  mainAudioListener = useAudioListener(id);
  return mainAudioListener;
}

// Get audio context
export function getAudioContext() {
  return mainAudioListener?.audioContext;
}

// Resume audio context
export function resumeAudioContext() {
  return mainAudioListener?.resumeContext();
}

// Audio control functions
export function toggleAudio() {
  audioState.update(state => ({ ...state, enabled: !state.enabled }));
}

export function setMasterVolume(volume: number) {
  audioState.update(state => ({ ...state, masterVolume: volume }));
}

export function toggleCategory(category: AudioCategory) {
  audioState.update(state => {
    const categories = { ...state.categories };
    categories[category] = { 
      ...categories[category],
      enabled: !categories[category].enabled 
    };
    return { ...state, categories };
  });
}

export function setCategoryVolume(category: AudioCategory, volume: number) {
  audioState.update(state => {
    const categories = { ...state.categories };
    categories[category] = { 
      ...categories[category],
      volume 
    };
    return { ...state, categories };
  });
}
```

### 4. Create Specialized Audio Components

Create reusable audio components for common use cases:

#### SoundEffect.svelte
```svelte
<script lang="ts">
  import { useThrelteAudio } from '@threlte/extras';
  import { effectiveVolume } from './audioStore';
  
  export let src: string;
  export let category: AudioCategory = 'sfx';
  export let autoplay = false;
  export let loop = false;
  export let volume = 1.0;
  
  $: effectiveVol = $effectiveVolume[category] * volume;
  
  const { play, pause, stop, setVolume } = useThrelteAudio({
    src,
    autoplay,
    loop,
    volume: effectiveVol
  });
  
  // Update volume when effective volume changes
  $: setVolume(effectiveVol);
  
  // Export methods
  export { play, pause, stop };
</script>
```

#### MusicPlayer.svelte
```svelte
<script lang="ts">
  import { Audio } from '@threlte/extras';
  import { effectiveVolume } from './audioStore';
  
  export let src: string;
  export let autoplay = true;
  export let loop = true;
  export let volume = 1.0;
  
  $: effectiveVol = $effectiveVolume.music * volume;
</script>

<Audio
  src={src}
  autoplay={autoplay}
  loop={loop}
  volume={effectiveVol}
/>
```

### 5. Integration Plan
1. Add AudioExtension to the available Studio extensions
2. Add AudioManager to the main scene component
3. Update audio references in demo components to use new system
4. Remove old audio implementations
5. Create documentation for the new audio system

## Migration Steps
1. Create AudioExtension.svelte in the extensions directory
2. Create AudioManager.svelte in a new audio directory
3. Move and update audioStore.ts with enhanced functionality
4. Create specialized audio components
5. Update existing components to use the new system
6. Test thoroughly after each migration step
7. Clean up old implementations

## Performance Considerations
- Limit number of concurrent audio sources
- Implement distance-based culling
- Optimize audio buffer loading
- Use audio pools for frequently used sounds

## Browser Compatibility
- Handle audio autoplay policies
- Implement fallbacks for browsers with limited Web Audio API support
- Add detection and warning for browsers without Web Audio support 