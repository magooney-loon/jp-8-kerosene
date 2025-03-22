import { writable } from 'svelte/store';

// Create a store to track whether high quality mode is enabled
export const highQualityEnabled = writable(true);

// Helper function to toggle quality mode
export function toggleQuality() {
    highQualityEnabled.update(current => !current);
} 