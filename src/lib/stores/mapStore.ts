import { writable } from 'svelte/store';

// ==============================
// Default Settings
// ==============================

/**
 * Default configuration values for map settings
 */
export const MAP_DEFAULTS = {
  isGameMenu: true,
};

/**
 * Determines whether the game is currently in menu mode
 */
export const isGameMenu = writable(MAP_DEFAULTS.isGameMenu);

