<script lang="ts">
  import {
    useStudio,
    ToolbarItem,
    HorizontalButtonGroup,
    ToolbarButton
  } from '@threlte/studio/extend'
  import { 
    SKYBOX_DEFAULTS,
    skyboxEnabled,
    cycleLengthMs,
    skyRayleigh, skyTurbidity, skyMieCoefficient, skyMieDirectionalG,
    starsDepth, starsLayers, starsDawnApproach, starsDaylightStart,
    constellationsCount, constellationsSize, constellationsDepth, constellationsFactor,
    constellationsSpeed, constellationsRadius, constellationsSaturation, constellationsColor,
    moonEnabled, moonSize, moonDistance, moonOffset, moonColor,
    moonEmissiveEnabled, moonEmissiveIntensity, moonEmissiveColor,
    moonPhaseEnabled, moonPhaseOffset,
    moonHeightFactor, moonSpeedFactor,
    skyAzimuth
  } from '$lib/stores/skyboxStore'
  import { Checkbox, Folder, Slider } from 'svelte-tweakpane-ui'
  import DropDownPane from '$lib/Studio/DropDownPane.svelte'
  import IconButton from '$lib/Studio/IconButton.svelte'
  import * as THREE from 'three'
  
  // Extension scope
  const extensionScope = 'skybox-extension'
  
  // Create the extension
  const { createExtension } = useStudio()
  
  // Define the extension state and actions types
  type SkyBoxState = {
    skybox: boolean
  }
  
  type SkyBoxActions = {
    toggleSkybox: () => void
    setSkybox: (enabled: boolean) => void
  }
  
  // Define an interface for the change events
  interface ChangeEvent {
    detail: {
      value: any
    }
  }
  
  // Create the extension
  const extension = createExtension<SkyBoxState, SkyBoxActions>({
    scope: extensionScope,
    state({ persist }) {
      return {
        skybox: persist(true)
      }
    },
    actions: {
      toggleSkybox({ state }) {
        state.skybox = !state.skybox
        skyboxEnabled.set(state.skybox)
      },
      setSkybox({ state }, enabled) {
        state.skybox = enabled
        skyboxEnabled.set(state.skybox)
      }
    }
  })
  
  // Sync the skybox state on initialization
  $: skyboxEnabled.set(extension.state.skybox)
  
  // Event handlers for skybox settings
  const onCycleLengthChange = (e: ChangeEvent) => cycleLengthMs.set(e.detail.value)
  const onSkyRayleighChange = (e: ChangeEvent) => skyRayleigh.set(e.detail.value)
  const onSkyTurbidityChange = (e: ChangeEvent) => skyTurbidity.set(e.detail.value)
  const onSkyMieCoefficientChange = (e: ChangeEvent) => skyMieCoefficient.set(e.detail.value)
  const onSkyMieDirectionalGChange = (e: ChangeEvent) => skyMieDirectionalG.set(e.detail.value)
  
  // Event handlers for star settings
  const onStarsDepthChange = (e: ChangeEvent) => starsDepth.set(e.detail.value)
  const onStarsDawnApproachChange = (e: ChangeEvent) => starsDawnApproach.set(e.detail.value)
  const onStarsDaylightStartChange = (e: ChangeEvent) => starsDaylightStart.set(e.detail.value)
  
  // Moon settings - removing unused handlers
  
  // Event handlers for constellation settings
  const onConstellationsCountChange = (e: ChangeEvent) => constellationsCount.set(e.detail.value)
  const onConstellationsSizeChange = (e: ChangeEvent) => constellationsSize.set(e.detail.value)
  const onConstellationsDepthChange = (e: ChangeEvent) => constellationsDepth.set(e.detail.value)
  const onConstellationsFactorChange = (e: ChangeEvent) => constellationsFactor.set(e.detail.value)
  const onConstellationsSpeedChange = (e: ChangeEvent) => constellationsSpeed.set(e.detail.value)
  const onConstellationsRadiusChange = (e: ChangeEvent) => constellationsRadius.set(e.detail.value)
  const onConstellationsSaturationChange = (e: ChangeEvent) => constellationsSaturation.set(e.detail.value)
  
  // Convert cycle length from ms to minutes for the UI
  $: cycleLengthMinutes = $cycleLengthMs / (60 * 1000)
  
  // Update the actual ms value when minutes change in UI
  function updateCycleLength(minutes: number) {
    cycleLengthMs.set(minutes * 60 * 1000)
  }
  
  /**
   * Reset all skybox settings to default values
   */
  function resetSkyboxSettings() {
    // Reset to defaults from skyboxStore.ts
    skyboxEnabled.set(SKYBOX_DEFAULTS.enabled)
    cycleLengthMs.set(SKYBOX_DEFAULTS.cycleLengthMs)
    
    // Sky settings
    skyRayleigh.set(SKYBOX_DEFAULTS.sky.rayleigh)
    skyTurbidity.set(SKYBOX_DEFAULTS.sky.turbidity)
    skyMieCoefficient.set(SKYBOX_DEFAULTS.sky.mieCoefficient)
    skyMieDirectionalG.set(SKYBOX_DEFAULTS.sky.mieDirectionalG)
    
    // Stars settings
    starsDepth.set(SKYBOX_DEFAULTS.stars.depth)
    starsDawnApproach.set(SKYBOX_DEFAULTS.stars.dawnApproach)
    starsDaylightStart.set(SKYBOX_DEFAULTS.stars.daylightStart)
    
    // Constellation settings
    constellationsCount.set(SKYBOX_DEFAULTS.stars.constellations.count)
    constellationsSize.set(SKYBOX_DEFAULTS.stars.constellations.size)
    constellationsDepth.set(SKYBOX_DEFAULTS.stars.constellations.depth)
    constellationsFactor.set(SKYBOX_DEFAULTS.stars.constellations.factor)
    constellationsSpeed.set(SKYBOX_DEFAULTS.stars.constellations.speed)
    constellationsRadius.set(SKYBOX_DEFAULTS.stars.constellations.radius)
    constellationsSaturation.set(SKYBOX_DEFAULTS.stars.constellations.saturation)
    
    // Moon settings
    moonEnabled.set(SKYBOX_DEFAULTS.moon.enabled)
    moonSize.set(SKYBOX_DEFAULTS.moon.size)
    moonDistance.set(SKYBOX_DEFAULTS.moon.distance)
    moonOffset.set(SKYBOX_DEFAULTS.moon.offset)
    moonEmissiveEnabled.set(SKYBOX_DEFAULTS.moon.emissive.enabled)
    moonEmissiveIntensity.set(SKYBOX_DEFAULTS.moon.emissive.intensity)
    moonEmissiveColor.set(SKYBOX_DEFAULTS.moon.emissive.color)
    moonPhaseEnabled.set(SKYBOX_DEFAULTS.moon.phase.enabled)
    moonPhaseOffset.set(SKYBOX_DEFAULTS.moon.phase.offset)
    moonHeightFactor.set(SKYBOX_DEFAULTS.moon.movement.heightFactor)
    moonSpeedFactor.set(SKYBOX_DEFAULTS.moon.movement.speedFactor)
    
    // Reset star layers to defaults
    starsLayers.set(SKYBOX_DEFAULTS.stars.layers)
  }
  
  // Update star layer properties
  const updateStarLayer = (layerIndex: number, property: string, value: any) => {
    starsLayers.update(layers => {
      const newLayers = [...layers];
      newLayers[layerIndex] = { 
        ...newLayers[layerIndex], 
        [property]: value 
      };
      return newLayers;
    });
  };
</script>

<!-- Extension UI -->
<ToolbarItem position="left">
  <HorizontalButtonGroup>
    <ToolbarButton
      label="SkyBox"
      icon="mdiWeatherNight"
      on:click={extension.toggleSkybox}
      tooltip="Toggle SkyBox"
      active={extension.state.skybox}
    />
    
    <DropDownPane title="SkyBox Settings">
      <div class="header-actions">
        <IconButton 
          icon="mdiRefresh" 
          label="Reset to Default"
          title="Reset to Default"
          on:click={resetSkyboxSettings}
        />
      </div>
      
      <Folder title="Day/Night Cycle" expanded={false}>
        <Slider
          value={cycleLengthMinutes}
          label="Day Length (min)"
          min={1}
          max={30}
          step={0.5}
          on:change={(e) => updateCycleLength(e.detail.value)}
        />
      </Folder>
      
      <Folder title="Sky Properties" expanded={false}>
        <Slider
          value={$skyRayleigh}
          label="Rayleigh"
          min={0}
          max={10}
          step={0.1}
          on:change={onSkyRayleighChange}
        />
        
        <Slider
          value={$skyTurbidity}
          label="Turbidity"
          min={0}
          max={20}
          step={0.1}
          on:change={onSkyTurbidityChange}
        />
        
        <Slider
          value={$skyMieCoefficient}
          label="Mie Coefficient"
          min={0}
          max={0.1}
          step={0.001}
          on:change={onSkyMieCoefficientChange}
        />
        
        <Slider
          value={$skyMieDirectionalG}
          label="Mie Directional G"
          min={0}
          max={1}
          step={0.01}
          on:change={onSkyMieDirectionalGChange}
        />

        <Slider
          value={$skyAzimuth}
          label="Azimuth"
          min={0}
          max={360}
          step={1}
          on:change={(e) => skyAzimuth.set(e.detail.value)}
        />
      </Folder>
      
      <Folder title="Moon" expanded={false}>
        <Checkbox 
          value={$moonEnabled}
          label="Enable Moon"
          on:change={(e) => moonEnabled.set(e.detail.value)}
        />
        {#if $moonEnabled}
          <div class="color-group">
            <label for="moon-color">Base Color</label>
            <input id="moon-color" type="color" 
              value={$moonColor}
              on:change={(e) => {
                const input = e.target as HTMLInputElement;
                moonColor.set(input.value);
              }} />
          </div>
          
          <Slider
            value={$moonSize}
            label="Size"
            min={10}
            max={50}
            step={1}
            on:change={(e) => moonSize.set(e.detail.value)}
          />
          
          <Slider
            value={$moonDistance}
            label="Distance"
            min={500}
            max={2000}
            step={100}
            on:change={(e) => moonDistance.set(e.detail.value)}
          />
          
          <Slider
            value={$moonOffset}
            label="Position Offset"
            min={0}
            max={360}
            step={1}
            on:change={(e) => moonOffset.set(e.detail.value)}
          />
          
          <Folder title="Movement" expanded={false}>
            <Slider
              value={$moonHeightFactor}
              label="Height Factor"
              min={0}
              max={1}
              step={0.1}
              on:change={(e) => moonHeightFactor.set(e.detail.value)}
            />
            <Slider
              value={$moonSpeedFactor}
              label="Speed Factor"
              min={0}
              max={1}
              step={0.1}
              on:change={(e) => moonSpeedFactor.set(e.detail.value)}
            />
          </Folder>
          
          <Folder title="Glow Effect" expanded={false}>
            <Checkbox 
              value={$moonEmissiveEnabled}
              label="Enable Glow"
              on:change={(e) => moonEmissiveEnabled.set(e.detail.value)}
            />
            {#if $moonEmissiveEnabled}
              <Slider
                value={$moonEmissiveIntensity}
                label="Intensity"
                min={0}
                max={1}
                step={0.1}
                on:change={(e) => moonEmissiveIntensity.set(e.detail.value)}
              />
              <div class="color-group">
                <label for="moon-emissive">Glow Color</label>
                <input id="moon-emissive" type="color" 
                  value={$moonEmissiveColor}
                  on:change={(e) => {
                    const input = e.target as HTMLInputElement;
                    moonEmissiveColor.set(input.value);
                  }} />
              </div>
            {/if}
          </Folder>
          
          <Folder title="Phase" expanded={false}>
            <Checkbox 
              value={$moonPhaseEnabled}
              label="Enable Phases"
              on:change={(e) => moonPhaseEnabled.set(e.detail.value)}
            />
            {#if $moonPhaseEnabled}
              <Slider
                value={$moonPhaseOffset}
                label="Phase Offset"
                min={0}
                max={1}
                step={0.1}
                on:change={(e) => moonPhaseOffset.set(e.detail.value)}
              />
              <div class="moon-phases-guide">
                <div class="phase-icons">
                  🌑 🌓 🌕 🌗
                </div>
                <div class="phase-labels">
                  <span>New</span>
                  <span>First Quarter</span>
                  <span>Full</span>
                  <span>Last Quarter</span>
                </div>
              </div>
            {/if}
          </Folder>
        {/if}
      </Folder>
      
      <Folder title="Star Field" expanded={false}>
        <Slider
          value={$starsDepth}
          label="Stars Depth"
          min={10}
          max={100}
          step={1}
          on:change={onStarsDepthChange}
        />
        
        <Slider
          value={$starsDawnApproach}
          label="Dawn Approach"
          min={-5}
          max={0}
          step={0.1}
          on:change={onStarsDawnApproachChange}
        />
        
        <Slider
          value={$starsDaylightStart}
          label="Daylight Start"
          min={-4}
          max={0}
          step={0.1}
          on:change={onStarsDaylightStartChange}
        />
        
        <Folder title="Star Layers" expanded={false}>
          {#each $starsLayers as layer, i}
            <Folder title="Layer {i + 1}" expanded={false}>
              <Slider
                value={layer.count}
                label="Count"
                min={50}
                max={i === 3 ? 500 : 3000}
                step={i === 3 ? 10 : 100}
                on:change={(e) => updateStarLayer(i, 'count', e.detail.value)}
              />
              
              <Slider
                value={layer.size}
                label="Size"
                min={0.5}
                max={15}
                step={0.25}
                on:change={(e) => updateStarLayer(i, 'size', e.detail.value)}
              />
              
              <Slider
                value={layer.speed}
                label="Speed"
                min={0}
                max={1}
                step={0.05}
                on:change={(e) => updateStarLayer(i, 'speed', e.detail.value)}
              />
              
              <Slider
                value={layer.factor}
                label="Factor"
                min={1}
                max={6}
                step={0.5}
                on:change={(e) => updateStarLayer(i, 'factor', e.detail.value)}
              />

              <Slider
                value={layer.opacity}
                label="Opacity"
                min={0}
                max={1}
                step={0.1}
                on:change={(e) => updateStarLayer(i, 'opacity', e.detail.value)}
              />

              <div class="color-group">
                <label for="star-color-{i}">Color</label>
                <input id="star-color-{i}" type="color" 
                  value={typeof layer.color === 'object' ? `#${layer.color.getHexString()}` : layer.color}
                  on:change={(e) => {
                    const input = e.target as HTMLInputElement;
                    updateStarLayer(i, 'color', new THREE.Color(input.value));
                  }} />
              </div>
            </Folder>
          {/each}
        </Folder>
        
        <Folder title="Constellations" expanded={false}>
          <Slider
            value={$constellationsCount}
            label="Count"
            min={0}
            max={50}
            step={1}
            on:change={onConstellationsCountChange}
          />
          
          <Slider
            value={$constellationsSize}
            label="Size"
            min={1}
            max={30}
            step={0.5}
            on:change={onConstellationsSizeChange}
          />
          
          <Slider
            value={$constellationsDepth}
            label="Depth"
            min={10}
            max={100}
            step={5}
            on:change={onConstellationsDepthChange}
          />
          
          <Slider
            value={$constellationsFactor}
            label="Factor"
            min={1}
            max={10}
            step={0.5}
            on:change={onConstellationsFactorChange}
          />

          <Slider
            value={$constellationsSpeed}
            label="Speed"
            min={0}
            max={1}
            step={0.05}
            on:change={onConstellationsSpeedChange}
          />
          
          <Slider
            value={$constellationsRadius}
            label="Radius"
            min={100}
            max={1000}
            step={50}
            on:change={onConstellationsRadiusChange}
          />
          
          <Slider
            value={$constellationsSaturation}
            label="Saturation"
            min={0}
            max={2}
            step={0.1}
            on:change={onConstellationsSaturationChange}
          />

          <div class="color-group">
            <label for="constellation-color">Color</label>
            <input id="constellation-color" type="color" 
              value={typeof $constellationsColor === 'object' ? `#${$constellationsColor.getHexString()}` : $constellationsColor}
              on:change={(e) => {
                const input = e.target as HTMLInputElement;
                constellationsColor.set(new THREE.Color(input.value));
              }} />
          </div>
        </Folder>
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
  
  .moon-phases-guide {
    margin-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 8px;
  }
  
  .phase-icons {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    font-size: 1.2em;
  }
  
  .phase-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.7em;
    color: rgba(255, 255, 255, 0.6);
  }
  
  .phase-labels span {
    text-align: center;
    flex: 1;
  }
  
  .color-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0.5rem 0;
  }

  .color-group label {
    min-width: 100px;
  }

  .color-group input[type="color"] {
    width: 50px;
    height: 25px;
    padding: 0;
    border: none;
    border-radius: 4px;
  }
</style>

<slot /> 