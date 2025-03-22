<script lang="ts">
  import { onMount } from 'svelte';
  import { Audio } from '@threlte/extras';
  import { soundEnabled } from '$lib/stores/audioStore';
  import { 
    aiState, 
    startMissionTimer, 
    stopMissionTimer, 
    calculateEfficiency,
    saveHighScore,
    type HighScore,
    getHighScores
  } from '$lib/demo/hudStore'; // Import high score functions
  import { isGameMenu } from '$lib/stores/mapStore';
  
  // HUD Properties
  export let speed: number = 0;
  export let mach: number = 0;
  export let afterburnerEffect: number = 0;
  export let altitude: number = 5000;
  export let heading: number = 0;
  export let roll: number = 0;
  export let pitch: number = 0;
  export let gForce: number = 1.0;
  export let fuelPercent: number = 85;
  export let aoa: number = 0; // Add angle of attack
  export let isReverse: boolean = false; // Add reverse indicator
  export let isFiring: boolean = false; // Minigun firing state
  export let ammoCount: number = 6900; // Total ammo
  export let currentAmmo: number = 6900; // Current ammo
  
  // Auto-stabilization system
  export let isAutoStabilizing: boolean = false;
  export let autoStabilizationProgress: number = 0;
  export let recoveryThrustActive: boolean = false;
  
  // Afterburner cooldown state
  export let isAfterburnerCooldown: boolean = false;
  
  // Track UFO destroyed state
  let wasUfoDestroyed = false;
  
  // Animation timers for radar sweep
  let radarSweepAngle = 0;
  let radarInterval: number;
  
  // Stall effect animation variables
  let stallEffectActive = false;
  let stallEffectInterval: number;
  
  // Smooth number displays - adjust smoothing factors for more responsiveness
  let displaySpeed = speed;
  let displayMach = mach;
  let displayAltitude = altitude;
  let displayAoa = aoa;
  
  // Auto-stabilization animation
  let stabilizationPhase = 0;
  let stabilizationBlinkInterval: number;
  let diagonalOffset = 0;
  let stabilizationInterval: number;
  
  // Warning states
  let showStallWarning = false;
  let showOverGWarning = false;
  let showLowFuelWarning = false;
  let showAttitudeWarning = false;
  let lastWarningTime = 0;
  let warningFlash = false;
  let warningBlinkInterval: number;
  
  // Audio control
  let warningAudio: HTMLAudioElement | null = null;
  let lowFuelAudio: HTMLAudioElement | null = null;
  let warningPlaying = false;
  let lowFuelPlaying = false;
  let lastWarningState = false;
  let lastLowFuelState = false;
  
  // Calculated critical thresholds
  const CRITICAL_AOA = 20; // Degrees
  const STALL_SPEED = 25; // Low speed for stall warning
  const MAX_SAFE_G = 2.0; // G-force limit
  const LOW_FUEL_THRESHOLD = 20; // Percent
  const EXTREME_ATTITUDE_THRESHOLD = 65; // Degrees
  
  // G-LOC (G-induced Loss of Consciousness) effect calculation
  function calculateGLocEffectIntensity(gForceValue: number): number {
    if (gForceValue <= 1.0) return 0;
    
    if (gForceValue >= 6) {
      // Full blackout at 6G+
      return 0.98;
    } else if (gForceValue >= 3) {
      // Progressive blackout from 3G to 6G (0.5 - 0.98)
      return 0.5 + ((gForceValue - 3) / 3) * 0.48;
    } else if (gForceValue >= 2) {
      // Moderate tunnel vision from 2G to 3G (0.3 - 0.5)
      return 0.3 + ((gForceValue - 2) / 1) * 0.2;
    } else {
      // Light effect from 1.0G to 2G (0.1 - 0.3)
      return 0.1 + ((gForceValue - 1) / 1) * 0.2;
    }
  }
  
  // Added for realistic stall warning calculation
  let lastPitch = 0;
  
  // Lazy load audio elements
  function initializeAudio() {
    if (warningAudio === null && $soundEnabled) {
      try {
        warningAudio = new window.Audio('/sound/warning.mp3');
        if (warningAudio) {
          warningAudio.loop = true;
          warningAudio.volume = 0.09;
        }
        
        lowFuelAudio = new window.Audio('/sound/low_fuel.mp3');
        if (lowFuelAudio) {
          lowFuelAudio.loop = true;
          lowFuelAudio.volume = 0.36;
        }
      } catch (error) {
        console.error('Error initializing warning audio:', error);
      }
    }
  }
  
  // Subscribe to soundEnabled changes
  $: if ($soundEnabled) {
    initializeAudio();
  } else {
    // Stop any playing audio when sound is disabled
    if (warningAudio && warningPlaying) {
      warningAudio.pause();
      warningPlaying = false;
    }
    if (lowFuelAudio && lowFuelPlaying) {
      lowFuelAudio.pause();
      lowFuelPlaying = false;
    }
  }

  onMount(() => {
    // Start mission timer
    startMissionTimer();
    
    // Start radar animation
    radarInterval = setInterval(() => {
      radarSweepAngle = (radarSweepAngle + 6) % 360;
    }, 50);
    
    // Start warning blink animation
    warningBlinkInterval = setInterval(() => {
      warningFlash = !warningFlash;
    }, 500);
    
    // Start stabilization animation
    stabilizationInterval = setInterval(() => {
      stabilizationPhase = (stabilizationPhase + 1) % 8;
      // Calculate diagonal offset for stabilization brackets
      diagonalOffset = Math.sin(Date.now() * 0.008) * 4;
    }, 80);
    
    // Simpler stall effect timer that alternates between visible states
    stallEffectInterval = setInterval(() => {
      if (showStallWarning) {
        stallEffectActive = !stallEffectActive;
      } else {
        stallEffectActive = false;
      }
    }, 150);
    
    // Don't initialize audio on mount - wait for user interaction via soundEnabled
    
    return () => {
      clearInterval(radarInterval);
      clearInterval(warningBlinkInterval);
      clearInterval(stabilizationInterval);
      clearInterval(stallEffectInterval);
      
      // Stop the mission timer on component destruction
      stopMissionTimer();
      
      if (warningAudio) {
        warningAudio.pause();
        warningAudio = null;
      }
      
      if (lowFuelAudio) {
        lowFuelAudio.pause();
        lowFuelAudio = null;
      }
    };
  });
  
  // Update smoother displays with variable smoothing factors
  $: {
    // Use different smoothing factors for different values
    // Critical values like AOA and Mach need faster response
    const speedSmoothFactor = 0.85; // Smoother
    const machSmoothFactor = 0.75;  // More responsive 
    const aoaSmoothFactor = 0.7;    // Most responsive
    const altSmoothFactor = 0.9;    // Very smooth
    
    // Apply smoothing - faster response for critical flight data
    displaySpeed = displaySpeed * speedSmoothFactor + speed * (1-speedSmoothFactor);
    displayMach = displayMach * machSmoothFactor + mach * (1-machSmoothFactor);
    displayAltitude = displayAltitude * altSmoothFactor + altitude * (1-altSmoothFactor);
    displayAoa = displayAoa * aoaSmoothFactor + aoa * (1-aoaSmoothFactor);
    
    // Update warning states - make stall warning more nuanced
    // Only show stall warning in critical situations (extreme AoA + other factors)
    const extremeAttitude = Math.abs(roll) > 45 || Math.abs(pitch) > 30;
    const criticalAoA = displayAoa > CRITICAL_AOA;
    const veryLowSpeed = displaySpeed < STALL_SPEED * 0.8; // Only warn at 80% of stall speed
    
    // Require more conditions for stall warning
    showStallWarning = (criticalAoA && (extremeAttitude || veryLowSpeed)) || 
                       (veryLowSpeed && extremeAttitude);
    
    // Update the stall warning to ONLY show during extreme rotation situations
    const extremeRotation = Math.abs(roll) > 50 || Math.abs(pitch) > 40;
    //showStallWarning = extremeRotation; // Only show warning if rotation is extreme
    
    // Realistic stall warning based on actual aerodynamics
    // Stalls occur mainly due to exceeding critical angle of attack
    // Contributing factors: low airspeed, high rate of rotation, extreme attitude
    const criticalAoAExceeded = displayAoa > CRITICAL_AOA * 1.1; // Definitely exceeding critical AOA
    const approachingCriticalAoA = displayAoa > CRITICAL_AOA * 0.85; // Approaching critical AOA
    const lowAirspeed = displaySpeed < STALL_SPEED * 1.2; // Low airspeed but not extremely low
    const highRateOfPitch = Math.abs(pitch) > 30 && Math.abs(pitch - lastPitch) > 2; // Rapid pitch change
    
    // Store current pitch for next frame rate-of-change calculation
    lastPitch = pitch;
    
    // Complex stall condition based on realistic aerodynamics
    showStallWarning = 
      // Primary stall condition: critical AOA exceeded (regardless of speed)
      criticalAoAExceeded ||
      // Secondary conditions: combinations of factors
      (approachingCriticalAoA && lowAirspeed) ||
      (approachingCriticalAoA && highRateOfPitch) ||
      // Extreme case: very low speed with extreme attitude
      (veryLowSpeed && extremeAttitude);
    
    // Simple stall warning - ONLY when speed is below 25
    showStallWarning = displaySpeed < STALL_SPEED;
    
    showOverGWarning = gForce > MAX_SAFE_G;
    showLowFuelWarning = fuelPercent < LOW_FUEL_THRESHOLD;
    showAttitudeWarning = Math.abs(roll) > EXTREME_ATTITUDE_THRESHOLD || Math.abs(pitch) > EXTREME_ATTITUDE_THRESHOLD;
    
    // Only handle audio if sound is enabled
    if ($soundEnabled) {
      // Make sure audio is initialized before trying to play
      initializeAudio();
      
      // Handle low fuel and HIGH G warning sounds with the same audio
      if ((showLowFuelWarning || showOverGWarning) && !lowFuelPlaying && lowFuelAudio) {
        lowFuelAudio.play().catch(e => console.error("Error playing low fuel audio:", e));
        lowFuelPlaying = true;
      } 
      else if (!(showLowFuelWarning || showOverGWarning) && lowFuelPlaying && lowFuelAudio) {
        lowFuelAudio.pause();
        if (lowFuelAudio) lowFuelAudio.currentTime = 0;
        lowFuelPlaying = false;
      }
      
      // Handle other warning sounds
      const otherWarningActive = showStallWarning || showAttitudeWarning;
      
      // Only play generic warning if no warnings that use the low fuel sound are active
      if (otherWarningActive && !warningPlaying && warningAudio && !(showLowFuelWarning || showOverGWarning)) {
        warningAudio.play().catch(e => console.error("Error playing warning audio:", e));
        warningPlaying = true;
      } 
      else if ((!otherWarningActive || showLowFuelWarning || showOverGWarning) && warningPlaying && warningAudio) {
        warningAudio.pause();
        if (warningAudio) warningAudio.currentTime = 0;
        warningPlaying = false;
      }
    } else {
      // Ensure audio is stopped when sound is disabled
      if (warningPlaying && warningAudio) {
        warningAudio.pause();
        warningPlaying = false;
      }
      if (lowFuelPlaying && lowFuelAudio) {
        lowFuelAudio.pause();
        lowFuelPlaying = false;
      }
    }
    
    // Update last warning states for next comparison
    lastWarningState = showStallWarning || showAttitudeWarning;
    lastLowFuelState = showLowFuelWarning;
  }
  
  // Helper to format number with leading zeros
  function formatNumber(num: number, digits: number): string {
    return num.toFixed(0).padStart(digits, '0');
  }
  
  // Calculate a flight status message based on current conditions
  function getFlightStatus(): string {
    // Prioritize important states with clear hierarchy
    if (isReverse) return "REV THRUST";  // Move reverse check to top priority
    if (isAutoStabilizing) {
      if (recoveryThrustActive) return "AUTO-RECOVERY";
      return "STABILIZING";
    }
    if (showStallWarning) return "STALL";
    if (showOverGWarning) return "OVER-G";
    if (showAttitudeWarning) return "ATTITUDE";
    if (showLowFuelWarning) return "LOW FUEL";
    if (isFiring) return "FIRING";
    if (afterburnerEffect > 0) return "AFTERBURNER";
    if (Math.abs(roll) > 30) return "BANKING";
    if (Math.abs(pitch) > 30) return "PITCH HIGH";
    if (displayAoa > CRITICAL_AOA * 0.8) return "HIGH AOA"; // Add AOA warning without full stall
    if (displayMach >= 1) return "SUPERSONIC";
    if (displaySpeed > 80) return "CRUISE";
    if (displaySpeed < STALL_SPEED * 1.2) return "LOW SPEED"; // Add low speed indication without stall
    
    return "NOMINAL";
  }
  
  // Calculate system status based on current flight parameters
  function getSystemStatus(): string {
    if (isAutoStabilizing) return "AUTO-PILOT";
    if (isReverse) return "REVERSE MODE";
    if (showLowFuelWarning) return "WARNING";
    if (fuelPercent < 30) return "CAUTION";
    if (afterburnerEffect > 0) return "A/B ACTIVE";
    
    return "NORMAL";
  }
  
  // Get the flight mode based on current parameters
  function getFlightMode(): string {
    if (isReverse) return "REVERSE"; // Move reverse check to top priority
    if (isAutoStabilizing) {
      if (recoveryThrustActive) return "RECOVERY";
      return "STABILIZE";
    }
    if (isFiring) return "COMBAT";
    if (afterburnerEffect > 0) return "A/B";
    if (displaySpeed < STALL_SPEED + 5) return "SLOW";
    if (displayMach >= 1) return "SUPER";
    
    return "NORMAL";
  }

  // Calculate ammo status
  function getAmmoStatus(): string {
    const ammoPercent = (currentAmmo / ammoCount) * 100;
    if (ammoPercent <= 0) return "EMPTY";
    if (ammoPercent < 15) return "CRITICAL";
    if (ammoPercent < 30) return "LOW";
    return "OK";
  }
  
  // Format stabilization progress percentage
  function getStabilizationPercent(): string {
    return Math.round(autoStabilizationProgress * 100) + "%";
  }

  // Watch for UFO destroyed state changes
  $: {
    // If UFO just got destroyed, calculate efficiency
    if ($aiState?.isDestroyed && !wasUfoDestroyed) {
      wasUfoDestroyed = true;
      const ammoUsed = ammoCount - currentAmmo;
      calculateEfficiency(ammoUsed, ammoCount);
      
      // Save high score to localStorage
      const newScore: HighScore = {
        date: new Date().toISOString(),
        efficiency: $aiState.efficiency,
        timeElapsed: $aiState.timeElapsed,
        hits: $aiState.hitsReceived,
        ammoUsed: ammoUsed
      };
      
      // Simple approach - save score and check if it's a new high score
      saveHighScore(newScore);
      
      // Compare with previous high scores
      currentHighScores = getHighScores();
      isNewHighScore = currentHighScores.length > 0 && currentHighScores[0].date === newScore.date;
      
      // Calculate percentage differences from best high score
      if (!isNewHighScore && currentHighScores.length > 0) {
        const bestScore = currentHighScores[0];
        efficiencyDiff = Math.round(((newScore.efficiency - bestScore.efficiency) / bestScore.efficiency) * 100);
        timeDiff = Math.round(((bestScore.timeElapsed - newScore.timeElapsed) / bestScore.timeElapsed) * 100);
        hitsDiff = Math.round(((bestScore.hits - newScore.hits) / bestScore.hits) * 100);
        ammoDiff = Math.round(((bestScore.ammoUsed - newScore.ammoUsed) / bestScore.ammoUsed) * 100);
      }
    }
  }

  // Add these variables for high score comparison
  let currentHighScores: HighScore[] = [];
  let isNewHighScore = false;
  let efficiencyDiff = 0;
  let timeDiff = 0;
  let hitsDiff = 0;
  let ammoDiff = 0;

  // Function to restart the game
  function restartGame() {
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }
</script>

<div class="hud-container" class:stall-effect-1={showStallWarning && stallEffectActive} class:stall-effect-2={showStallWarning && !stallEffectActive}>
  
  <!-- G-force tunnel vision/blackout effect -->
  {#if gForce > 1.0}
    {@const gLoc = calculateGLocEffectIntensity(gForce)}
    <div class="gloc-overlay" style="opacity: {gLoc}"></div>
  {/if}
  
  <!-- Content from original HUD continues... -->
  
  <!-- Central crosshair and pitch ladder -->
  <div class="crosshair-container">
    <!-- existing code... -->
  </div>
  
  <!-- UFO Health Display -->
  <div class="ufo-health-display" class:active={$aiState?.isHit}>
    <div class="ufo-health-label">UFO</div>
    <div class="ufo-health-bars">
      <!-- Shield Bar -->
      {#if $aiState?.shieldActive}
        <div class="ufo-shield-container">
          <div class="ufo-shield-bar" style="width: {($aiState?.shieldHealth / $aiState?.maxShieldHealth) * 100}%;"></div>
        </div>
      {/if}
      
      <!-- Health Bar -->
      <div class="ufo-health-container">
        <div class="ufo-health-bar" 
             style="width: {($aiState?.health / $aiState?.maxHealth) * 100}%;"
             class:critical={$aiState?.health < 35}
             class:warning={$aiState?.health < 60 && $aiState?.health >= 35}>
        </div>
      </div>
    </div>
    
    <!-- Numerical display -->
    <div class="ufo-health-values">
      {#if $aiState?.shieldActive}
        <div class="ufo-shield-value">{Math.round($aiState?.shieldHealth)}</div>
      {/if}
      <div class="ufo-health-value" 
           class:critical={$aiState?.health < 35}
           class:warning={$aiState?.health < 60 && $aiState?.health >= 35}>
        {Math.round($aiState?.health)}
      </div>
    </div>
    
    <!-- Status Indicator -->
    <div class="ufo-status">
      {#if $aiState?.isDestroyed}
        <span class="status-destroyed">DESTROYED</span>
      {:else if $aiState?.criticalDamage}
        <span class="status-critical">CRITICAL</span>
      {:else if $aiState?.isHit}
        <span class="status-hit">HIT</span>
      {:else if $aiState?.shieldActive}
        <span class="status-shield">SHIELDED</span>
      {:else}
        <span>HOSTILE</span>
      {/if}
    </div>
    
    <!-- Hits received counter -->
    <!-- <div class="ufo-hits-counter">
      HITS: {$aiState?.hitsReceived || 0}
    </div> -->
  </div>

  <!-- Center frame with corners and all main HUD elements -->
  <div class="center-frame">
    <!-- Corner markers -->
    <div class="corner top-left"></div>
    <div class="corner top-right"></div>
    <div class="corner bottom-left"></div>
    <div class="corner bottom-right"></div>
    
    <!-- Auto-stabilization overlay - only visible when active -->
    {#if isAutoStabilizing}
      <div class="stabilization-overlay">
        <!-- Stabilization brackets that shrink as progress increases -->
        <div class="stabilization-brackets">
          <div class="stabilization-corner top-left" style="transform: translate({diagonalOffset}px, {diagonalOffset}px) scale({1 - autoStabilizationProgress * 0.6})"></div>
          <div class="stabilization-corner top-right" style="transform: translate({-diagonalOffset}px, {diagonalOffset}px) scale({1 - autoStabilizationProgress * 0.6})"></div>
          <div class="stabilization-corner bottom-left" style="transform: translate({diagonalOffset}px, {-diagonalOffset}px) scale({1 - autoStabilizationProgress * 0.6})"></div>
          <div class="stabilization-corner bottom-right" style="transform: translate({-diagonalOffset}px, {-diagonalOffset}px) scale({1 - autoStabilizationProgress * 0.6})"></div>
        </div>
        
        <!-- Spinning stabilization indicators -->
        <div class="stabilization-spinners" style="opacity: {0.5 + autoStabilizationProgress * 0.5}">
          {#each Array(8) as _, i}
            <div class="spinner-segment" style="transform: rotate({i * 45 + stabilizationPhase * 45}deg) translateY(-60px) scale({autoStabilizationProgress > 0.3 ? 0.8 : 0.5})"></div>
          {/each}
        </div>
        
        <!-- Progress circle that fills up -->
        <div class="stabilization-progress">
          <svg width="50" height="50" viewBox="0 0 70 70">
            <!-- Background circle -->
            <circle cx="35" cy="35" r="30" fill="none" stroke="rgba(92, 255, 142, 0.2)" stroke-width="1" />
            
            <!-- Progress arc that fills up -->
            <circle 
              cx="35" 
              cy="35" 
              r="30" 
              fill="none" 
              stroke={recoveryThrustActive ? "rgba(0, 200, 255, 0.8)" : "rgba(92, 255, 142, 0.8)"} 
              stroke-width="3"
              stroke-dasharray={Math.PI * 60}
              stroke-dashoffset={Math.PI * 60 * (1 - autoStabilizationProgress)}
              transform="rotate(-90, 35, 35)"
              stroke-linecap="round"
            />
            
            <!-- Progress percentage -->
            <text x="35" y="38" text-anchor="middle" font-size="10" 
                  class={recoveryThrustActive ? "recovery-text" : "stabilizing-text"}>
              {getStabilizationPercent()}
            </text>
            
            <!-- Status text -->
            <text x="35" y="48" text-anchor="middle" font-size="6" 
                  class={recoveryThrustActive ? "recovery-text" : "stabilizing-text"}>
              {recoveryThrustActive ? "RECOVERY" : "STABILIZING"}
            </text>
          </svg>
        </div>
      </div>
      
      <!-- Auto-stabilization status panel -->
      <div class="terminal-panel stabilization-panel" class:recovery-active={recoveryThrustActive}>
        <div class="panel-row">
          <span class="panel-label">AUTO-PILOT</span>
          <span class="panel-value blink">{recoveryThrustActive ? "RECOVERY" : "STABILIZING"}</span>
        </div>
        <div class="panel-row">
          <span class="panel-label">PROGRESS</span>
          <span class="panel-value">{getStabilizationPercent()}</span>
        </div>
        <div class="panel-row">
          <span class="panel-label">STATUS</span>
          <span class="panel-value" class:warning={autoStabilizationProgress < 0.5} class:recovery-text={recoveryThrustActive && autoStabilizationProgress >= 0.5}>
            {autoStabilizationProgress < 0.3 ? "ANALYZING" : 
             autoStabilizationProgress < 0.6 ? "CORRECTING" : 
             autoStabilizationProgress < 0.9 ? "STABILIZING" : "FINALIZING"}
          </span>
        </div>
      </div>
    {/if}
    
    <!-- Crosshair -->
    <div class="crosshair" class:active={isFiring}>
      <div class="crosshair-line horizontal"></div>
      <div class="crosshair-line vertical"></div>
      <div class="crosshair-circle"></div>
      
      <!-- Targeting elements that show only when firing -->
      {#if isFiring}
        <div class="targeting-elements">
          <div class="targeting-bracket top"></div>
          <div class="targeting-bracket right"></div>
          <div class="targeting-bracket bottom"></div>
          <div class="targeting-bracket left"></div>
        </div>
      {/if}
    </div>
    
    <!-- Fuel gauge - moved to top-right -->
    <div class="terminal-panel fuel-gauge">
      <div class="panel-label">FUEL</div>
      <div class="fuel-bar-container">
        <div class="fuel-bar" style="width: {fuelPercent}%;" class:warning={fuelPercent < 30} class:critical={fuelPercent < 15}></div>
      </div>
      <div class="panel-value" class:warning={fuelPercent < 30} class:critical={fuelPercent < 15}>
        {Math.round(fuelPercent)}%
      </div>
      
      <!-- Afterburner indicator -->
      {#if afterburnerEffect > 0 && !isReverse}
        <div class="afterburner-indicator" style="opacity: {afterburnerEffect};">
          <div class="afterburner-text">AFTERBURNER</div>
        </div>
      {:else if isAfterburnerCooldown && !isReverse}
        <div class="afterburner-cooldown-indicator">
          <div class="afterburner-text">COOLDOWN</div>
        </div>
      {/if}
      
      <!-- Reverse thrust indicator - made more prominent -->
      {#if isReverse}
        <div class="reverse-indicator" class:active={isReverse}>
          <span>REV</span>
        </div>
      {/if}
    </div>
    
    <!-- Flight path vector/velocity vector -->
   <!--  <div class="velocity-vector" style="transform: translate(-1500%, 1500%) rotate({-roll}deg) translateY({pitch * 2}px)">
      <div class="velocity-marker"></div>
    </div> -->
    
    <!-- Artificial horizon -->
    <div class="artificial-horizon" style="transform: rotate({-roll}deg)">
      <div class="horizon-line" style="transform: translateY({pitch * 2}px)"></div>
      <div class="pitch-ladder" style="transform: translateY({pitch * 2}px)">
        {#each Array(6) as _, i}
          {#if i !== 0}
            <div class="pitch-line" style="transform: translateY({i * -20}px)">
              <div class="pitch-label">+{i * 10}</div>
              <div class="pitch-tick"></div>
              <div class="pitch-tick right"></div>
            </div>
            <div class="pitch-line" style="transform: translateY({i * 20}px)">
              <div class="pitch-label">-{i * 10}</div>
              <div class="pitch-tick"></div>
              <div class="pitch-tick right"></div>
            </div>
          {/if}
        {/each}
      </div>
      <!-- Bank angle indicator -->
      <div class="bank-indicator">
        <div class="bank-marker"></div>
        {#each [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60] as angle}
          <div class="bank-tick" style="transform: rotate({angle}deg) translateY(-130px)"></div>
        {/each}
      </div>
    </div>
    
    <!-- Center ammo indicator -->
    <div class="center-ammo-indicator" class:active={isFiring || currentAmmo < ammoCount * 0.3}>
      <div class="bullet-counter">
        {#each Array(Math.min(10, Math.ceil(currentAmmo / 100))) as _, i}
          <div class="bullet-icon" class:active={isFiring && i === 0}></div>
        {/each}
      </div>
      
      <div class="ammo-count">
        <span class="ammo-current" class:warning={currentAmmo < ammoCount * 0.3} class:critical={currentAmmo < ammoCount * 0.15}>
          {currentAmmo}
        </span>
        <span class="ammo-separator">/</span>
        <span class="ammo-max">{ammoCount}</span>
      </div>
      
      <div class="ammo-bar-wrapper">
        <div class="ammo-bar" style="width: {(currentAmmo / ammoCount) * 100}%;" 
             class:warning={currentAmmo < ammoCount * 0.3} 
             class:critical={currentAmmo < ammoCount * 0.15}
             class:firing={isFiring}>
        </div>
      </div>
      
      {#if isFiring}
        <div class="firing-indicator-center">FIRING</div>
      {:else if currentAmmo <= 0}
        <div class="firing-indicator-center critical">NO AMMO</div>
      {:else if currentAmmo < ammoCount * 0.15}
        <div class="firing-indicator-center critical">AMMO LOW</div>
      {:else if currentAmmo < ammoCount * 0.3}
        <div class="firing-indicator-center warning">AMMO LOW</div>
      {/if}
    </div>
    
    <!-- Digital compass tape -->
    <div class="compass-tape">
      <div class="compass-inner" style="transform: translateX({-heading * 2}px)">
        {#each Array(36) as _, i}
          <div class="compass-tick" style="left: {i * 20}px">
            <div class="compass-label">{i * 10}</div>
          </div>
        {/each}
      </div>
      <div class="compass-pointer"></div>
    </div>
    
    <!-- G-force meter -->
    <div class="gforce-meter">
      <div class="gforce-label">G</div>
      <div class="gforce-bar-container">
        <!-- Adjust scale to show up to ~7.5G instead of just 1.5G -->
        <div class="gforce-bar" style="height: {Math.min(100, (gForce - 1) * 15)}%" class:warning={gForce > 2.0} class:critical={gForce > 5.0}></div>
      </div>
      <div class="gforce-value" class:warning={gForce > 2.0} class:critical={gForce > 5.0}>{gForce.toFixed(1)}</div>
      
      {#if gForce > 5.0}
        <div class="gforce-warning critical">HIGH G</div>
      {:else if gForce > 2.0}
        <div class="gforce-warning warning">HIGH G</div>
      {/if}
    </div>

    <!-- Speed indicator - moved to right -->
    <div class="terminal-panel speed-indicator">
      <div class="panel-label">SPD</div>
      <div class="panel-value">{Math.round(displaySpeed)}</div>
      <div class="panel-subvalue" 
           class:supersonic={displayMach >= 1}>
        M {displayMach.toFixed(2)}
      </div>
    </div>
    
    <!-- Throttle gauge -->
    <div class="throttle-gauge">
      <div class="throttle-label">THR</div>
      <div class="throttle-bar-container">
        <!-- Normal throttle section -->
        <div class="throttle-bar-normal" style="height: {Math.min(100, isReverse ? 0 : speed / 50 * 100)}%"></div>
        <!-- Afterburner section -->
        {#if afterburnerEffect > 0 && !isReverse}
          <div class="throttle-bar-afterburner" style="height: {afterburnerEffect * 30}%; bottom: 100%"></div>
        {/if}
        <!-- Reverse section - improved visualization -->
        {#if isReverse}
          <div class="throttle-bar-reverse" style="height: {Math.min(100, speed / 20 * 100)}%">
            <div class="reverse-stripes"></div>
          </div>
        {/if}
      </div>
      <!-- Reverse mode indicator for throttle -->
      {#if isReverse}
        <div class="throttle-mode">REV</div>
      {/if}
    </div>
    
    <!-- Altitude indicator - moved to left -->
    <div class="terminal-panel altitude-indicator">
      <div class="panel-label">ALT</div>
      <div class="panel-value">{Math.round(displayAltitude)}</div>
      <div class="panel-subvalue">FT</div>
    </div>
    
    <!-- Heading - inside top -->
    <div class="terminal-panel heading-indicator">
      <div class="panel-label">HDG</div>
      <div class="panel-value">{formatNumber(Math.round(heading) % 360, 3)}°</div>
    </div>
    
    <!-- Flight data panel - middle left -->
    <div class="terminal-panel flight-data-indicator">
      <div class="panel-row">
        <span class="panel-label">G</span>
        <span class="panel-value" class:critical={gForce > MAX_SAFE_G} class:warning={gForce > MAX_SAFE_G * 0.8}>
          {gForce.toFixed(1)}
        </span>
      </div>
      <div class="panel-row">
        <span class="panel-label">AOA</span>
        <span class="panel-value" 
              class:critical={displayAoa > CRITICAL_AOA} 
              class:warning={displayAoa > CRITICAL_AOA * 0.75}>
          {displayAoa.toFixed(1)}°
        </span>
      </div>
    </div>
    
    <!-- Attitude - inside bottom right -->
    <div class="terminal-panel attitude-indicator">
      <div class="panel-row">
        <span class="panel-label">R</span>
        <span class="panel-value" class:warning={Math.abs(roll) > 45} class:critical={Math.abs(roll) > 60}>
          {roll.toFixed(1)}°
        </span>
      </div>
      <div class="panel-row">
        <span class="panel-label">P</span>
        <span class="panel-value" class:warning={Math.abs(pitch) > 30} class:critical={Math.abs(pitch) > 45}>
          {pitch.toFixed(1)}°
        </span>
      </div>
    </div>
    
    <!-- New status panel - top left -->
    <div class="terminal-panel status-indicator">
      <div class="panel-row">
        <span class="panel-label">STATUS</span>
        <span class="panel-value" 
              class:critical={showStallWarning || showOverGWarning || showLowFuelWarning} 
              class:warning={showAttitudeWarning}
              class:recovery-text={isAutoStabilizing && recoveryThrustActive}
              class:stabilizing-text={isAutoStabilizing && !recoveryThrustActive}>
          {getFlightStatus()}
        </span>
      </div>
      <div class="panel-row">
        <span class="panel-label">MODE</span>
        <span class="panel-value" 
              class:supersonic={displayMach >= 1}
              class:recovery-text={isAutoStabilizing && recoveryThrustActive}
              class:stabilizing-text={isAutoStabilizing && !recoveryThrustActive}>
          {getFlightMode()}
        </span>
      </div>
      <div class="panel-row">
        <span class="panel-label">SYS</span>
        <span class="panel-value" 
              class:critical={showLowFuelWarning} 
              class:warning={fuelPercent < 30}
              class:recovery-text={isAutoStabilizing && recoveryThrustActive}
              class:stabilizing-text={isAutoStabilizing && !recoveryThrustActive}>
          {getSystemStatus()}
        </span>
      </div>
    </div>
  </div>
  
  <!-- Critical warnings layer -->
  {#if showStallWarning || showOverGWarning || showAttitudeWarning || showLowFuelWarning}
    <div class="critical-warnings" style="opacity: {warningFlash ? 1 : 0.6}">
      {#if showStallWarning}
        <div class="warning-message stall-warning">STALL WARNING</div>
      {/if}
      
      {#if showOverGWarning}
        <div class="warning-message gforce-warning">HIGH-G WARNING</div>
      {/if}
      
      {#if showAttitudeWarning}
        <div class="warning-message attitude-warning" style="scale:0.72">ATTITUDE CRITICAL</div>
      {/if}
      
      {#if showLowFuelWarning}
        <div class="warning-message fuel-warning">LOW FUEL</div>
      {/if}
    </div>
  {/if}
  
  <!-- Reverse thrust notification -->
  {#if isReverse && speed > 40}
    <div class="critical-warnings" style="opacity: {warningFlash ? 0.9 : 0.7}; scale:0.5">
      <div class="warning-message reverse-warning">REV THRUST</div>
    </div>
  {/if}
  
  <!-- Auto-stabilization activation alert -->
  {#if isAutoStabilizing && autoStabilizationProgress < 0.3}
    <div class="critical-warnings bottom-warnings" style="opacity: {warningFlash ? 1 : 0.6}">
      <div class="warning-message stabilization-warning">
        AUTO-STABILIZATION ACTIVATED
      </div>
    </div>
  {/if}
  
  <!-- Auto-recovery activation alert -->
  {#if isAutoStabilizing && recoveryThrustActive && autoStabilizationProgress < 0.6}
    <div class="critical-warnings bottom-warnings" style="opacity: {warningFlash ? 1 : 0.7}">
      <div class="warning-message recovery-warning">
        AUTO-RECOVERY THRUSTERS ENGAGED
      </div>
    </div>
  {/if}
  
  <!-- Control hints - in corner with minimal design -->
  <div class="terminal-panel control-hints" style="opacity: {speed < 50 ? 0.7 : 0}">
    <div class="panel-label">CONTROLS</div>
    <div class="hint-grid">
      <div class="hint">W: THRUST</div>
      <div class="hint">S: REVERSE</div>
      <div class="hint">A/D: ROLL</div>
      <div class="hint">SHIFT: BOOST</div>
      <div class="hint">SPACE: FIRE</div>
    </div>
  </div>
  
  <!-- UFO Hit Confirmation -->
  {#if $aiState?.isHit}
    <div class="hit-confirmation" style="opacity: {$aiState.isHit ? 1 : 0}">
      <div class="hit-message">
        HIT CONFIRMED
        {#if $aiState.shieldActive}
          <span class="shield-hit">SHIELD</span>
        {:else}
          <span class="hull-hit">HULL</span>
        {/if}
      </div>
    </div>
  {/if}
  
  <!-- UFO Destroyed Message -->
  {#if $aiState?.isDestroyed}
    <div class="ufo-destroyed-message">
      <div class="target-frame">
        <!-- Tech corner elements -->
        <div class="target-corner top-left"></div>
        <div class="target-corner top-right"></div>
        <div class="target-corner bottom-left"></div>
        <div class="target-corner bottom-right"></div>
        
        <div class="target-header">
          <div class="destroyed-text">TARGET DESTROYED</div>
          <div class="target-scan-line"></div>
        </div>
        
        <!-- SVG Animation -->
        <div class="target-svg-container">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <!-- Outer circle with rotating segments -->
            <g class="rotating-circles">
              {#each Array(8) as _, i}
                <path 
                  d="M60,10 A50,50 0 0,1 110,60" 
                  fill="none" 
                  stroke="rgba(255, 100, 0, 0.7)" 
                  stroke-width="1"
                  stroke-dasharray="20 40"
                  transform="rotate({i * 45}, 60, 60)"
                  class="rotating-segment"
                  style="animation-delay: {i * 0.2}s"
                />
              {/each}
            </g>
            
            <!-- Target crosshairs -->
            <line x1="60" y1="10" x2="60" y2="30" stroke="rgba(255, 160, 0, 0.8)" stroke-width="1.5" />
            <line x1="60" y1="90" x2="60" y2="110" stroke="rgba(255, 160, 0, 0.8)" stroke-width="1.5" />
            <line x1="10" y1="60" x2="30" y2="60" stroke="rgba(255, 160, 0, 0.8)" stroke-width="1.5" />
            <line x1="90" y1="60" x2="110" y2="60" stroke="rgba(255, 160, 0, 0.8)" stroke-width="1.5" />
            
            <!-- Center targeting elements -->
            <circle cx="60" cy="60" r="40" fill="none" stroke="rgba(255, 100, 0, 0.3)" stroke-width="1" class="pulsing-circle" />
            <circle cx="60" cy="60" r="30" fill="none" stroke="rgba(255, 100, 0, 0.5)" stroke-width="1" class="pulsing-circle" style="animation-delay: 0.5s" />
            <circle cx="60" cy="60" r="20" fill="none" stroke="rgba(255, 100, 0, 0.7)" stroke-width="1" class="pulsing-circle" style="animation-delay: 1s" />
            <circle cx="60" cy="60" r="10" fill="none" stroke="rgba(255, 160, 0, 0.9)" stroke-width="2" class="pulsing-circle" style="animation-delay: 1.5s" />
            
            <!-- Explosion effect -->
            <circle cx="60" cy="60" r="5" fill="rgba(255, 200, 0, 0.9)" class="explosion-core" />
            
            <!-- UFO silhouette (destroyed) -->
            <path 
              d="M40,60 C40,50 50,45 60,45 C70,45 80,50 80,60 C80,70 70,75 60,75 C50,75 40,70 40,60 Z" 
              fill="none" 
              stroke="rgba(255, 100, 0, 0.5)" 
              stroke-width="1.5"
              stroke-dasharray="3 2"
              class="ufo-outline"
            />
            
            <!-- Text elements -->
            <text x="60" y="20" text-anchor="middle" font-size="6" fill="rgba(255, 160, 0, 0.9)" class="blinking-text">CONFIRMED KILL</text>
            <text x="60" y="100" text-anchor="middle" font-size="6" fill="rgba(255, 160, 0, 0.9)" class="blinking-text" style="animation-delay: 0.5s">MISSION SUCCESSFUL</text>
          </svg>
        </div>
        
        <div class="stats-grid">
          <div class="stats-title">MISSION STATISTICS</div>
          <div class="stats-container">
            <div class="stat-column">
              <div class="stat-row">
                <div class="stat-label">HITS REQUIRED</div>
                <div class="stat-value">
                  {$aiState.hitsReceived}
                  {#if !isNewHighScore && currentHighScores.length > 0}
                    <span class="stat-diff {hitsDiff > 0 ? 'positive' : hitsDiff < 0 ? 'negative' : ''}">
                      {hitsDiff > 0 ? '+' : ''}{hitsDiff}%
                    </span>
                  {/if}
                </div>
              </div>
              <div class="stat-row">
                <div class="stat-label">TIME ELAPSED</div>
                <div class="stat-value">
                  {Math.floor($aiState.timeElapsed / 60)}:{($aiState.timeElapsed % 60).toString().padStart(2, '0')}
                  {#if !isNewHighScore && currentHighScores.length > 0}
                    <span class="stat-diff {timeDiff > 0 ? 'positive' : timeDiff < 0 ? 'negative' : ''}">
                      {timeDiff > 0 ? '+' : ''}{timeDiff}%
                    </span>
                  {/if}
                </div>
              </div>
            </div>
            <div class="stat-column">
              <div class="stat-row">
                <div class="stat-label">AMMO EXPENDED</div>
                <div class="stat-value">
                  {ammoCount - currentAmmo}
                  {#if !isNewHighScore && currentHighScores.length > 0}
                    <span class="stat-diff {ammoDiff > 0 ? 'positive' : ammoDiff < 0 ? 'negative' : ''}">
                      {ammoDiff > 0 ? '+' : ''}{ammoDiff}%
                    </span>
                  {/if}
                </div>
              </div>
              <div class="stat-row">
                <div class="stat-label">COMBAT EFFICIENCY</div>
                <div class="stat-value efficiency-score">
                  {$aiState.efficiency}%
                  {#if !isNewHighScore && currentHighScores.length > 0}
                    <span class="stat-diff {efficiencyDiff > 0 ? 'positive' : efficiencyDiff < 0 ? 'negative' : ''}">
                      {efficiencyDiff > 0 ? '+' : ''}{efficiencyDiff}%
                    </span>
                  {/if}
                </div>
              </div>
            </div>
          </div>
          
          <div class="data-lines">
            {#each Array(5) as _, i}
              <div class="data-line" style="animation-delay: {i * 0.2}s"></div>
            {/each}
          </div>
          
          <!-- High score indicator -->
          {#if isNewHighScore}
            <div class="new-highscore">NEW HIGH SCORE!</div>
          {/if}
          
          <!-- Play Again button -->
          <button class="play-again-button" on:click={restartGame}>
            <span class="button-bg"></span>
            <span class="button-text">RETURN TO BASE</span>
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Main HUD container */
  .hud-container {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    pointer-events: none;
    color: rgba(92, 255, 142, 0.7);
    font-family: 'Consolas', 'Courier New', monospace;
    text-shadow: 0 0 3px rgba(92, 255, 142, 0.3);
    font-weight: normal;
    overflow: hidden;
  }
  
  /* Simple stall effect that alternates between two states */
  .hud-container.stall-effect-1 {
    filter: hue-rotate(-30deg) brightness(1.2) contrast(1.1);
    color: rgba(255, 150, 100, 0.9);
    text-shadow: 0 0 5px rgba(255, 100, 0, 0.5);
    background-image: repeating-linear-gradient(
      0deg,
      rgba(255, 0, 0, 0.03) 0px,
      rgba(255, 0, 0, 0.03) 3px,
      transparent 3px,
      transparent 6px
    );
  }
  
  .hud-container.stall-effect-2 {
    filter: hue-rotate(30deg) brightness(0.9) contrast(1.2);
    color: rgba(255, 100, 50, 0.8);
    text-shadow: 0 0 3px rgba(255, 50, 0, 0.6);
    background-image: repeating-linear-gradient(
      0deg,
      rgba(255, 0, 0, 0.02) 0px,
      rgba(255, 0, 0, 0.02) 2px,
      transparent 2px,
      transparent 4px
    );
  }
  
  /* Terminal panel style - common for all panels */
  .terminal-panel {
    position: absolute;
    background: rgba(0, 20, 25, 0.2);
    border: 1px solid rgba(92, 255, 142, 0.2);
    padding: 2px 6px;
  }
  
  .panel-label {
    font-size: 0.6rem;
    opacity: 0.7;
    letter-spacing: 1px;
  }
  
  .panel-value {
    font-size: 0.69rem;
    letter-spacing: 1px;
  }
  
  .panel-subvalue {
    font-size: 0.6rem;
    opacity: 0.7;
  }
  
  .panel-row {
    display: flex;
    justify-content: space-between;
    gap: 6px;
  }
  
  /* Center frame with corner markers */
  .center-frame {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 50vw;  /* Increased from 720px */
    height: 50vh; /* Increased from 450px */
    transform: translate(-50%, -50%);
  }
  
 
  /* Artificial horizon */
  .artificial-horizon {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 300px;
    height: 300px;
    transform-origin: center center;
    transform: translate(-50%, -50%);
    overflow: hidden;
  }
  
  .horizon-line {
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    height: 2px;
    background: rgba(92, 255, 142, 0.8);
    transform-origin: center center;
  }
  
  .pitch-ladder {
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    height: 400px; /* Larger than the view to account for pitch movement */
    transform-origin: center center;
  }
  
  .pitch-line {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100px;
    height: 1px;
    background: rgba(92, 255, 142, 0.5);
    transform: translate(-50%, -50%);
  }
  
  .pitch-tick {
    position: absolute;
    top: 0;
    left: 0;
    width: 15px;
    height: 1px;
    background: rgba(92, 255, 142, 0.5);
  }
  
  .pitch-tick.right {
    left: auto;
    right: 0;
  }
  
  .pitch-label {
    position: absolute;
    left: -30px;
    top: -10px;
    font-size: 0.5rem;
    color: rgba(92, 255, 142, 0.7);
  }
  
  /* Bank angle indicator */
  .bank-indicator {
    position: absolute;
    top: 10px;
    left: 50%;
    width: 140px;
    height: 140px;
    transform: translateX(-50%);
  }
  
  .bank-marker {
    position: absolute;
    top: 0;
    left: 50%;
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-bottom: 10px solid rgba(92, 255, 142, 0.8);
    transform: translateX(-50%);
  }
  
  .bank-tick {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 8px;
    height: 2px;
    background: rgba(92, 255, 142, 0.6);
    transform-origin: 0 0;
  }
  
  /* G-Force meter */
  .gforce-meter {
    position: absolute;
    top: 50%;
    left: 15px;
    transform: translateY(-50%);
    height: 120px;
    width: 20px;
    background: rgba(0, 20, 25, 0.2);
    border: 1px solid rgba(92, 255, 142, 0.2);
    text-align: center;
  }
  
  .gforce-label {
    font-size: 0.6rem;
    margin-top: 2px;
  }
  
  .gforce-bar-container {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    width: 6px;
    height: 85px;
    background: rgba(20, 40, 40, 0.3);
    border: 1px solid rgba(92, 255, 142, 0.2);
  }
  
  .gforce-bar {
    position: absolute;
    bottom: 0;
    width: 100%;
    background: linear-gradient(to top, 
      rgba(92, 255, 142, 0.7),
      rgba(255, 204, 0, 0.7) 70%,
      rgba(255, 80, 0, 0.7) 90%);
  }
  
  .gforce-value {
    position: absolute;
    bottom: 3px;
    width: 100%;
    font-size: 0.55rem;
    text-align: center;
  }
  
  /* Digital compass tape */
  .compass-tape {
    position: absolute;
    top: 15px;
    left: 50%;
    transform: translateX(-50%);
    width: 200px;
    height: 20px;
    overflow: hidden;
    background: rgba(0, 20, 25, 0.2);
    border: 1px solid rgba(92, 255, 142, 0.2);
  }
  
  .compass-inner {
    position: absolute;
    top: 0;
    left: 50%;
    height: 100%;
    width: 720px; /* 360 degrees * 2px per degree */
  }
  
  .compass-tick {
    position: absolute;
    top: 0;
    height: 8px;
    width: 1px;
    background: rgba(92, 255, 142, 0.6);
  }
  
  .compass-label {
    position: absolute;
    top: 9px;
    left: -10px;
    width: 20px;
    text-align: center;
    font-size: 0.55rem;
  }
  
  .compass-pointer {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 6px solid rgba(92, 255, 142, 0.9);
  }
  
  /* Throttle gauge */
  .throttle-gauge {
    position: absolute;
    right: 15px;
    top: 50%;
    transform: translateY(-50%);
    height: 120px;
    width: 20px;
    background: rgba(0, 20, 25, 0.2);
    border: 1px solid rgba(92, 255, 142, 0.2);
    text-align: center;
  }
  
  .throttle-label {
    font-size: 0.6rem;
    margin-top: 2px;
  }
  
  .throttle-bar-container {
    position: relative;
    margin: 20px auto 5px;
    width: 8px;
    height: 85px;
    background: rgba(20, 40, 40, 0.3);
    border: 1px solid rgba(92, 255, 142, 0.2);
    overflow: visible;
  }
  
  .throttle-bar-normal {
    position: absolute;
    bottom: 0;
    width: 100%;
    background: linear-gradient(to top, rgba(92, 255, 142, 0.7), rgba(255, 204, 0, 0.7));
  }
  
  .throttle-bar-afterburner {
    position: absolute;
    width: 100%;
    background: linear-gradient(to top, rgba(255, 204, 0, 0.7), rgba(255, 80, 0, 0.9));
  }
  
  .throttle-bar-reverse {
    position: absolute;
    bottom: 0;
    width: 100%;
    background: rgba(0, 120, 255, 0.7);
    overflow: hidden;
  }
  
  .reverse-stripes {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: repeating-linear-gradient(
      -45deg,
      rgba(0, 180, 255, 0.3),
      rgba(0, 180, 255, 0.3) 4px,
      transparent 4px,
      transparent 8px
    );
    animation: reverse-flow 1s linear infinite;
  }
  
  .throttle-mode {
    position: absolute;
    bottom: -18px;
    width: 100%;
    text-align: center;
    font-size: 0.6rem;
    color: #00b4ff;
    font-weight: bold;
    text-shadow: 0 0 4px rgba(0, 180, 255, 0.5);
    animation: pulse 0.5s infinite alternate;
  }
  
  @keyframes reverse-flow {
    0% { background-position: 0 0; }
    100% { background-position: 8px 8px; }
  }
  
  .corner {
    position: absolute;
    width: 15px;
    height: 15px;
    border-color: rgba(92, 255, 142, 0.4);
  }
  
  .top-left {
    top: 0;
    left: 0;
    border-top: 1px solid;
    border-left: 1px solid;
  }
  
  .top-right {
    top: 0;
    right: 0;
    border-top: 1px solid;
    border-right: 1px solid;
  }
  
  .bottom-left {
    bottom: 0;
    left: 0;
    border-bottom: 1px solid;
    border-left: 1px solid;
  }
  
  .bottom-right {
    bottom: 0;
    right: 0;
    border-bottom: 1px solid;
    border-right: 1px solid;
  }
  
  /* Speed Indicator - moved to right */
  .speed-indicator {
    right: 40px;
    top: 50%;
    transform: translateY(-50%);
    text-align: right;
  }
  
  /* Altitude Indicator - moved to left */
  .altitude-indicator {
    left: 40px;
    top: 50%;
    transform: translateY(-50%);
  }
  
  /* Heading Indicator */
  .heading-indicator {
    top: 40px;
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
  }
  
  /* Flight Data Indicator */
  .flight-data-indicator {
    left: 20px;
    bottom: 15px;
  }
  
  /* Attitude Indicator */
  .attitude-indicator {
    right: 15px;
    bottom: 15px;
  }
  
  /* Fuel Gauge - moved to top-right */
  .fuel-gauge {
    top: 15px;
    right: 15px;
    width: 120px;
    text-align: center;
  }
  
  .fuel-bar-container {
    width: 100%;
    height: 4px;
    background: rgba(20, 40, 40, 0.3);
    border: 1px solid rgba(92, 255, 142, 0.2);
    margin: 3px 0;
  }
  
  .fuel-bar {
    height: 100%;
    background: linear-gradient(to right, rgba(255, 90, 0, 0.7), rgba(255, 204, 0, 0.7));
  }
  
  .afterburner-indicator {
    border: 2px solid rgb(255, 140, 0);
    border-radius: 4px;
    padding: 4px;
    position: absolute;
    left: 50%;
    bottom: -30px;
    transform: translateX(-50%);
    background-color: rgba(255, 140, 0, 0.3);
    font-family: 'Orbitron', sans-serif;
    font-size: 12px;
    color: rgb(255, 140, 0);
    text-shadow: 0 0 5px rgba(255, 140, 0, 0.8);
  }
  
  .afterburner-cooldown-indicator {
    border: 2px solid rgb(255, 0, 0);
    border-radius: 4px;
    padding: 4px;
    position: absolute;
    left: 50%;
    bottom: -30px;
    transform: translateX(-50%);
    background-color: rgba(255, 0, 0, 0.3);
    font-family: 'Orbitron', sans-serif;
    font-size: 12px;
    color: rgb(255, 0, 0);
    text-shadow: 0 0 5px rgba(255, 0, 0, 0.8);
  }
  
  .afterburner-text {
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: bold;
  }
  
  .reverse-indicator {
    position: absolute;
    right: 8px;
    top: 0;
    background: rgba(0, 120, 255, 0.2);
    border: 1px solid rgba(0, 180, 255, 0.3);
    padding: 1px 3px;
    font-size: 0.6rem;
    animation: pulse 0.5s infinite alternate;
    color: #00b4ff;
    z-index: 10;
  }
  
  .reverse-indicator.active {
    background: rgba(0, 120, 255, 0.4);
    border: 1px solid rgba(0, 180, 255, 0.6);
    box-shadow: 0 0 8px rgba(0, 180, 255, 0.5);
    color: #80dfff;
    animation: pulse-quick 0.3s infinite alternate;
  }
  
  .throttle-bar-reverse {
    position: absolute;
    bottom: 0;
    width: 100%;
    background: rgba(0, 120, 255, 0.7);
    overflow: hidden;
  }
  
  .reverse-stripes {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: repeating-linear-gradient(
      -45deg,
      rgba(0, 180, 255, 0.3),
      rgba(0, 180, 255, 0.3) 4px,
      transparent 4px,
      transparent 8px
    );
    animation: reverse-flow 1s linear infinite;
  }
  
  .throttle-mode {
    position: absolute;
    bottom: -18px;
    width: 100%;
    text-align: center;
    font-size: 0.6rem;
    color: #00b4ff;
    font-weight: bold;
    text-shadow: 0 0 4px rgba(0, 180, 255, 0.5);
    animation: pulse 0.5s infinite alternate;
  }
  
  @keyframes reverse-flow {
    0% { background-position: 0 0; }
    100% { background-position: 8px 8px; }
  }
  
  /* Control Hints - in bottom right corner */
  .control-hints {
    position: absolute;
    right: 15px;
    bottom: 60px;
    transition: opacity 0.5s ease;
    background: rgba(0, 20, 25, 0.15);
    border: 1px solid rgba(92, 255, 142, 0.15);
  }
  
  .hint-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1px;
    margin-top: 2px;
  }
  
  .hint {
    font-size: 0.6rem;
    white-space: nowrap;
    opacity: 0.8;
  }
  
  /* Animations */
  @keyframes pulse {
    from {
      opacity: 0.4;
    }
    to {
      opacity: 0.8;
    }
  }
  
  @keyframes pulse-quick {
    from { opacity: 0.7; }
    to { opacity: 1; }
  }
  
  /* Add these new styles for the warning indicators */
  .warning {
    color: rgba(255, 204, 0, 0.9);
    text-shadow: 0 0 5px rgba(255, 204, 0, 0.5);
  }
  
  .critical {
    color: rgba(255, 80, 0, 0.9);
    text-shadow: 0 0 5px rgba(255, 80, 0, 0.5);
    animation: pulse 0.5s infinite alternate;
  }
  
  .supersonic {
    color: rgba(0, 255, 255, 0.9);
    text-shadow: 0 0 4px rgba(0, 255, 255, 0.5);
  }
  
  /* Velocity vector indicator */
  /* .velocity-vector {
    position: absolute;
    top: 50%;
    left: 50%;
    pointer-events: none;
    z-index: 10;
  }
  
  .velocity-marker {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(92, 255, 142, 0.9);
    border-radius: 50%;
    position: relative;
  }
  
  .velocity-marker::before,
  .velocity-marker::after {
    content: '';
    position: absolute;
    background: rgba(92, 255, 142, 0.9);
  }
  
  .velocity-marker::before {
    width: 12px;
    height: 2px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
  
  .velocity-marker::after {
    width: 2px;
    height: 12px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  } */
  
  /* Status indicators panel - moved to top-left */
  .status-indicator {
    position: absolute;
    top: 15px;
    left: 15px;
    padding: 3px 8px;
  }
  
  /* Critical warnings container */
  .critical-warnings {
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: none;
    z-index: 100;
  }
  
  .warning-message {
    font-size: 1.2rem;
    font-weight: bold;
    margin: 5px 0;
    padding: 3px 12px;
    border: 1px solid;
    letter-spacing: 2px;
  }
  
  .stall-warning {
    color: rgba(255, 50, 0, 0.9);
    border-color: rgba(255, 50, 0, 0.5);
    background: rgba(40, 0, 0, 0.5);
    text-shadow: 0 0 5px rgba(255, 50, 0, 0.7);
  }
  
  .gforce-warning {
    color: rgba(255, 150, 0, 0.9);
    border-color: rgba(255, 150, 0, 0.5);
    background: rgba(40, 20, 0, 0.5);
    text-shadow: 0 0 5px rgba(255, 150, 0, 0.7);
  }
  
  .attitude-warning {
    color: rgba(255, 200, 0, 0.9);
    border-color: rgba(255, 200, 0, 0.5);
    background: rgba(40, 30, 0, 0.5);
    text-shadow: 0 0 5px rgba(255, 200, 0, 0.7);
  }
  
  .fuel-warning {
    color: rgba(255, 100, 0, 0.9);
    border-color: rgba(255, 100, 0, 0.5);
    background: rgba(40, 10, 0, 0.5);
    text-shadow: 0 0 5px rgba(255, 100, 0, 0.7);
  }
  
  /* Update existing style classes */
  .fuel-bar.warning {
    background: linear-gradient(to right, rgba(255, 140, 0, 0.7), rgba(255, 180, 0, 0.7));
  }
  
  .fuel-bar.critical {
    background: linear-gradient(to right, rgba(255, 50, 0, 0.7), rgba(255, 90, 0, 0.7));
    animation: pulse 0.5s infinite alternate;
  }
  
  /* Ammo counter */
  .ammo-bar {
    height: 100%;
    background: linear-gradient(to right, rgba(255, 255, 0, 0.7), rgba(92, 255, 142, 0.7));
  }
  
  .ammo-bar.warning {
    background: linear-gradient(to right, rgba(255, 140, 0, 0.7), rgba(255, 180, 0, 0.7));
  }
  
  .ammo-bar.critical {
    background: linear-gradient(to right, rgba(255, 50, 0, 0.7), rgba(255, 90, 0, 0.7));
    animation: pulse 0.5s infinite alternate;
  }
  
  
  /* Center ammo indicator */
  .center-ammo-indicator {
    position: absolute;
    left: 50%;
    bottom: 45px; /* Moved up from 25px */
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    background: rgba(0, 20, 25, 0.2);
    border: 1px solid rgba(92, 255, 142, 0.2);
    padding: 3px 12px;
    min-width: 140px;
    text-align: center;
    opacity: 0.5;
    transition: opacity 0.3s ease, transform 0.3s ease;
  }
  
  .center-ammo-indicator.active {
    opacity: 0.9;
    transform: translateX(-50%) scale(1.05);
    border-color: rgba(92, 255, 142, 0.4);
    box-shadow: 0 0 8px rgba(92, 255, 142, 0.2);
  }
  
  .bullet-counter {
    display: flex;
    justify-content: center;
    gap: 3px;
    margin-bottom: 2px;
    height: 6px;
  }
  
  .bullet-icon {
    width: 3px;
    height: 6px;
    background: rgba(92, 255, 142, 0.6);
    border-radius: 1px;
    transition: all 0.1s ease;
  }
  
  .bullet-icon.active {
    background: rgba(255, 255, 100, 0.9);
    box-shadow: 0 0 4px rgba(255, 255, 0, 0.7);
    transform: scaleY(1.5);
  }
  
  .ammo-count {
    font-size: 0.85rem;
    display: flex;
    justify-content: center;
    gap: 2px;
    margin-bottom: 3px;
  }
  
  .ammo-current {
    font-weight: bold;
  }
  
  .ammo-separator {
    opacity: 0.7;
  }
  
  .ammo-max {
    opacity: 0.7;
  }
  
  .ammo-bar-wrapper {
    width: 100%;
    height: 3px;
    background: rgba(40, 60, 60, 0.6);
    margin-bottom: 2px;
    border-radius: 1px;
    overflow: hidden;
  }
  
  .ammo-bar {
    height: 100%;
    background: rgba(92, 255, 142, 0.8);
    transition: width 0.2s ease;
  }
  
  .ammo-bar.firing {
    background: linear-gradient(to right, rgba(255, 255, 0, 0.7), rgba(92, 255, 142, 0.8));
    box-shadow: 0 0 4px rgba(255, 255, 0, 0.5);
    animation: pulse-quick 0.2s infinite alternate;
  }
  
  .firing-indicator-center {
    font-size: 0.65rem;
    letter-spacing: 1px;
    font-weight: bold;
    color: rgba(255, 255, 0, 0.9);
    text-shadow: 0 0 5px rgba(255, 255, 0, 0.5);
    animation: pulse 0.5s infinite alternate;
  }
  
  /* Update warning/critical styles to be more prominent */
  .warning {
    color: rgba(255, 204, 0, 0.9) !important;
    text-shadow: 0 0 5px rgba(255, 204, 0, 0.5) !important;
  }
  
  .critical {
    color: rgba(255, 80, 0, 0.9) !important;
    text-shadow: 0 0 5px rgba(255, 80, 0, 0.5) !important;
    animation: pulse 0.5s infinite alternate !important;
  }
  
  .ammo-bar.warning {
    background: linear-gradient(to right, rgba(255, 140, 0, 0.7), rgba(255, 204, 0, 0.9));
  }
  
  .ammo-bar.critical {
    background: linear-gradient(to right, rgba(255, 50, 0, 0.7), rgba(255, 140, 0, 0.9));
    animation: pulse 0.5s infinite alternate;
  }
  
  /* Crosshair */
  .crosshair {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 40px;
    height: 40px;
    transform: translate(-50%, -50%);
    opacity: 0.1;
    transition: all 0.2s ease;
  }
  
  .crosshair.active {
    opacity: 0.2;
    transform: translate(-50%, -50%) scale(1.1);
  }
  
  .crosshair-line {
    position: absolute;
    background: rgba(92, 255, 142, 0.7);
  }
  
  .crosshair-line.horizontal {
    width: 40px;
    height: 1px;
    top: 50%;
    left: 0;
    transform: translateY(-50%);
  }
  
  .crosshair-line.vertical {
    width: 1px;
    height: 40px;
    left: 50%;
    top: 0;
    transform: translateX(-50%);
  }
  
  .crosshair-circle {
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    border: 1px solid rgba(92, 255, 142, 0.7);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
  
  .targeting-elements {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    animation: rotate 4s linear infinite;
  }
  
  .targeting-bracket {
    position: absolute;
    width: 10px;
    height: 10px;
    border-color: rgba(255, 255, 0, 0.8);
  }
  
  .targeting-bracket.top {
    top: -15px;
    left: 50%;
    transform: translateX(-50%);
    border-top: 1px solid;
    border-left: 1px solid;
    border-right: 1px solid;
  }
  
  .targeting-bracket.right {
    top: 50%;
    right: -15px;
    transform: translateY(-50%);
    border-top: 1px solid;
    border-right: 1px solid;
    border-bottom: 1px solid;
  }
  
  .targeting-bracket.bottom {
    bottom: -15px;
    left: 50%;
    transform: translateX(-50%);
    border-bottom: 1px solid;
    border-left: 1px solid;
    border-right: 1px solid;
  }
  
  .targeting-bracket.left {
    top: 50%;
    left: -15px;
    transform: translateY(-50%);
    border-top: 1px solid;
    border-left: 1px solid;
    border-bottom: 1px solid;
  }
  
  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  /* Stabilization system styles */
  .stabilization-overlay {
    position: absolute;
    bottom: 20px; /* Position from bottom */
    left: 0;
    width: 100%;
    height: 120px; /* Fixed height at bottom */
    pointer-events: none;
    z-index: 20;
  }
  
  .stabilization-brackets {
    position: absolute;
    bottom: 15px;
    left: 50%;
    width: 250px; /* Fixed width */
    height: 80px; /* Fixed height */
    transform: translateX(-50%) scale(0.8);
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .stabilization-corner {
    position: absolute;
    width: 16px; /* Smaller */
    height: 16px; /* Smaller */
    border: 2px solid rgba(0, 200, 255, 0.7);
    transition: transform 0.3s ease;
  }
  
  .stabilization-corner.top-left {
    top: 0;
    left: 0;
    border-right: none;
    border-bottom: none;
  }
  
  .stabilization-corner.top-right {
    top: 0;
    right: 0;
    border-left: none;
    border-bottom: none;
  }
  
  .stabilization-corner.bottom-left {
    bottom: 0;
    left: 0;
    border-right: none;
    border-top: none;
  }
  
  .stabilization-corner.bottom-right {
    bottom: 0;
    right: 0;
    border-left: none;
    border-top: none;
  }
  
  .stabilization-progress {
    position: absolute;
    bottom: 55px; /* From bottom */
    left: 50%;
    transform: translateX(-50%) scale(0.7);
    text-align: center;
  }
  
  .stabilization-panel {
    position: absolute;
    bottom: 180px; /* Position higher from bottom */
    left: 50%; /* Center horizontally */
    transform: translateX(-50%) scale(0.95); /* Center horizontally and slightly increase scale */
    background: rgba(0, 20, 40, 0.4);
    border-color: rgba(0, 200, 255, 0.4);
    font-size: 0.8em;
    transform-origin: bottom center; /* Update transform origin for centered position */
    min-width: 160px; /* Ensure consistent width */
    z-index: 50; /* Ensure it's above other elements */
  }
  
  .stabilizing-text {
    color: rgba(0, 255, 200, 0.9);
    text-shadow: 0 0 5px rgba(0, 255, 200, 0.5);
  }
  
  .recovery-text {
    color: rgba(0, 160, 255, 0.9);
    text-shadow: 0 0 5px rgba(0, 160, 255, 0.5);
  }
  
  .stabilization-warning {
    color: rgba(0, 255, 200, 0.9);
    border-color: rgba(0, 255, 200, 0.5);
    background: rgba(0, 40, 30, 0.5);
    text-shadow: 0 0 5px rgba(0, 255, 200, 0.7);
  }
  
  .recovery-warning {
    color: rgba(0, 180, 255, 0.9);
    border-color: rgba(0, 180, 255, 0.5);
    background: rgba(0, 30, 50, 0.5);
    text-shadow: 0 0 5px rgba(0, 180, 255, 0.7);
  }
  
  .blink {
    animation: blinking 1s linear infinite alternate;
  }
  
  @keyframes blinking {
    0% { opacity: 0.7; }
    100% { opacity: 1; }
  }
  
  .reverse-warning {
    color: rgba(0, 160, 255, 0.9);
    border-color: rgba(0, 160, 255, 0.5);
    background: rgba(0, 20, 40, 0.5);
    text-shadow: 0 0 5px rgba(0, 160, 255, 0.7);
  }
  
  /* UFO Health Display */
  .ufo-health-display {
    position: absolute;
    top: 15px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    background: rgba(0, 20, 25, 0.3);
    border: 1px solid rgba(92, 255, 142, 0.2);
    padding: 4px 12px;
    transition: all 0.3s ease;
    min-width: 300px;
    z-index: 100;
  }
  
  .ufo-health-display.active {
    background: rgba(40, 20, 20, 0.5);
    border-color: rgba(255, 80, 0, 0.5);
    box-shadow: 0 0 10px rgba(255, 80, 0, 0.3);
  }
  
  .ufo-health-label {
    font-size: 0.8rem;
    margin-right: 10px;
    color: rgba(255, 100, 100, 0.9);
    text-shadow: 0 0 5px rgba(255, 100, 100, 0.5);
  }
  
  .ufo-health-bars {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  
  .ufo-health-container, .ufo-shield-container {
    height: 6px;
    background: rgba(40, 20, 20, 0.4);
    border: 1px solid rgba(100, 40, 40, 0.3);
    border-radius: 2px;
  }
  
  .ufo-shield-container {
    background: rgba(20, 30, 40, 0.4);
    border-color: rgba(40, 80, 120, 0.3);
  }
  
  .ufo-health-bar {
    height: 100%;
    background: linear-gradient(to right, rgba(255, 50, 0, 0.7), rgba(255, 100, 50, 0.7));
    border-radius: 1px;
  }
  
  .ufo-health-bar.warning {
    background: linear-gradient(to right, rgba(255, 140, 0, 0.7), rgba(255, 180, 50, 0.7));
  }
  
  .ufo-health-bar.critical {
    background: linear-gradient(to right, rgba(255, 20, 0, 0.7), rgba(255, 60, 0, 0.7));
    animation: pulse 0.5s infinite alternate;
  }
  
  .ufo-shield-bar {
    height: 100%;
    background: linear-gradient(to right, rgba(40, 100, 255, 0.7), rgba(100, 200, 255, 0.7));
    border-radius: 1px;
  }
  
  .ufo-health-values {
    margin: 0 8px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    min-width: 30px;
  }
  
  .ufo-health-value {
    font-size: 0.75rem;
    font-weight: bold;
    color: rgba(255, 100, 70, 0.9);
  }
  
  .ufo-health-value.warning {
    color: rgba(255, 180, 70, 0.9);
  }
  
  .ufo-health-value.critical {
    color: rgba(255, 60, 60, 0.9);
    animation: pulse 0.5s infinite alternate;
  }
  
  .ufo-shield-value {
    font-size: 0.75rem;
    color: rgba(100, 180, 255, 0.9);
  }
  
  .ufo-status {
    min-width: 70px;
    text-align: center;
    font-size: 0.7rem;
    font-weight: bold;
    letter-spacing: 1px;
  }
  
  .status-hit {
    color: rgba(255, 180, 70, 0.9);
    animation: pulse-quick 0.2s infinite alternate;
  }
  
  .status-critical {
    color: rgba(255, 60, 0, 0.9);
    animation: pulse 0.5s infinite alternate;
  }
  
  .status-destroyed {
    color: rgba(255, 30, 0, 0.9);
    animation: pulse 1s infinite alternate;
  }
  
  .status-shield {
    color: rgba(100, 180, 255, 0.9);
  }
  
  .ufo-hits-counter {
    margin-left: 10px;
    font-size: 0.7rem;
    color: rgba(255, 160, 100, 0.8);
  }
  
  /* Hit confirmation message */
  .hit-confirmation {
    position: absolute;
    top: 150px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 101;
    transition: opacity 0.15s ease;
  }
  
  .hit-message {
    font-size: 1.1rem;
    font-weight: bold;
    letter-spacing: 2px;
    padding: 5px 15px;
    background: rgba(40, 0, 0, 0.5);
    border: 1px solid rgba(255, 100, 0, 0.6);
    color: rgba(255, 160, 0, 0.9);
    text-shadow: 0 0 5px rgba(255, 100, 0, 0.7);
    animation: pulse-quick 0.2s infinite alternate;
  }
  
  .shield-hit {
    color: rgba(80, 180, 255, 0.9);
    text-shadow: 0 0 5px rgba(80, 180, 255, 0.7);
  }
  
  .hull-hit {
    color: rgba(255, 60, 60, 0.9);
    text-shadow: 0 0 5px rgba(255, 60, 60, 0.7);
  }
  
  /* UFO Destroyed message */
  .ufo-destroyed-message {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 1000;
    background: rgba(20, 0, 0, 0.8);
    border: 2px solid rgba(255, 100, 0, 0.7);
    box-shadow: 0 0 30px rgba(255, 50, 0, 0.5);
    animation: victory-pulse 1.5s infinite alternate;
  }
  
  .target-frame {
    position: relative;
    width: 450px;
    padding: 20px;
  }
  
  .target-corner {
    position: absolute;
    width: 25px;
    height: 25px;
    border-color: rgba(255, 100, 0, 0.8);
  }
  
  .target-corner.top-left {
    top: 0;
    left: 0;
    border-top: 2px solid;
    border-left: 2px solid;
  }
  
  .target-corner.top-right {
    top: 0;
    right: 0;
    border-top: 2px solid;
    border-right: 2px solid;
  }
  
  .target-corner.bottom-left {
    bottom: 0;
    left: 0;
    border-bottom: 2px solid;
    border-left: 2px solid;
  }
  
  .target-corner.bottom-right {
    bottom: 0;
    right: 0;
    border-bottom: 2px solid;
    border-right: 2px solid;
  }
  
  .target-header {
    text-align: center;
    position: relative;
    margin-bottom: 20px;
  }
  
  .destroyed-text {
    font-size: 2rem;
    font-weight: bold;
    color: rgba(255, 100, 0, 0.9);
    text-shadow: 0 0 10px rgba(255, 50, 0, 0.8);
    letter-spacing: 3px;
  }
  
  .target-scan-line {
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    height: 2px;
    background: linear-gradient(
      to right,
      rgba(255, 100, 0, 0),
      rgba(255, 100, 0, 0.8) 50%,
      rgba(255, 100, 0, 0)
    );
    animation: scan-line 2s linear infinite;
  }
  
  .target-svg-container {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
  }
  
  .stats-grid {
    margin-top: 10px;
    color: rgba(255, 180, 0, 0.9);
  }
  
  .stats-title {
    font-size: 1.2rem;
    text-align: center;
    margin-bottom: 15px;
    letter-spacing: 2px;
    color: rgba(255, 140, 0, 0.9);
    text-shadow: 0 0 5px rgba(255, 100, 0, 0.7);
  }
  
  .stats-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }
  
  .stat-column {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .stat-label {
    font-size: 0.9rem;
    color: rgba(255, 180, 100, 0.8);
  }
  
  .stat-value {
    font-size: 1.1rem;
    color: rgba(255, 220, 150, 0.9);
    font-weight: bold;
  }
  
  .efficiency-score {
    color: rgba(100, 255, 150, 0.9);
    text-shadow: 0 0 5px rgba(100, 255, 150, 0.7);
  }
  
  .data-lines {
    margin-top: 20px;
    width: 100%;
    height: 40px;
    position: relative;
  }
  
  .data-line {
    position: absolute;
    height: 1px;
    width: 100%;
    background: linear-gradient(
      to right,
      rgba(255, 100, 0, 0),
      rgba(255, 100, 0, 0.7) 50%,
      rgba(255, 100, 0, 0)
    );
    animation: data-flow 2s linear infinite;
  }
  
  /* Animation keyframes */
  @keyframes victory-pulse {
    0% { 
      transform: translate(-50%, -50%) scale(1);
      box-shadow: 0 0 30px rgba(255, 50, 0, 0.5);
    }
    100% { 
      transform: translate(-50%, -50%) scale(1.02);
      box-shadow: 0 0 40px rgba(255, 120, 0, 0.7);
    }
  }
  
  @keyframes scan-line {
    0% {
      transform: translateY(-10px);
      opacity: 0;
    }
    50% {
      transform: translateY(0);
      opacity: 1;
    }
    100% {
      transform: translateY(10px);
      opacity: 0;
    }
  }
  
  @keyframes data-flow {
    0% {
      top: 0;
      opacity: 0;
    }
    20% {
      opacity: 0.8;
    }
    80% {
      opacity: 0.8;
    }
    100% {
      top: 100%;
      opacity: 0;
    }
  }
  
  .rotating-segment {
    transform-origin: 60px 60px;
    animation: rotate 8s linear infinite;
  }
  
  .pulsing-circle {
    animation: pulse-circle 2s ease-in-out infinite;
  }
  
  .explosion-core {
    animation: explosion 3s ease-out infinite;
  }
  
  .blinking-text {
    animation: blink-text 1.5s linear infinite;
  }
  
  .ufo-outline {
    animation: wobble 6s ease-in-out infinite;
  }
  
  @keyframes rotate {
    0% { transform: rotate(0deg) translateX(0); }
    100% { transform: rotate(360deg) translateX(0); }
  }
  
  @keyframes pulse-circle {
    0% { opacity: 0.3; stroke-width: 1; }
    50% { opacity: 0.8; stroke-width: 2; }
    100% { opacity: 0.3; stroke-width: 1; }
  }
  
  @keyframes explosion {
    0% { r: 5; opacity: 0.9; }
    50% { r: 7; opacity: 1; }
    100% { r: 5; opacity: 0.9; }
  }
  
  @keyframes blink-text {
    0% { opacity: 0.7; }
    50% { opacity: 1; }
    100% { opacity: 0.7; }
  }
  
  @keyframes wobble {
    0% { transform: scale(1) rotate(0deg); }
    25% { transform: scale(1.05) rotate(1deg); }
    50% { transform: scale(1) rotate(0deg); }
    75% { transform: scale(0.95) rotate(-1deg); }
    100% { transform: scale(1) rotate(0deg); }
  }

  .gforce-warning {
    position: absolute;
    top: -26px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.6rem;
    padding: 2px 5px;
    background: rgba(20, 20, 20, 0.6);
    border: 1px solid currentColor;
    border-radius: 3px;
    white-space: nowrap;
  }

  .gforce-warning.warning {
    color: rgba(255, 204, 0, 0.9);
    border-color: rgba(255, 204, 0, 0.5);
    text-shadow: 0 0 5px rgba(255, 204, 0, 0.7);
  }

  .gforce-warning.critical {
    color: rgba(255, 80, 0, 0.9);
    border-color: rgba(255, 80, 0, 0.5);
    text-shadow: 0 0 5px rgba(255, 80, 0, 0.7);
    animation: pulse 0.5s infinite alternate;
  }

  /* G-force induced Loss of Consciousness (G-LOC) effect */
  .gloc-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 9999;
    background: radial-gradient(
      circle at center,
      rgba(0, 0, 0, 0) 15%,  /* More transparent center */
      rgba(0, 0, 0, 0.6) 50%, /* Darker mid-range */
      rgba(0, 0, 0, 0.95) 75%, /* Near-black periphery */
      rgba(0, 0, 0, 1) 95%    /* Pure black edges */
    );
    mix-blend-mode: normal;  /* Use normal blend mode instead of multiply */
    transition: opacity 0.2s ease-out; /* Faster transition */
  }

  .bottom-warnings {
    bottom: 150px;
    top: auto;
  }
  
  /* High score indicator */
  .new-highscore {
    margin-top: 15px;
    color: rgb(255, 217, 0);
    font-size: 1rem;
    text-align: center;
    animation: pulse-glow 1.5s infinite;
    text-shadow: 0 0 10px rgba(255, 217, 0, 0.8);
    letter-spacing: 2px;
  }
  
  @keyframes pulse-glow {
    0%, 100% { opacity: 1; text-shadow: 0 0 10px rgba(255, 217, 0, 0.8); }
    50% { opacity: 0.7; text-shadow: 0 0 20px rgba(255, 217, 0, 1); }
  }
  
  /* Stat difference indicators */
  .stat-diff {
    font-size: 0.7rem;
    margin-left: 8px;
    opacity: 0.8;
  }
  
  .stat-diff.positive {
    color: rgb(0, 255, 106);
  }
  
  .stat-diff.negative {
    color: rgb(255, 89, 89);
  }
  
  /* Play Again button */
  .play-again-button {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 80%;
    margin: 20px auto 5px;
    padding: 10px;
    border: 1px solid rgba(255, 160, 0, 0.6);
    background: transparent;
    color: rgba(255, 160, 0, 0.9);
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 0.9rem;
    letter-spacing: 1px;
    cursor: pointer;
    transition: all 0.2s;
    pointer-events: auto;
  }
  
  .play-again-button:hover {
    border-color: rgba(255, 180, 0, 1);
    color: rgba(255, 220, 0, 1);
  }
  
  .play-again-button .button-bg {
    position: absolute;
    inset: 0;
    background: rgba(255, 120, 0, 0.1);
    transition: background 0.2s;
  }
  
  .play-again-button:hover .button-bg {
    background: rgba(255, 120, 0, 0.3);
  }
  
  .play-again-button .button-text {
    position: relative;
    z-index: 1;
  }
</style> 