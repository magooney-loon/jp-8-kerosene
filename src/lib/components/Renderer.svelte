<script>
    import { useThrelte, useTask } from '@threlte/core'
    import { onMount } from 'svelte'
    import {
      EffectComposer,
      EffectPass,
      RenderPass,
      SMAAEffect,
      SMAAPreset,
      BloomEffect,
      KernelSize,
	  VignetteEffect,
    } from 'postprocessing'
    import { 
      bloomConfig, 
      smaaConfig, 
      vignetteConfig,
      postProcessingEnabled
    } from '$lib/stores/rendererStore'
  
    const { scene, renderer, camera, size } = useThrelte()
  
    // Adapt the default WebGLRenderer: https://github.com/pmndrs/postprocessing#usage
    const composer = new EffectComposer(renderer)
  
    const setupEffectComposer = (/** @type {import("three").Camera | undefined} */ camera) => {
      composer.removeAllPasses();
      
      // Always add the base render pass
      composer.addPass(new RenderPass(scene, camera));
      
      // Only add effect passes if post-processing is enabled
      if ($postProcessingEnabled) {
        // Create effects based on store configurations
        const effects = [];
        
        // Bloom effect
        if ($bloomConfig.enabled) {
          const bloomEffect = new BloomEffect({
            intensity: $bloomConfig.intensity,
            luminanceThreshold: $bloomConfig.luminanceThreshold,
            luminanceSmoothing: $bloomConfig.luminanceSmoothing,
            height: $bloomConfig.height,
            width: $bloomConfig.width,
            mipmapBlur: $bloomConfig.mipmapBlur,
            kernelSize: $bloomConfig.kernelSize
          });
          effects.push(bloomEffect);
        }
        
        // SMAA effect (anti-aliasing)
        if ($smaaConfig.enabled) {
          const smaaEffect = new SMAAEffect({ preset: $smaaConfig.preset });
          effects.push(smaaEffect);
        }
        
        // Vignette effect
        if ($vignetteConfig.enabled) {
          const vignetteEffect = new VignetteEffect({
            eskil: $vignetteConfig.eskil,
            offset: $vignetteConfig.offset,
            darkness: $vignetteConfig.darkness
          });
          effects.push(vignetteEffect);
        }
        
        // Only add the effect pass if there are effects to apply
        if (effects.length > 0) {
          const effectPass = new EffectPass(camera, ...effects);
          composer.addPass(effectPass);
        }
      }
    }
  
    // We need to set up the passes according to the camera in use
    // and whenever the post-processing state or effect configurations change
    $: setupEffectComposer($camera)
    $: if ($postProcessingEnabled !== undefined) setupEffectComposer($camera)
    $: if ($bloomConfig || $smaaConfig || $vignetteConfig) setupEffectComposer($camera)
    $: composer.setSize($size.width, $size.height)
  
    const { renderStage, autoRender } = useThrelte()
  
    // We need to disable auto rendering as soon as this component is
    // mounted and restore the previous state when it is unmounted.
    onMount(() => {
      let before = autoRender.current
      autoRender.set(false)
      return () => autoRender.set(before)
    })
  
    useTask((delta) => {
      if ($postProcessingEnabled) {
        // Render with post-processing
        composer.render(delta)
      } else {
        // Render without post-processing
        renderer.render(scene, $camera)
      }
    }, { stage: renderStage, autoInvalidate: false })
  </script>
  