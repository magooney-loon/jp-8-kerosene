import { writable, derived } from 'svelte/store';
import { SMAAPreset, KernelSize } from 'postprocessing';

// ==============================
// Default Settings
// ==============================

/**
 * Default configuration values for renderer settings
 */
export const RENDERER_DEFAULTS = {
  postProcessing: true,
  bloom: {
    enabled: true,
    intensity: 6,
    luminanceThreshold: 0.15,
    luminanceSmoothing: 0.08,
    height: 512,
    width: 512,
    mipmapBlur: true,
    kernelSize: KernelSize.MEDIUM
  },
  smaa: {
    enabled: true,
    preset: SMAAPreset.LOW
  },
  vignette: {
    enabled: true,
    eskil: false,
    offset: 0.2,
    darkness: 0.75
  }
};

// ==============================
// Renderer Configuration Store
// ==============================

/**
 * Main toggle for all post-processing effects
 */
export const postProcessingEnabled = writable(RENDERER_DEFAULTS.postProcessing);

// ==============================
// Bloom Effect Settings
// ==============================

/**
 * Toggle for bloom effect
 */
export const bloomEnabled = writable(RENDERER_DEFAULTS.bloom.enabled);

/**
 * Intensity of the bloom effect
 */
export const bloomIntensity = writable(RENDERER_DEFAULTS.bloom.intensity);

/**
 * Luminance threshold for bloom effect (brightness cutoff)
 */
export const bloomLuminanceThreshold = writable(RENDERER_DEFAULTS.bloom.luminanceThreshold);

/**
 * Smoothing factor for bloom threshold transition
 */
export const bloomLuminanceSmoothing = writable(RENDERER_DEFAULTS.bloom.luminanceSmoothing);

/**
 * Height of the bloom render target
 */
export const bloomHeight = writable(RENDERER_DEFAULTS.bloom.height);

/**
 * Width of the bloom render target
 */
export const bloomWidth = writable(RENDERER_DEFAULTS.bloom.width);

/**
 * Whether to use mipmap blur for bloom
 */
export const bloomMipmapBlur = writable(RENDERER_DEFAULTS.bloom.mipmapBlur);

/**
 * Kernel size for bloom blur
 */
export const bloomKernelSize = writable(RENDERER_DEFAULTS.bloom.kernelSize);

// ==============================
// Anti-aliasing Settings
// ==============================

/**
 * Toggle for SMAA anti-aliasing
 */
export const smaaEnabled = writable(RENDERER_DEFAULTS.smaa.enabled);

/**
 * Quality preset for SMAA anti-aliasing
 */
export const smaaPreset = writable(RENDERER_DEFAULTS.smaa.preset);

// ==============================
// Vignette Effect Settings
// ==============================

/**
 * Toggle for vignette effect
 */
export const vignetteEnabled = writable(RENDERER_DEFAULTS.vignette.enabled);

/**
 * Whether to use Eskil's vignette technique
 */
export const vignetteEskil = writable(RENDERER_DEFAULTS.vignette.eskil);

/**
 * Offset of the vignette effect (higher = smaller vignette)
 */
export const vignetteOffset = writable(RENDERER_DEFAULTS.vignette.offset);

/**
 * Darkness of the vignette effect
 */
export const vignetteDarkness = writable(RENDERER_DEFAULTS.vignette.darkness);

// ==============================
// Derived Configuration Objects
// ==============================

/**
 * Combined bloom effect configuration
 */
export const bloomConfig = derived(
    [bloomEnabled, bloomIntensity, bloomLuminanceThreshold, bloomLuminanceSmoothing, 
     bloomHeight, bloomWidth, bloomMipmapBlur, bloomKernelSize],
    ([$bloomEnabled, $bloomIntensity, $bloomLuminanceThreshold, $bloomLuminanceSmoothing, 
      $bloomHeight, $bloomWidth, $bloomMipmapBlur, $bloomKernelSize]) => ({
        enabled: $bloomEnabled,
        intensity: $bloomIntensity,
        luminanceThreshold: $bloomLuminanceThreshold,
        luminanceSmoothing: $bloomLuminanceSmoothing,
        height: $bloomHeight,
        width: $bloomWidth,
        mipmapBlur: $bloomMipmapBlur,
        kernelSize: $bloomKernelSize
    })
);

/**
 * Combined SMAA effect configuration
 */
export const smaaConfig = derived(
    [smaaEnabled, smaaPreset],
    ([$smaaEnabled, $smaaPreset]) => ({
        enabled: $smaaEnabled,
        preset: $smaaPreset
    })
);

/**
 * Combined vignette effect configuration
 */
export const vignetteConfig = derived(
    [vignetteEnabled, vignetteEskil, vignetteOffset, vignetteDarkness],
    ([$vignetteEnabled, $vignetteEskil, $vignetteOffset, $vignetteDarkness]) => ({
        enabled: $vignetteEnabled,
        eskil: $vignetteEskil,
        offset: $vignetteOffset,
        darkness: $vignetteDarkness
    })
);

/**
 * Complete post-processing configuration
 */
export const postProcessingConfig = derived(
    [bloomConfig, smaaConfig, vignetteConfig],
    ([$bloomConfig, $smaaConfig, $vignetteConfig]) => ({
        bloom: $bloomConfig,
        smaa: $smaaConfig,
        vignette: $vignetteConfig
    })
); 