import { writable, derived } from 'svelte/store';
import * as THREE from 'three';

// ==============================
// Default Settings
// ==============================

/**
 * Default configuration values for skybox settings
 */
export const SKYBOX_DEFAULTS = {
  enabled: true,
  cycle: "",
  rotationY: 0,
  positionY: 0,
  
  cycleLengthMs: 10 * 60 * 1000, // 10 minutes
  
  sky: {
    rayleigh: 4,
    turbidity: 10,
    mieCoefficient: 0.002,
    mieDirectionalG: 0.98,
    azimuth: 180
  },
  
  stars: {
    depth: 50,
    dawnApproach: -2.7,
    daylightStart: -2,
    
    layers: [
      { count: 1200, opacity: 1, factor: 2, speed: 0.5, size: 35.5, color: new THREE.Color(1, 1, 1.15) },
      { count: 900, opacity: 1, factor: 3, speed: 0.3, size: 47.0, color: new THREE.Color(1, 1, 1.2) },
      { count: 500, opacity: 1, factor: 4, speed: 0.2, size: 59.0, color: new THREE.Color(1, 1, 1.25) },
      { count: 80, opacity: 1, factor: 6, speed: 0.1, size: 81.0, color: new THREE.Color(1, 0.95, 0.9) }
    ],
    
    constellations: {
      count: 20,
      size: 18.0,
      depth: 60,
      factor: 7,
      speed: 0.1,
      radius: 500,
      saturation: 1.2,
      color: new THREE.Color(1, 0.9, 0.85)
    }
  },
  
  moon: {
    enabled: true,
    size: 20,           // Large size since it's far away
    distance: 900,      // Much further away for better scale
    offset: 45,     // Opposite of sun
    color: '#faf8f2',   // Slightly off-white moon color
    emissive: {
      enabled: true,
      intensity: 0.3,    // Reduced glow intensity
      color: '#ffebcd',  // Warm glow
    },
    phase: {
      enabled: true,
      offset: 0,         // Phase offset in cycle
    },
    movement: {
      heightFactor: 0.2, // Lower in the sky (0-1)
      speedFactor: 0.5,  // Move slower (0-1)
    }
  },
  
  camera: {
    fov: 60,
    near: 1,
    far: 3000,
    position: [0, 90, 180] as [number, number, number]
  },

};

// ==============================
// Basic State Controls
// ==============================

/**
 * Controls whether the skybox is enabled or disabled
 */
export const skyboxEnabled = writable(SKYBOX_DEFAULTS.enabled);

/**
 * Current cycle state name (e.g., "dawn", "day", "dusk", "night")
 */
export const cycle = writable(SKYBOX_DEFAULTS.cycle);

/**
 * Y-axis rotation of the skybox
 */
export const rotationY = writable(SKYBOX_DEFAULTS.rotationY);

/**
 * Y-axis position of the skybox
 */
export const positionY = writable(SKYBOX_DEFAULTS.positionY);

// ==============================
// Skybox Configuration Store
// ==============================

/**
 * Length of a complete day/night cycle in milliseconds
 * Default: 10 minutes (600,000ms)
 */
export const cycleLengthMs = writable(SKYBOX_DEFAULTS.cycleLengthMs);

// Sky settings
/**
 * Rayleigh scattering coefficient (affects sky color)
 */
export const skyRayleigh = writable(SKYBOX_DEFAULTS.sky.rayleigh);

/**
 * Sky turbidity (atmospheric thickness/haziness)
 */
export const skyTurbidity = writable(SKYBOX_DEFAULTS.sky.turbidity);

/**
 * Mie scattering coefficient (affects sunset glow)
 */
export const skyMieCoefficient = writable(SKYBOX_DEFAULTS.sky.mieCoefficient);

/**
 * Mie directional G value (affects sunset glow direction)
 */
export const skyMieDirectionalG = writable(SKYBOX_DEFAULTS.sky.mieDirectionalG);

/**
 * Sky azimuth (rotation) in degrees
 */
export const skyAzimuth = writable(SKYBOX_DEFAULTS.sky.azimuth);

// Stars settings
/**
 * Depth of the star field
 */
export const starsDepth = writable(SKYBOX_DEFAULTS.stars.depth);

/**
 * Sun elevation when stars begin to fade in/out
 */
export const starsDawnApproach = writable(SKYBOX_DEFAULTS.stars.dawnApproach);

/**
 * Sun elevation when stars are completely faded out
 */
export const starsDaylightStart = writable(SKYBOX_DEFAULTS.stars.daylightStart);

/**
 * Configuration for multiple star layers with different properties
 */
export const starsLayers = writable(SKYBOX_DEFAULTS.stars.layers);

// Constellation settings
/**
 * Number of constellations to generate
 */
export const constellationsCount = writable(SKYBOX_DEFAULTS.stars.constellations.count);

/**
 * Size of constellation shapes
 */
export const constellationsSize = writable(SKYBOX_DEFAULTS.stars.constellations.size);

/**
 * Depth of constellations in the star field
 */
export const constellationsDepth = writable(SKYBOX_DEFAULTS.stars.constellations.depth);

/**
 * Factor affecting constellation generation
 */
export const constellationsFactor = writable(SKYBOX_DEFAULTS.stars.constellations.factor);

/**
 * Speed of constellation movement
 */
export const constellationsSpeed = writable(SKYBOX_DEFAULTS.stars.constellations.speed);

/**
 * Radius around which constellations are distributed
 */
export const constellationsRadius = writable(SKYBOX_DEFAULTS.stars.constellations.radius);

/**
 * Color saturation of constellation stars
 */
export const constellationsSaturation = writable(SKYBOX_DEFAULTS.stars.constellations.saturation);

/**
 * Base color of constellation stars
 */
export const constellationsColor = writable(SKYBOX_DEFAULTS.stars.constellations.color);

// Camera settings
/**
 * Field of view for the skybox camera
 */
export const cameraFov = writable(SKYBOX_DEFAULTS.camera.fov);

/**
 * Near clipping plane for the skybox camera
 */
export const cameraNear = writable(SKYBOX_DEFAULTS.camera.near);

/**
 * Far clipping plane for the skybox camera
 */
export const cameraFar = writable(SKYBOX_DEFAULTS.camera.far);

/**
 * Initial position of the skybox camera
 */
export const cameraPosition = writable(SKYBOX_DEFAULTS.camera.position);

// Moon settings
/**
 * Toggle for moon visibility
 */
export const moonEnabled = writable(SKYBOX_DEFAULTS.moon.enabled);

/**
 * Size of the moon
 */
export const moonSize = writable(SKYBOX_DEFAULTS.moon.size);

/**
 * Distance of the moon from the center
 */
export const moonDistance = writable(SKYBOX_DEFAULTS.moon.distance);

/**
 * Offset angle from the sun (radians)
 */
export const moonOffset = writable(SKYBOX_DEFAULTS.moon.offset);

/**
 * Base color of the moon
 */
export const moonColor = writable(SKYBOX_DEFAULTS.moon.color);

/**
 * Moon emissive settings
 */
export const moonEmissiveEnabled = writable(SKYBOX_DEFAULTS.moon.emissive.enabled);
export const moonEmissiveIntensity = writable(SKYBOX_DEFAULTS.moon.emissive.intensity);
export const moonEmissiveColor = writable(SKYBOX_DEFAULTS.moon.emissive.color);

/**
 * Moon phase settings
 */
export const moonPhaseEnabled = writable(SKYBOX_DEFAULTS.moon.phase.enabled);
export const moonPhaseOffset = writable(SKYBOX_DEFAULTS.moon.phase.offset);

/**
 * Moon movement settings
 */
export const moonHeightFactor = writable(SKYBOX_DEFAULTS.moon.movement.heightFactor);
export const moonSpeedFactor = writable(SKYBOX_DEFAULTS.moon.movement.speedFactor);

// ==============================
// Derived Configuration Objects
// ==============================

/**
 * Combined sky configuration parameters
 */
export const skyConfig = derived(
    [skyRayleigh, skyTurbidity, skyMieCoefficient, skyMieDirectionalG, skyAzimuth],
    ([$skyRayleigh, $skyTurbidity, $skyMieCoefficient, $skyMieDirectionalG, $skyAzimuth]) => ({
        RAYLEIGH: $skyRayleigh,
        TURBIDITY: $skyTurbidity,
        MIE_COEFFICIENT: $skyMieCoefficient,
        MIE_DIRECTIONAL_G: $skyMieDirectionalG,
        AZIMUTH: $skyAzimuth
    })
);

/**
 * Combined stars and constellation configuration
 */
export const starsConfig = derived(
    [starsDepth, starsDawnApproach, starsDaylightStart, starsLayers, 
     constellationsCount, constellationsDepth, constellationsFactor, constellationsSpeed,
     constellationsRadius, constellationsSaturation, constellationsSize, constellationsColor],
    ([$starsDepth, $starsDawnApproach, $starsDaylightStart, $starsLayers,
      $constellationsCount, $constellationsDepth, $constellationsFactor, $constellationsSpeed,
      $constellationsRadius, $constellationsSaturation, $constellationsSize, $constellationsColor]) => ({
        DEPTH: $starsDepth,
        DAWN_APPROACH: $starsDawnApproach,
        DAYLIGHT_START: $starsDaylightStart,
        LAYERS: $starsLayers,
        CONSTELLATIONS: {
            COUNT: $constellationsCount,
            DEPTH: $constellationsDepth,
            FACTOR: $constellationsFactor,
            SPEED: $constellationsSpeed,
            RADIUS: $constellationsRadius,
            SATURATION: $constellationsSaturation,
            SIZE: $constellationsSize,
            COLOR: $constellationsColor
        }
    })
);

/**
 * Combined camera configuration
 */
export const cameraConfig = derived(
    [cameraFov, cameraNear, cameraFar, cameraPosition],
    ([$cameraFov, $cameraNear, $cameraFar, $cameraPosition]) => ({
        FOV: $cameraFov,
        NEAR: $cameraNear,
        FAR: $cameraFar,
        POSITION: $cameraPosition
    })
);

/**
 * Combined moon configuration
 */
export const moonConfig = derived(
    [moonEnabled, moonSize, moonDistance, moonOffset, moonColor,
     moonEmissiveEnabled, moonEmissiveIntensity, moonEmissiveColor,
     moonPhaseEnabled, moonPhaseOffset,
     moonHeightFactor, moonSpeedFactor],
    ([$moonEnabled, $moonSize, $moonDistance, $moonOffset, $moonColor,
      $moonEmissiveEnabled, $moonEmissiveIntensity, $moonEmissiveColor,
      $moonPhaseEnabled, $moonPhaseOffset,
      $moonHeightFactor, $moonSpeedFactor]) => ({
        enabled: $moonEnabled,
        SIZE: $moonSize,
        DISTANCE: $moonDistance,
        OFFSET: $moonOffset,
        COLOR: $moonColor,
        emissive: {
            enabled: $moonEmissiveEnabled,
            intensity: $moonEmissiveIntensity,
            color: $moonEmissiveColor
        },
        phase: {
            enabled: $moonPhaseEnabled,
            offset: $moonPhaseOffset
        },
        movement: {
            heightFactor: $moonHeightFactor,
            speedFactor: $moonSpeedFactor
        }
    })
);

/**
 * Complete skybox configuration object combining all settings
 */
export const skyboxConfig = derived(
    [cycleLengthMs, skyConfig, starsConfig, cameraConfig, moonConfig],
    ([$cycleLengthMs, $skyConfig, $starsConfig, $cameraConfig, $moonConfig]) => ({
        CYCLE_LENGTH_MS: $cycleLengthMs,
        SKY: $skyConfig,
        STARS: $starsConfig,
        CAMERA: $cameraConfig,
        MOON: $moonConfig
    })
); 