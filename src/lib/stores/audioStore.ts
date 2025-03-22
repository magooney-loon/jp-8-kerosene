import { writable } from 'svelte/store';

// Create a store to track whether sound is enabled
export const soundEnabled = writable(true);

// Helper function to toggle sound
export function toggleSound() {
    soundEnabled.update(current => !current);
} 