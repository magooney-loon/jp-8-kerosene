<script lang="ts">
  import {
    useStudio,
    ToolbarItem,
    HorizontalButtonGroup,
    ToolbarButton
  } from '@threlte/studio/extend'
  import { 
    RENDERER_DEFAULTS,
    postProcessingEnabled, 
    bloomEnabled, bloomIntensity, bloomLuminanceThreshold, bloomLuminanceSmoothing,
    smaaEnabled, smaaPreset,
    vignetteEnabled, vignetteOffset, vignetteDarkness
  } from '$lib/stores/rendererStore'
  import { Checkbox, Folder, Slider } from 'svelte-tweakpane-ui'
  import DropDownPane from '$lib/Studio/DropDownPane.svelte'
  import IconButton from '$lib/Studio/IconButton.svelte'
  
  // Extension scope
  const extensionScope = 'renderer-extension'
  
  // Create the extension
  const { createExtension } = useStudio()
  
  // Define the extension state and actions types
  type RendererState = {
    postProcessing: boolean
  }
  
  type RendererActions = {
    togglePostProcessing: () => void
    setPostProcessing: (enabled: boolean) => void
  }
  
  // Define an interface for the change events
  interface ChangeEvent {
    detail: {
      value: any
    }
  }
  
  // Create the extension
  const extension = createExtension<RendererState, RendererActions>({
    scope: extensionScope,
    state({ persist }) {
      return {
        postProcessing: persist(true)
      }
    },
    actions: {
      togglePostProcessing({ state }) {
        state.postProcessing = !state.postProcessing
        postProcessingEnabled.set(state.postProcessing)
      },
      setPostProcessing({ state }, enabled) {
        state.postProcessing = enabled
        postProcessingEnabled.set(state.postProcessing)
      }
    }
  })
  
  // Sync the post-processing state on initialization
  $: postProcessingEnabled.set(extension.state.postProcessing)
  
  // Event handlers for renderer settings
  const onBloomEnabledChange = (e: ChangeEvent) => bloomEnabled.set(e.detail.value)
  const onBloomIntensityChange = (e: ChangeEvent) => bloomIntensity.set(e.detail.value)
  const onBloomThresholdChange = (e: ChangeEvent) => bloomLuminanceThreshold.set(e.detail.value)
  const onBloomSmoothingChange = (e: ChangeEvent) => bloomLuminanceSmoothing.set(e.detail.value)
  const onSmaaEnabledChange = (e: ChangeEvent) => smaaEnabled.set(e.detail.value)
  const onVignetteEnabledChange = (e: ChangeEvent) => vignetteEnabled.set(e.detail.value)
  const onVignetteOffsetChange = (e: ChangeEvent) => vignetteOffset.set(e.detail.value)
  const onVignetteDarknessChange = (e: ChangeEvent) => vignetteDarkness.set(e.detail.value)
  
  /**
   * Reset all renderer settings to default values
   */
  function resetRendererSettings() {
    // Reset to defaults from rendererStore.ts
    postProcessingEnabled.set(RENDERER_DEFAULTS.postProcessing)
    bloomEnabled.set(RENDERER_DEFAULTS.bloom.enabled)
    bloomIntensity.set(RENDERER_DEFAULTS.bloom.intensity)
    bloomLuminanceThreshold.set(RENDERER_DEFAULTS.bloom.luminanceThreshold)
    bloomLuminanceSmoothing.set(RENDERER_DEFAULTS.bloom.luminanceSmoothing)
    smaaEnabled.set(RENDERER_DEFAULTS.smaa.enabled)
    vignetteEnabled.set(RENDERER_DEFAULTS.vignette.enabled)
    vignetteOffset.set(RENDERER_DEFAULTS.vignette.offset)
    vignetteDarkness.set(RENDERER_DEFAULTS.vignette.darkness)
  }
</script>

<!-- Extension UI -->
<ToolbarItem position="left">
  <HorizontalButtonGroup>
    <ToolbarButton
      label="Effects"
      icon="mdiBlurRadial"
      on:click={extension.togglePostProcessing}
      tooltip="Toggle Post-Processing Effects"
      active={extension.state.postProcessing}
    />
    
    <DropDownPane title="Effects Settings">
      <div class="header-actions">
        <IconButton 
          icon="mdiRefresh" 
          label="Reset to Default"
          title="Reset to Default"
          on:click={resetRendererSettings}
        />
      </div>
      
      <Folder title="Bloom" expanded>
        <Checkbox 
          value={$bloomEnabled}
          label="Enable Bloom"
          on:change={onBloomEnabledChange}
        />
        {#if $bloomEnabled}
          <Slider
            value={$bloomIntensity}
            label="Intensity"
            min={0}
            max={10}
            step={0.1}
            on:change={onBloomIntensityChange}
          />
          <Slider
            value={$bloomLuminanceThreshold}
            label="Threshold"
            min={0}
            max={1}
            step={0.01}
            on:change={onBloomThresholdChange}
          />
          <Slider
            value={$bloomLuminanceSmoothing}
            label="Smoothing"
            min={0}
            max={1}
            step={0.01}
            on:change={onBloomSmoothingChange}
          />
        {/if}
      </Folder>
      
      <Folder title="Anti-aliasing" expanded>
        <Checkbox 
          value={$smaaEnabled}
          label="SMAA Anti-aliasing"
          on:change={onSmaaEnabledChange}
        />
      </Folder>
      
      <Folder title="Vignette" expanded>
        <Checkbox 
          value={$vignetteEnabled}
          label="Enable Vignette"
          on:change={onVignetteEnabledChange}
        />
        {#if $vignetteEnabled}
          <Slider
            value={$vignetteOffset}
            label="Offset"
            min={0}
            max={1}
            step={0.01}
            on:change={onVignetteOffsetChange}
          />
          <Slider
            value={$vignetteDarkness}
            label="Darkness"
            min={0}
            max={1}
            step={0.01}
            on:change={onVignetteDarknessChange}
          />
        {/if}
      </Folder>
    </DropDownPane>
  </HorizontalButtonGroup>
</ToolbarItem>

<style>
  .header-actions {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 8px;
  }
</style>

<slot /> 