<script lang="ts">
import { arrow, computePosition, offset, shift } from '@floating-ui/dom';
import { Pane } from 'svelte-tweakpane-ui';
import IconButton from './IconButton.svelte';
import Icon from './Icon.svelte';
import type { Placement } from '@floating-ui/dom';
import { writable } from 'svelte/store';
import type { Section } from './types';

let ref: HTMLElement;
let tooltipEl: HTMLElement;
let arrowEl: HTMLElement;

// Configuration props
export let placement: Placement = 'bottom';
export let title = '';
export let icon = 'mdiChevronDown';
export let visible = false;

// Section management props
export let sections: Section[] = [];
export let defaultExpanded = true;
export let activeSectionId = writable<string | null>(null);

// Store for tracking which sections are expanded
const expandedSections = writable<Record<string, boolean>>({});

// Initialize all sections to expanded state if defaultExpanded is true
$: if (sections && sections.length && defaultExpanded) {
  const initialState: Record<string, boolean> = {};
  sections.forEach((section) => {
    initialState[section.id] = true;
  });
  expandedSections.set(initialState);
}

/**
 * Toggle a section's expanded state and make it the active section
 */
function toggleSection(sectionId: string) {
  expandedSections.update(state => ({
    ...state,
    [sectionId]: !state[sectionId]
  }));
  
  // Set the active section
  activeSectionId.set(sectionId);
}

/**
 * Show the dropdown pane
 */
export const show = () => {
    tooltipEl.style.display = 'block';
    update();
    visible = true;
};

/**
 * Hide the dropdown pane
 */
export const hide = () => {
    tooltipEl.style.display = 'none';
    visible = false;
};

/**
 * Toggle the dropdown pane visibility
 */
export const toggle = () => {
    if (!visible)
        show();
    else
        hide();
};

/**
 * Update the dropdown position using floating-ui
 */
async function update() {
    const { x, y, placement: finalPlacement, middlewareData } = await computePosition(ref, tooltipEl, {
        placement,
        middleware: [offset(2), shift({ padding: 6 }), arrow({ element: arrowEl })]
    });
    
    Object.assign(tooltipEl.style, {
        left: `${x}px`,
        top: `${y}px`
    });
    
    const { x: arrowX, y: arrowY } = middlewareData.arrow ?? {};
    
    const staticSide = {
        top: 'bottom',
        right: 'left',
        bottom: 'top',
        left: 'right'
    }[finalPlacement.split('-')[0]];
    
    if (!staticSide)
        return;
    
    Object.assign(arrowEl.style, {
        left: arrowX == null ? '' : `${arrowX}px`,
        top: arrowY == null ? '' : `${arrowY}px`,
        right: '',
        bottom: '',
        [staticSide]: '-4px'
    });
}

/**
 * Handle keyboard events for the section headers
 */
function handleKeyDown(event: KeyboardEvent, sectionId: string) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    toggleSection(sectionId);
  }
}

/**
 * Click outside directive - close dropdown when clicking outside
 */
function clickOutside(element: HTMLElement, callbackFunction: () => void) {
    function onClick(event: MouseEvent) {
        if (event.target && !element.contains(event.target as Node)) {
            callbackFunction();
        }
    }
    
    document.body.addEventListener('click', onClick);
    
    return {
        update(newCallbackFunction: () => void) {
            callbackFunction = newCallbackFunction;
        },
        destroy() {
            document.body.removeEventListener('click', onClick);
        }
    };
}
</script>

<div
  style="display: contents;"
  use:clickOutside={() => {
    hide()
  }}
>
  <div bind:this={ref}>
    <IconButton
      {icon}
      label="Toggle Pane"
      on:click={() => {
        toggle()
      }}
    />
  </div>

  <div
    bind:this={tooltipEl}
    class="tooltip"
    role="menu"
  >
    <Pane
      position="inline"
      {title}
      expanded
      userExpandable={false}
    >
      {#if sections && sections.length > 0}
        <!-- Render sections with collapsible headers -->
        {#each sections as section}
          <div class="dropdown-section">
            <div 
              class="section-header" 
              role="button"
              tabindex="0"
              on:click={() => toggleSection(section.id)}
              on:keydown={(e) => handleKeyDown(e, section.id)}
            >
              <div class="section-title">{section.title}</div>
              <div class="section-toggle">
                {#if $expandedSections[section.id]}
                  <Icon name="mdiChevronDown" size="16" />
                {:else}
                  <Icon name="mdiChevronRight" size="16" />
                {/if}
              </div>
            </div>
            
            {#if $expandedSections[section.id]}
              <div class="section-content">
                <!-- Pass the current section to the default slot -->
                <slot {section}></slot>
              </div>
            {/if}
          </div>
        {/each}
      {:else}
        <!-- Default slot for backward compatibility -->
        <slot></slot>
      {/if}
    </Pane>
    <div
      bind:this={arrowEl}
      class="arrow"
    ></div>
  </div>
</div>

<style>
  .tooltip {
    display: none;
    width: max-content;
    position: fixed;
    top: 0;
    left: 0;
    background: #222;
    color: white;
    padding: 4px;
    border-radius: 3px;
    font-size: 11px;
    font-family: monospace;
    z-index: 1000;
  }
  .arrow {
    position: absolute;
    background: #222;
    width: 8px;
    height: 8px;
    transform: rotate(45deg);
    border-bottom-right-radius: 999px;
  }
  
  /* Section styles */
  .dropdown-section {
    margin-bottom: 8px;
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    padding: 4px 8px;
    background-color: rgba(30, 41, 59, 0.5);
    border-radius: 4px;
    margin-bottom: 4px;
  }
  
  .section-header:hover {
    background-color: rgba(30, 41, 59, 0.8);
  }
  
  .section-title {
    font-weight: bold;
    font-size: 13px;
    color: #0ea5e9;
  }
  
  .section-toggle {
    color: #94a3b8;
  }
  
  .section-content {
    padding: 4px 8px;
    background-color: rgba(15, 23, 42, 0.3);
    border-radius: 4px;
  }
</style> 