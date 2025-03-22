<script lang="ts">
  import {
    useStudio,
    ToolbarItem,
    HorizontalButtonGroup,
    ToolbarButton
  } from '@threlte/studio/extend'
  import Stats from 'three/addons/libs/stats.module.js'
  import { onMount, onDestroy } from 'svelte'
  import { PerfMonitor } from '@threlte/extras'
  
  // Extension scope
  const extensionScope = 'stats-extension'
  
  // Create the extension
  const { createExtension } = useStudio()
  
  // Define the extension state and actions types
  type StatsState = {
    visible: boolean
  }
  
  type StatsActions = {
    toggleStats: () => void
    setVisible: (visible: boolean) => void
  }
  
  // Create stats instances
  let statsFPS = new Stats()
  let statsMS = new Stats()
  let statsMB = new Stats()
  
  let animationFrameId: number | null = null
  
  /**
   * Helper function to toggle stats visibility
   */
  function toggleStatsVisibility(show: boolean): void {
    if (!statsFPS?.dom) return
    
    statsFPS.dom.style.display = show ? 'block' : 'none'
    statsMS.dom.style.display = show ? 'block' : 'none'
    statsMB.dom.style.display = show ? 'block' : 'none'
  }
  
  // Create the extension
  const extension = createExtension<StatsState, StatsActions>({
    scope: extensionScope,
    state({ persist }) {
      return {
        visible: persist(true)
      }
    },
    actions: {
      toggleStats({ state }) {
        state.visible = !state.visible
        toggleStatsVisibility(state.visible)
      },
      setVisible({ state }, visible) {
        state.visible = visible
        toggleStatsVisibility(state.visible)
      }
    }
  })
  
  onMount(() => {
    // Configure stats panels
    statsFPS.showPanel(0) // 0: fps
    statsMS.showPanel(1) // 1: ms
    statsMB.showPanel(2) // 2: mb
    
    // Initialize the stats panels
    document.body.appendChild(statsFPS.dom)
    document.body.appendChild(statsMS.dom)
    document.body.appendChild(statsMB.dom)
    
    // Position stats panels horizontally
    statsFPS.dom.style.cssText = 'position:fixed;bottom:120px;left:10px;z-index:999;'
    statsMS.dom.style.cssText = 'position:fixed;bottom:120px;left:90px;z-index:999;'
    statsMB.dom.style.cssText = 'position:fixed;bottom:120px;left:170px;z-index:999;'
    
    // Start updating stats in animation frame
    function updateStats() {
      statsFPS.begin()
      statsMS.begin()
      statsMB.begin()
      
      statsFPS.end()
      statsMS.end()
      statsMB.end()
      
      animationFrameId = requestAnimationFrame(updateStats)
    }
    
    animationFrameId = requestAnimationFrame(updateStats)
    
    // Set initial visibility
    toggleStatsVisibility(extension.state.visible)
  })
  
  onDestroy(() => {
    // Stop animation frame
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
    
    // Remove DOM elements
    if (statsFPS?.dom && statsFPS.dom.parentNode) {
      statsFPS.dom.parentNode.removeChild(statsFPS.dom)
    }
    
    if (statsMS?.dom && statsMS.dom.parentNode) {
      statsMS.dom.parentNode.removeChild(statsMS.dom)
    }
    
    if (statsMB?.dom && statsMB.dom.parentNode) {
      statsMB.dom.parentNode.removeChild(statsMB.dom)
    }
  })
</script>

<!-- Extension UI -->
<ToolbarItem position="left">
  <HorizontalButtonGroup>
    <ToolbarButton
      label="Stats"
      icon="mdiChartBar"
      on:click={extension.toggleStats}
      tooltip="Toggle Stats Display"
      active={extension.state.visible}
    />
  </HorizontalButtonGroup>
</ToolbarItem>

<!-- PerfMonitor integrated into the extension -->
{#if extension.state.visible}
  <PerfMonitor anchorY={'bottom'} anchorX={'left'} logsPerSecond={30} />
{/if}

<slot /> 