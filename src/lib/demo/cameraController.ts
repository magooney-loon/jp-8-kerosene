import * as THREE from 'three';
import type { PerspectiveCamera } from 'three';
import { type HUDData } from './hudStore';

// Simplified control system with WASD+Shift (no roll)
export interface ShipControls {
  thrust: boolean;     // W - Forward acceleration
  reverse: boolean;    // S - Reverse/brake
  roll_left: boolean;  // A - Roll left
  roll_right: boolean; // D - Roll right
  boost: boolean;      // Shift - Afterburner
  fire: boolean;       // Space - Fire minigun
}

export interface ShipState {
  rotation: { x: number; y: number; z: number };
  rotationalVelocity: { x: number; y: number; z: number };
  virtualVelocity: { x: number; y: number; z: number };
  speed: number;
  enginePower: number;
  afterburnerEffect: number;
  shakeMagnitude: number;
  worldOffset: { x: number; y: number; z: number };
  fuelPercentage: number;
  afterburnerAvailable: boolean;
  currentGForce: number;
  aoa: number;
  persistentMaxSpeed: number;
  
  // Add afterburner cooldown tracking
  _afterburnerCooldownUntil: number; // Timestamp when afterburner becomes available again
  _lastAfterburnerTime: number; // Timestamp when afterburner was last active
}

// F-16 Flying Falcon flight model constants
export const FLIGHT_MODEL = {
  // Aircraft position (fixed for camera reference)
  SHIP_FIXED_POSITION: { x: 0, y: 0, z: -20 },
  
  // F-16 Performance specs
  MIN_SPEED: 22,           // Slightly higher stall speed for stability
  CRUISE_SPEED: 50,        // Efficient cruise speed
  MAX_SPEED: 90,           // Max military power (non-afterburner)
  MAX_AFTERBURNER_SPEED: 130, // Max speed with afterburner (increased from 120)
  
  // F-16 Engine characteristics
  MILITARY_THRUST: 5.5,    // Standard thrust (increased from 5.0 for better acceleration)
  AFTERBURNER_THRUST: 10.0, // Afterburner thrust (increased from 9.0)
  IDLE_DECELERATION: 0.035, // Reduced from 0.04 for even smoother deceleration
  AFTERBURNER_COOLDOWN: 0.1, // Reduced from 0.12 for smoother afterburner transition
  
  // Simplified flight model - adjusted for better roll-based controls
  ROLL_RATE: 4.5,          // Reduced roll rate for more realistic control feel
  PITCH_FACTOR: 0.4,       // How much pitch is applied based on roll
  YAW_FACTOR: 0.45,         // Reduced yaw factor for more gradual turns
  
  // F-16 Stability augmentation system (fly-by-wire)
  FBW_DAMPING: 0.97,       // Increased damping for more stability
  AUTO_TRIM_STRENGTH: 0.004, // Slightly increased for faster centering
  YAW_STABILITY: 0.003,    // Increased yaw stability
  YAW_LIMIT: Math.PI / 2.5, // More limited yaw for stability
  
  // F-16 Handling qualities - adjusted for realistic lag
  INERTIA_FACTOR: 0.82,    // Increased inertia for smoother response
  ROLL_STABILITY: 0.008,   // Increased roll stability
  
  // F-16 Flight envelope protection
  MAX_G_FORCE: 7.5,        // Increased from 7.0 to allow more intense maneuvers
  MAX_AOA: 25.0 * (Math.PI/180), // Reduced max angle of attack for stability
  G_FORCE_PITCH_FACTOR: 0.5,
  G_FORCE_YAW_FACTOR: 0.3,
  G_ONSET_RATE: 0.12,
  
  // F-16 Speed-dependent control limits
  PITCH_LIMIT_LOW_SPEED: Math.PI/2.2,   // More limited pitch
  PITCH_LIMIT_HIGH_SPEED: Math.PI/4.0,
  ROLL_LIMIT_LOW_SPEED: Math.PI*0.6,    // Limited to about 108 degrees roll
  ROLL_LIMIT_HIGH_SPEED: Math.PI*0.5,   // Limited to about 90 degrees roll at high speed
  
  // Camera settings - adjusted for roll control
  CAMERA_DISTANCE: 30,     // Increased distance for better visibility
  CAMERA_HEIGHT: 5.0,      // Increased height for better view
  CAMERA_LAG: 0.25,        // Slightly reduced from 0.2 for more responsive camera during high-energy maneuvers
  CAMERA_G_EFFECT: 0.45,    // Increased from 0.25 for more dramatic G-force camera effects
  LOOK_AHEAD: 0.5,         // Increased from 0.4 for better forward visibility
  
  // F-16 Fuel system
  INITIAL_FUEL: 100,
  NORMAL_FUEL_RATE: 0.25,      // Increased from 0.15 for more noticeable consumption
  AFTERBURNER_FUEL_RATE: 2.2,
  MIN_FUEL_FOR_AFTERBURNER: 5,
  REFUEL_RATE: 0.4,            // Reduced to make fuel management more meaningful
  
  // Weapon firing effects
  FIRING_EFFECTS: {
    RECOIL_STRENGTH: 0.6,     // Base recoil intensity - increased from 0.4
    RECOIL_BUILDUP_RATE: 3.8, // How quickly recoil builds up when firing - increased from 3.0
    RECOIL_DECAY_RATE: 0.85,   // How quickly recoil decays when not firing - adjusted from 0.9
    VIBRATION_FREQUENCY: 24,  // Controls vibration frequency - increased from 20
    VIBRATION_X_FACTOR: 0.08, // Horizontal vibration intensity - increased from 0.05
    VIBRATION_Y_FACTOR: 0.09, // Vertical vibration intensity - increased from 0.06
    SHAKE_INTENSITY: 0.12,    // Random shake intensity - increased from 0.08
    FOV_INCREASE: 5,          // FOV change when firing - increased from 4
    PUSHBACK_FACTOR: 2.0,     // How much camera pushes back - increased from 1.5
    LIFT_FACTOR: 0.6,         // How much camera lifts up - increased from 0.4
    LOOK_RECOIL_X: 0.8,       // Horizontal aim point drift - increased from 0.6
    LOOK_RECOIL_Y: 0.5,       // Vertical aim point drift - increased from 0.3
    LOOK_RECOIL_Y_BIAS: 0.3   // Upward bias for aim point - increased from 0.2
  }
};

// Initialize ship state with default values
export function initShipState(): ShipState {
  return {
    rotation: { x: 0, y: 0, z: 0 },
    rotationalVelocity: { x: 0, y: 0, z: 0 },
    virtualVelocity: { x: 0, y: 0, z: 0 },
    speed: 0,
    enginePower: 0,
    afterburnerEffect: 0,
    shakeMagnitude: 0,
    worldOffset: { x: 0, y: 0, z: 0 },
    fuelPercentage: FLIGHT_MODEL.INITIAL_FUEL,
    afterburnerAvailable: true,
    aoa: 0,
    currentGForce: 1.0,
    persistentMaxSpeed: 0,
    
    // Add afterburner cooldown tracking
    _afterburnerCooldownUntil: 0, // Timestamp when afterburner becomes available again
    _lastAfterburnerTime: 0 // Timestamp when afterburner was last active
  };
}

// Initialize controls
export function initControls(): ShipControls {
  return {
    thrust: false,
    reverse: false,
    roll_left: false,
    roll_right: false,
    boost: false,
    fire: false
  };
}

// Setup simplified keyboard controls
export function setupControls(controls: ShipControls): () => void {
  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key.toLowerCase()) {
      case 'w': controls.thrust = true; break;
      case 's': controls.reverse = true; break;
      case 'a': controls.roll_left = true; break;
      case 'd': controls.roll_right = true; break;
      case 'shift': controls.boost = true; break;
      case ' ': controls.fire = true; break; // Space key
    }
  };
  
  const handleKeyUp = (e: KeyboardEvent) => {
    switch (e.key.toLowerCase()) {
      case 'w': controls.thrust = false; break;
      case 's': controls.reverse = false; break;
      case 'a': controls.roll_left = false; break;
      case 'd': controls.roll_right = false; break;
      case 'shift': controls.boost = false; break;
      case ' ': controls.fire = false; break; // Space key
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
}

// Helper functions
export function calculateYawAngle(rotation: {y: number}): number {
  const initialDirection = new THREE.Vector3(0, 0, -1);
  const forward = new THREE.Vector3(0, 0, -1);
  forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation.y);
  const projectedForward = new THREE.Vector3(forward.x, 0, forward.z).normalize();
  const projectedInitial = new THREE.Vector3(initialDirection.x, 0, initialDirection.z).normalize();
  
  return Math.atan2(
    projectedForward.x * projectedInitial.z - projectedForward.z * projectedInitial.x,
    projectedForward.x * projectedInitial.x + projectedForward.z * projectedInitial.z
  );
}

export function getForwardDirection(rotation: {x: number, y: number, z: number}): THREE.Vector3 {
  const forward = new THREE.Vector3(0, 0, -1);
  forward.applyAxisAngle(new THREE.Vector3(1, 0, 0), rotation.x);
  forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation.y);
  forward.applyAxisAngle(new THREE.Vector3(0, 0, 1), rotation.z);
  return forward.normalize();
}

// Update ship physics with simplified flight model
export function updateShip(
  state: ShipState, 
  controls: ShipControls, 
  delta: number
): number {
  const { rotation, rotationalVelocity, virtualVelocity } = state;
  const FM = FLIGHT_MODEL;
  
  // Speed scaling
  const speedFactor = Math.min(1, state.speed / FM.MAX_SPEED);
  
  // Check if auto-stabilization is active
  // Get this from the window.shipState provided by demoSpaceship.svelte
  const shipState = (window as any).shipState || {};
  const isAutoStabilizing = shipState.isAutoStabilizing || false;
  const autoStabilizationProgress = shipState.autoStabilizationProgress || 0;
  const recoveryThrustActive = shipState.recoveryThrustActive || false;
  
  // ======= FLIGHT CONTROL INPUTS =======
  
  // Handle direct roll inputs with progressive response
  let desiredRollVelocity = 0;
  
  // Scale roll rate based on speed - more stable at high speeds
  const currentRollRate = FM.ROLL_RATE * (1 - speedFactor * 0.4);
  
  // Use closure to maintain roll input intensity between frames
  if (!state.hasOwnProperty('_rollInputIntensity')) {
    (state as any)._rollInputIntensity = 0;
  }
  
  // Get current roll intensity
  let rollInputIntensity = (state as any)._rollInputIntensity;
  const rollInputRate = 2.5 * delta; // How quickly input builds up
  const rollDecayRate = 3.5 * delta; // How quickly input decays
  
  // Process roll inputs with gradual build-up for more lag
  if (controls.roll_left && !isAutoStabilizing) {
    // Build up roll input gradually
    rollInputIntensity = Math.min(1.0, rollInputIntensity + rollInputRate);
    desiredRollVelocity += currentRollRate * delta * rollInputIntensity;
  } 
  else if (controls.roll_right && !isAutoStabilizing) {
    // Build up roll input gradually
    rollInputIntensity = Math.min(1.0, rollInputIntensity + rollInputRate);
    desiredRollVelocity -= currentRollRate * delta * rollInputIntensity;
  }
  else {
    // Decay roll input when no keys pressed
    rollInputIntensity = Math.max(0, rollInputIntensity - rollDecayRate);
  }
  
  // Store updated roll intensity
  (state as any)._rollInputIntensity = rollInputIntensity;
  
  // Add slight natural wobble to make flight feel more realistic
  // Use different frequencies to create natural-feeling motion
  const time = Date.now() / 1000;
  
  // Enhanced natural flight dynamics - more pronounced at different speeds
  const baseWobbleIntensity = 0.8 + speedFactor * 0.6;
  
  // Roll dynamics - more pronounced banking feel
  const rollWobble = (
    Math.sin(time * 0.4) * 0.0018 +     // Slow rolling motion
    Math.sin(time * 0.9) * 0.0012 +     // Medium frequency variation
    Math.sin(time * 1.7) * 0.0006       // Quick adjustments
  ) * baseWobbleIntensity;
  
  // Pitch dynamics - altitude variations
  const pitchWobble = (
    Math.sin(time * 0.3) * 0.0015 +     // Slow altitude changes
    Math.sin(time * 0.7) * 0.0009 +     // Medium bobbing
    Math.sin(time * 1.4) * 0.0004       // Quick adjustments
  ) * baseWobbleIntensity;
  
  // Yaw dynamics - side-to-side motion
  const yawWobble = (
    Math.sin(time * 0.35) * 0.0014 +    // Slow swaying
    Math.sin(time * 0.85) * 0.0008 +    // Medium frequency
    Math.sin(time * 1.5) * 0.0004       // Quick adjustments
  ) * baseWobbleIntensity;
  
  // Add more dynamic behavior at higher speeds - but suppress during stabilization
  if (state.speed > FM.MIN_SPEED * 1.2 && !isAutoStabilizing) {
    // Apply enhanced roll dynamics
    desiredRollVelocity += rollWobble * (1 + (state.speed / FM.MAX_SPEED) * 0.4);
    
    // Apply pitch variations for altitude changes
    rotationalVelocity.x += pitchWobble * (0.3 + speedFactor * 0.6) * delta;
    
    // Apply yaw variations for more natural swaying
    rotationalVelocity.y += yawWobble * (0.25 + speedFactor * 0.7) * delta;
    
    // Add turbulence effect at very high speeds
    if (state.speed > FM.MAX_SPEED * 0.8) {
      const turbulenceFactor = ((state.speed - FM.MAX_SPEED * 0.8) / FM.MAX_SPEED) * 0.4;
      const turbulence = (
        Math.sin(time * 2.5) * 0.0008 +
        Math.sin(time * 3.2) * 0.0005 +
        Math.sin(time * 4.1) * 0.0003
      ) * turbulenceFactor;
      
      // Apply turbulence to all axes
      rotationalVelocity.x += turbulence * (Math.random() - 0.5) * delta;
      rotationalVelocity.y += turbulence * (Math.random() - 0.5) * delta;
      rotationalVelocity.z += turbulence * (Math.random() - 0.5) * delta;
    }
  }
  
  // Calculate current yaw angle for reference
  const currentYawAngle = calculateYawAngle(rotation);
  
  // ======= AUTO-STABILIZATION SYSTEM =======
  
  // If auto-stabilization is active, apply recovery forces
  if (isAutoStabilizing) {
    // How strong the auto-stabilization effect is (0-1)
    const stabilizationStrength = Math.min(1.0, autoStabilizationProgress * 1.5);
    
    // Get current momentum vectors for smoother trajectory-based recovery
    const momentumDir = new THREE.Vector3(
      virtualVelocity.x, 
      virtualVelocity.y, 
      virtualVelocity.z
    ).normalize();
    
    // Get current rotational energy
    const rotationalEnergy = 
      Math.abs(rotationalVelocity.x) + 
      Math.abs(rotationalVelocity.y) + 
      Math.abs(rotationalVelocity.z);
    
    // Determine if we need to reduce rotational energy first (for extreme spins)
    const isExtremeRotation = rotationalEnergy > 0.5;
    
    // Calculate optimal recovery trajectory based on current momentum
    // This makes recovery follow a natural arc instead of jerking opposite
    if (isExtremeRotation) {
      // First priority: dampen extreme rotation before attempting attitude correction
      const emergencyDamping = 0.85 + stabilizationStrength * 0.1;
      rotationalVelocity.x *= emergencyDamping;
      rotationalVelocity.y *= emergencyDamping;
      rotationalVelocity.z *= emergencyDamping;
    } else {
      // Normal stabilization with momentum consideration
      
      // Calculate attitude correction forces with momentum bias
      // This creates smoother arcs that follow current trajectory
      
      // Blend direct correction with momentum-based correction
      const directFactor = 0.6 + autoStabilizationProgress * 0.4; // How much to use direct correction vs. momentum
      const momentumFactor = 1 - directFactor; // How much to preserve momentum-based trajectory
      
      // Calculate leveling force based on stabilization progress
      const levelingForce = 0.08 * stabilizationStrength;
      
      // Apply momentum-biased corrections for natural recovery arcs
      const rollCorrection = -rotation.z * levelingForce * directFactor;
      const pitchCorrection = -rotation.x * levelingForce * directFactor;
      const yawCorrection = -rotation.y * levelingForce * 0.3 * directFactor; // Gentler yaw correction
      
      // Add momentum bias to create natural recovery arcs
      const momentumRollBias = momentumDir.z * 0.02 * momentumFactor;
      const momentumPitchBias = momentumDir.y * 0.02 * momentumFactor;
      const momentumYawBias = momentumDir.x * 0.02 * momentumFactor;
      
      // Apply corrections with momentum bias for a more natural trajectory
      rotationalVelocity.z += (rollCorrection + momentumRollBias) * delta * 5;
      rotationalVelocity.x += (pitchCorrection + momentumPitchBias) * delta * 5;
      rotationalVelocity.y += (yawCorrection + momentumYawBias) * delta * 3;
      
      // Apply additional damping during stabilization to reduce oscillations
      const stabilizationDamping = 0.95 + stabilizationStrength * 0.04;
      rotationalVelocity.x *= stabilizationDamping;
      rotationalVelocity.y *= stabilizationDamping;
      rotationalVelocity.z *= stabilizationDamping;
    }
    
    // Apply recovery thrust if active - align thrust with recovery trajectory
    if (recoveryThrustActive) {
      // Calculate recovery thrust with smooth ramp-up
      const recoveryThrust = 0.2 + (autoStabilizationProgress - 0.3) * 1.5;
      
      // Increase thrust with active recovery
      const thrustForce = FM.MILITARY_THRUST * recoveryThrust * delta;
      
      // Get forward direction for proper thrust application
      const dir = getForwardDirection(rotation);
      
      // Calculate optimal thrust vector that gradually aligns with horizon
      // This prevents thrust from fighting against the recovery motion
      const upVector = new THREE.Vector3(0, 1, 0);
      const forwardVector = new THREE.Vector3(0, 0, -1);
      
      // Create a blended thrust vector that gradually aligns with level flight
      // as stabilization progresses
      const blendFactor = Math.min(0.8, autoStabilizationProgress * 1.2);
      const thrustDir = new THREE.Vector3()
        .copy(dir)
        .multiplyScalar(1 - blendFactor)
        .add(forwardVector.multiplyScalar(blendFactor));
      
      // Apply slight upward bias to help recover altitude
      thrustDir.y += 0.1 * blendFactor;
      thrustDir.normalize();
      
      // Apply thrust along optimal recovery vector
      virtualVelocity.x += thrustDir.x * thrustForce;
      virtualVelocity.y += thrustDir.y * thrustForce * 0.15;
      virtualVelocity.z += thrustDir.z * thrustForce;
    }
  }
  
  // ======= CONTROL SYSTEM =======
  
  // Apply direct roll with inertia and smoother response
  const controlResponse = 1 - FM.INERTIA_FACTOR;
  
  // SAFEGUARD: Use a more stable rate limiting system with frame time compensation
  // This prevents oscillations that can happen from framerate fluctuations
  const maxRollRateChange = 1.4 * delta; // Slower rate limit for more lag
  const rollVelocityDelta = desiredRollVelocity - rotationalVelocity.z;
  
  // SAFEGUARD: Store previous roll velocity for damping extreme changes
  if (!state.hasOwnProperty('_prevRollVelocityDelta')) {
    (state as any)._prevRollVelocityDelta = 0;
  }
  
  // Apply damping to prevent oscillation - blend with previous frame for stability
  const dampedRollDelta = rollVelocityDelta * 0.7 + (state as any)._prevRollVelocityDelta * 0.3;
  (state as any)._prevRollVelocityDelta = rollVelocityDelta;
  
  // Reduce responsiveness based on speed - more lag at high speeds
  const responseReduction = 0.5 + speedFactor * 0.3; // More lag at higher speeds
  const clampedRollDelta = Math.max(-maxRollRateChange, Math.min(maxRollRateChange, dampedRollDelta));
  
  // Apply control lag and momentum - more realistic for aircraft
  rotationalVelocity.z += clampedRollDelta * controlResponse * (1 - responseReduction);
  
  // Momentum is hard to overcome - simulate fluid dynamics with progressive resistance
  const currentRollMomentum = Math.abs(rotationalVelocity.z);
  const momentumFactor = Math.min(1, currentRollMomentum * 2);
  
  // More momentum = harder to change direction
  if (currentRollMomentum > 0.01 && 
      Math.sign(desiredRollVelocity) !== Math.sign(rotationalVelocity.z) && 
      Math.abs(desiredRollVelocity) > 0.01) {
    // Harder to reverse direction when already rolling
    rotationalVelocity.z *= 0.95 - momentumFactor * 0.04;
  }
  
  // Roll angle limiting - prevent excessive rolls
  const maxRollAngle = Math.PI * 0.4; // About 72 degrees max banking
  if (Math.abs(rotation.z) > maxRollAngle) {
    // Apply stronger resistance beyond the limit
    const overLimit = (Math.abs(rotation.z) - maxRollAngle) * 0.2;
    rotationalVelocity.z -= Math.sign(rotation.z) * overLimit;
  }
  
  // Add automatic yaw based on roll (coordinated turn)
  // This creates a realistic turning effect when banking
  const yawFactor = FM.YAW_FACTOR * (0.7 + speedFactor * 0.3); // Stronger effect at higher speeds
  
  // Calculate desired yaw based on roll angle - more predictable response curve
  let desiredYaw = 0;
  if (Math.abs(rotation.z) > 0.05) { // Dead zone for small roll angles
    desiredYaw = Math.sin(rotation.z) * yawFactor * (0.5 + speedFactor * 0.5);
  }
  
  // Apply to yaw velocity with inertia for coordinated turns
  rotationalVelocity.y += (desiredYaw - rotationalVelocity.y) * controlResponse * delta * 1.5;
  
  // Add nose-down pitch effect during reverse thrust/braking
  if (controls.reverse && state.speed > FM.MIN_SPEED * 1.2) {
    // More nose-down effect at higher speeds
    const reverseSpeedFactor = Math.min(1, state.speed / FM.MAX_SPEED);
    const noseDipStrength = -0.2 * reverseSpeedFactor; // Negative for nose down
    rotationalVelocity.x += noseDipStrength * delta;
  }
  
  // Add slight nose drop when banking (more realistic)
  const pitchDueToBank = Math.abs(rotation.z) * 0.1 * speedFactor;
  rotationalVelocity.x += (pitchDueToBank - rotationalVelocity.x) * controlResponse * delta;
  
  // ======= STABILITY SYSTEM =======
  
  // Auto-leveling when not rolling - stronger at higher speeds
  if (Math.abs(desiredRollVelocity) < 0.01 || isAutoStabilizing) {
    // Return to level flight with progressive strength based on angle
    const rollAngle = Math.abs(rotation.z);
    const levelingMultiplier = 1 + (rollAngle / (Math.PI * 0.5)) * 0.5; // Stronger correction at higher angles
    
    // Apply stronger auto-leveling during auto-stabilization
    const levelingStrength = isAutoStabilizing 
      ? 0.05 * (1 + autoStabilizationProgress * 2) 
      : 0.025 * levelingMultiplier * (0.8 + speedFactor * 0.4);
    
    // Apply smoother auto-leveling with momentum consideration
    const currentRollMomentum = Math.abs(rotationalVelocity.z);
    
    // Less momentum damping during auto-stabilization for quicker recovery
    const momentumDamping = isAutoStabilizing
      ? Math.max(0.8, 1 - currentRollMomentum)
      : Math.max(0.6, 1 - currentRollMomentum * 2);
    
    rotationalVelocity.z += (-rotation.z) * levelingStrength * delta * momentumDamping;
    
    // Pitch correction with similar progressive strength
    if (Math.abs(rotation.x) > 0.01 || isAutoStabilizing) {
      const pitchAngle = Math.abs(rotation.x);
      const pitchMultiplier = 1 + (pitchAngle / (Math.PI * 0.5)) * 0.5;
      
      // Apply stronger pitch correction during auto-stabilization
      const pitchStrength = isAutoStabilizing
        ? 0.05 * (1 + autoStabilizationProgress * 2)
        : 0.025 * pitchMultiplier * (0.8 + speedFactor * 0.4);
      
      rotationalVelocity.x += (-rotation.x) * pitchStrength * delta * momentumDamping;
    }
  }
  
  // ======= G-FORCE CALCULATION =======
  
  // Calculate G-force from rotational velocities
  const turnIntensity = (
    Math.abs(rotationalVelocity.y) * FM.G_FORCE_YAW_FACTOR * 5.0 + 
    Math.abs(rotationalVelocity.z) * 1.5 +
    Math.abs(rotationalVelocity.x) * FM.G_FORCE_PITCH_FACTOR * 2.5
  ) * Math.max(1, state.speed / 6) * (1 + speedFactor * 1.2);
  
  // Update current G-force with more dynamic range and smoother transitions
  const targetGForce = 1.0 + turnIntensity;
  // Apply G-force changes with lag for more realistic feels
  state.currentGForce += (targetGForce - state.currentGForce) * Math.min(1, delta * 4);
  
  // Ensure G-force values are more dynamic - let them go higher during sharp turns
  // Add spike to G-force when doing quick maneuvers
  if (Math.abs(rotationalVelocity.z) > 0.15 || Math.abs(rotationalVelocity.y) > 0.15) {
    state.currentGForce += Math.abs(rotationalVelocity.z + rotationalVelocity.y) * speedFactor * 1.5;
  }
  
  // Clamp to reasonable values for a fighter jet (max around 9G)
  state.currentGForce = Math.min(9.0, state.currentGForce);
  
  // Camera shake based on G-force
  state.shakeMagnitude = Math.max(
    state.shakeMagnitude,
    turnIntensity * 0.02 * (0.4 + speedFactor * 0.5)
  );
  state.shakeMagnitude *= 0.9; // Decay
  
  // Control damping
  const dampingFactor = FM.FBW_DAMPING + (speedFactor * 0.03);
  rotationalVelocity.x *= dampingFactor;
  rotationalVelocity.y *= dampingFactor;
  rotationalVelocity.z *= dampingFactor;
  
  // Small movement damping
  const smallMovementThreshold = 0.05;
  const smallMovementDamping = 0.9;
  if (Math.abs(rotationalVelocity.x) < smallMovementThreshold) rotationalVelocity.x *= smallMovementDamping;
  if (Math.abs(rotationalVelocity.y) < smallMovementThreshold) rotationalVelocity.y *= smallMovementDamping;
  if (Math.abs(rotationalVelocity.z) < smallMovementThreshold) rotationalVelocity.z *= smallMovementDamping;
  
  // ======= APPLY ROTATION =======
  
  rotation.x += rotationalVelocity.x;
  rotation.y += rotationalVelocity.y;
  rotation.z += rotationalVelocity.z;
  
  // Normalize rotations for better behavior
  // Check and normalize all rotation axes, not just Z
  if (Math.abs(rotation.x) > Math.PI * 2 || Math.abs(rotation.y) > Math.PI * 2 || Math.abs(rotation.z) > Math.PI * 2) {
    // Process x-axis
    if (Math.abs(rotation.x) > Math.PI * 2) {
      rotation.x = rotation.x % (Math.PI * 2);
      // Maintain consistent orientation by keeping in [-π, π] range
      if (Math.abs(rotation.x) > Math.PI) {
        rotation.x = rotation.x > 0 ? rotation.x - Math.PI * 2 : rotation.x + Math.PI * 2;
      }
    }
    
    // Process y-axis
    if (Math.abs(rotation.y) > Math.PI * 2) {
      rotation.y = rotation.y % (Math.PI * 2);
      // Maintain consistent orientation by keeping in [-π, π] range
      if (Math.abs(rotation.y) > Math.PI) {
        rotation.y = rotation.y > 0 ? rotation.y - Math.PI * 2 : rotation.y + Math.PI * 2;
      }
    }
    
    // Process z-axis - maintain original behavior for compatibility
    if (Math.abs(rotation.z) > Math.PI * 2) {
      rotation.z = rotation.z % (Math.PI * 2);
      if (rotation.z < 0) rotation.z += Math.PI * 2;
    }
  }
  
  // SAFEGUARD: Handle NaN or undefined rotation values
  if (isNaN(rotation.x) || !isFinite(rotation.x)) {
    console.warn("Invalid rotation.x detected in updateShip, resetting to 0");
    rotation.x = 0;
    rotationalVelocity.x = 0;
  }
  if (isNaN(rotation.y) || !isFinite(rotation.y)) {
    console.warn("Invalid rotation.y detected in updateShip, resetting to 0");
    rotation.y = 0;
    rotationalVelocity.y = 0;
  }
  if (isNaN(rotation.z) || !isFinite(rotation.z)) {
    console.warn("Invalid rotation.z detected in updateShip, resetting to 0");
    rotation.z = 0;
    rotationalVelocity.z = 0;
  }
  
  // ======= THRUST AND PROPULSION =======
  
  // Calculate thrust with WASD controls
  let thrust = 0;
  if (controls.thrust && !isAutoStabilizing) thrust = 1;
  if (controls.reverse && !isAutoStabilizing) thrust = -0.8; // Increased reverse thrust power (was -0.5)
  
  // Add safety transition: prevent applying reverse immediately after afterburner
  // This prevents conflicts in physics/camera states
  if (!state.hasOwnProperty('_lastAfterburnerTime')) {
    (state as any)._lastAfterburnerTime = 0;
  }
  
  // Track when afterburner was last active
  if (state.afterburnerEffect > 0.3) {
    (state as any)._lastAfterburnerTime = Date.now();
  }
  
  // Prevent reverse thrust for a short period after afterburner
  const afterburnerCooldownPeriod = 800; // ms to wait before allowing reverse after afterburner
  if (controls.reverse && 
      Date.now() - (state as any)._lastAfterburnerTime < afterburnerCooldownPeriod) {
    // Gradual transition instead of abrupt state change
    const transitionFactor = (Date.now() - (state as any)._lastAfterburnerTime) / afterburnerCooldownPeriod;
    // Gradually transition from 0 to full reverse
    thrust = -0.8 * transitionFactor;
  }
  
  // Auto-thrust during recovery
  if (isAutoStabilizing && recoveryThrustActive) {
    // Calculate recovery thrust (increases with progress)
    thrust = 0.6 + (autoStabilizationProgress - 0.3) * 0.8;
  }
  
  // Fuel management - more realistic consumption
  if (controls.thrust || (isAutoStabilizing && recoveryThrustActive)) {
    // Normal thrust fuel consumption
    state.fuelPercentage -= FM.NORMAL_FUEL_RATE * delta;
  } 
  else if (controls.reverse) {
    // Reverse thrust uses less fuel than forward thrust
    state.fuelPercentage -= FM.NORMAL_FUEL_RATE * 0.7 * delta; // Increased from 0.6
  }
  
  // Check if we have enough fuel for afterburner
  state.afterburnerAvailable = state.fuelPercentage > FM.MIN_FUEL_FOR_AFTERBURNER;
  
  // ======= ENGINE TRANSITIONS =======
  
  // Make sure afterburner state has consistent initial values to prevent twitching
  if (!state.hasOwnProperty('_prevAfterburnerEffect')) {
    (state as any)._prevAfterburnerEffect = state.afterburnerEffect;
  }
  
  // Check if we're in afterburner cooldown
  const currentTime = Date.now();
  const isInAfterburnerCooldown = state._afterburnerCooldownUntil > currentTime;
  
  // Track when user has released afterburner
  if (!controls.boost && state.afterburnerEffect > 0.3) {
    // Set cooldown period when releasing afterburner (1 second cooldown)
    state._afterburnerCooldownUntil = currentTime + 1000;
    
    // Also prevent immediate reverse thrust application
    if (controls.reverse) {
      // If attempting to reverse right after afterburner, we need
      // to ensure physics transitions properly
      (state as any)._lastAfterburnerTime = currentTime;
      // Temporarily dampen velocity changes to prevent physics glitches
      virtualVelocity.x *= 0.98;
      virtualVelocity.y *= 0.98;
      virtualVelocity.z *= 0.98;
    }
  }
  
  // Apply afterburner if available and not in cooldown
  const canUseAfterburner = controls.boost && 
                           thrust > 0 && 
                           state.afterburnerAvailable && 
                           !isAutoStabilizing && 
                           !isInAfterburnerCooldown;
                           
  const stabilizationAfterburner = isAutoStabilizing && 
                                 recoveryThrustActive && 
                                 autoStabilizationProgress > 0.6;
  
  if (canUseAfterburner || stabilizationAfterburner) {
    // Afterburner provides additional thrust
    thrust *= 1.8;
    
    // Higher fuel consumption with afterburner (in addition to normal consumption)
    state.fuelPercentage -= FM.AFTERBURNER_FUEL_RATE * delta;
    
    // Apply afterburner with frame-rate independent ramp
    const targetAfterburnEffect = isAutoStabilizing ? 
      Math.min(1.0, (autoStabilizationProgress - 0.6) * 2.5) : 1.0;
      
    const afterburnerRampRate = 4.0 * delta; // Consistent regardless of framerate
    state.afterburnerEffect += (targetAfterburnEffect - state.afterburnerEffect) * afterburnerRampRate;
    
    // Clamp to valid range
    state.afterburnerEffect = Math.min(1.0, state.afterburnerEffect);
    
    // Update the persistent max speed when boosting (for smooth deceleration later)
    state.persistentMaxSpeed = Math.max(state.persistentMaxSpeed, state.speed);
  } else {
    // Afterburner cool-down with frame-rate independent decay
    if (state.afterburnerEffect > 0.01) {
      // Apply frame-rate independent decay
      const decayRate = (0.7 + state.afterburnerEffect * 0.4) * delta;
      state.afterburnerEffect *= (1.0 - decayRate * 0.6);
      
      // Ensure we get to zero eventually
      if (state.afterburnerEffect < 0.01) {
        state.afterburnerEffect = 0;
      }
    } else {
      state.afterburnerEffect = 0;
    }
    
    // Gradually reduce persistent max speed to normal max speed with much more gradual transition
    if (state.persistentMaxSpeed > FM.MAX_SPEED) {
      // Even more gradual reduction rate that slows down as it approaches max speed
      const speedDifference = state.persistentMaxSpeed - FM.MAX_SPEED;
      const reductionRate = 0.004 + (speedDifference / (FM.MAX_AFTERBURNER_SPEED - FM.MAX_SPEED)) * 0.004; // Reduced from 0.005
      
      state.persistentMaxSpeed -= speedDifference * reductionRate;
      
      // Only snap when extremely close to normal max speed
      if (state.persistentMaxSpeed - FM.MAX_SPEED < 0.2) {
        state.persistentMaxSpeed = FM.MAX_SPEED;
      }
    }
    
    // Refuel when idle (not using thrust or reverse)
    if (!controls.thrust && !controls.reverse && state.fuelPercentage < FM.INITIAL_FUEL) {
      state.fuelPercentage += FM.REFUEL_RATE * delta;
      state.fuelPercentage = Math.min(state.fuelPercentage, FM.INITIAL_FUEL);
    }
  }
  
  // Ensure fuel doesn't go below 0
  state.fuelPercentage = Math.max(0, state.fuelPercentage);
  
  // Engine power visual effects
  const targetEnginePower = thrust * (canUseAfterburner || stabilizationAfterburner ? 1.7 : 1.0);
  
  // Add smoother engine power transitions based on current speed and delta
  const transitionRate = canUseAfterburner || stabilizationAfterburner ? 0.18 : 
    (state.speed > FM.MAX_SPEED * 0.8 ? 0.06 : 0.1);
  
  state.enginePower += (targetEnginePower - state.enginePower) * transitionRate;
  
  // ======= MOVEMENT =======
  
  // Get forward direction
  const dir = getForwardDirection(rotation);
  
  // Apply thrust
  if (thrust !== 0) {
    // Thrust with speed-dependent drag
    const accelerationFactor = (canUseAfterburner || stabilizationAfterburner ? FM.AFTERBURNER_THRUST : FM.MILITARY_THRUST) * 
                            (1 - speedFactor * 0.4);
    
    // Apply thrust
    virtualVelocity.x += dir.x * thrust * accelerationFactor * delta;
    virtualVelocity.y += dir.y * thrust * accelerationFactor * delta * 0.15;
    virtualVelocity.z += dir.z * thrust * accelerationFactor * delta;
    
    // If we're using reverse thrust, apply additional deceleration effect for faster braking
    if (thrust < 0) {
      // Apply stronger deceleration when explicitly braking
      const brakingPower = 0.15 * delta * (1 + speedFactor * 0.7);
      virtualVelocity.x *= 1 - brakingPower;
      virtualVelocity.y *= 1 - brakingPower;
      virtualVelocity.z *= 1 - brakingPower;
    }
  } else {
    // Maintain minimum speed or decelerate
    if (state.speed <= FM.MIN_SPEED * 1.1) {
      const maintenanceThrust = 0.1 * delta;
      virtualVelocity.x += dir.x * maintenanceThrust;
      virtualVelocity.y += dir.y * maintenanceThrust * 0.15;
      virtualVelocity.z += dir.z * maintenanceThrust;
    } else {
      // Apply deceleration
      let currentDeceleration;
      
      if (state.speed > FM.MAX_SPEED * 1.2) {
        // Faster deceleration from afterburner
        currentDeceleration = FM.AFTERBURNER_COOLDOWN * 
                           (1 + (state.speed - FM.MAX_SPEED) / FM.MAX_SPEED * 0.5);
      } else {
        // Normal deceleration
        currentDeceleration = FM.IDLE_DECELERATION * (1 + speedFactor * 0.3);
      }
      
      // Apply deceleration
      virtualVelocity.x *= 1 - currentDeceleration * delta;
      virtualVelocity.y *= 1 - currentDeceleration * delta;
      virtualVelocity.z *= 1 - currentDeceleration * delta;
    }
  }
  
  // Calculate angle of attack - more precise calculation
  const velocityDir = new THREE.Vector3(
    virtualVelocity.x, 
    virtualVelocity.y, 
    virtualVelocity.z
  );
  
  if (state.speed > 5) {
    // Normalize velocity for proper vector comparison
    const normalizedVelocity = velocityDir.clone().normalize();
    
    // Get precise dot product between aircraft direction and velocity
    const dot = Math.max(-1, Math.min(1, dir.dot(normalizedVelocity)));
    
    // Convert dot product to angle and convert to degrees
    // Use actual aircraft axis rather than just forward vector
    const newAOA = Math.acos(dot) * (180 / Math.PI);
    
    // Add smooth transition to AOA changes for more realistic feel
    state.aoa += (newAOA - state.aoa) * Math.min(1, delta * 5);
    
    // Cap at realistic values and increase precision
    state.aoa = Math.min(30, state.aoa);
  } else {
    state.aoa = 0;
  }
  
  // Calculate current speed
  state.speed = Math.sqrt(
    virtualVelocity.x * virtualVelocity.x + 
    virtualVelocity.y * virtualVelocity.y + 
    virtualVelocity.z * virtualVelocity.z
  );
  
  // Calculate maximum speed with afterburner
  let currentMaxSpeed;
  if (canUseAfterburner || stabilizationAfterburner) {
    currentMaxSpeed = FM.MAX_SPEED + (FM.MAX_AFTERBURNER_SPEED - FM.MAX_SPEED) * state.afterburnerEffect;
  } else {
    // Use the persistent max speed for gradual slowdown from afterburner
    currentMaxSpeed = Math.max(FM.MAX_SPEED, state.persistentMaxSpeed);
  }
  
  // Enforce minimum speed
  if (state.speed < FM.MIN_SPEED) {
    const speedRatio = FM.MIN_SPEED / Math.max(0.1, state.speed);
    
    if (state.speed > 0.1) {
      virtualVelocity.x *= speedRatio;
      virtualVelocity.y *= speedRatio * 0.15;
      virtualVelocity.z *= speedRatio;
    } else {
      virtualVelocity.x = dir.x * FM.MIN_SPEED;
      virtualVelocity.y = dir.y * FM.MIN_SPEED * 0.15;
      virtualVelocity.z = dir.z * FM.MIN_SPEED;
    }
    
    state.speed = FM.MIN_SPEED;
  }
  
  // Cap at maximum speed
  if (state.speed > currentMaxSpeed) {
    const factor = currentMaxSpeed / state.speed;
    virtualVelocity.x *= factor;
    virtualVelocity.y *= factor;
    virtualVelocity.z *= factor;
    state.speed = currentMaxSpeed;
  }
  
  // Update world position
  state.worldOffset.x += virtualVelocity.x * delta;
  state.worldOffset.y += virtualVelocity.y * delta;
  state.worldOffset.z += virtualVelocity.z * delta;
  
  // Pass auto-stabilization info back to the caller via the state object
  return currentYawAngle;
}

// Update camera with realistic F-16 chase cam - smoother and more stable
export function updateCamera(
  camera: PerspectiveCamera, 
  state: ShipState,
  delta: number,
  controls: ShipControls
) {
  if (!camera) return;
  
  // SAFEGUARD: Skip update if delta is extremely large (tab was inactive)
  // This prevents massive position jumps after tabbing back in
  if (delta > 0.1) {
    console.warn("Large delta time detected, skipping camera update to prevent jumps");
    return;
  }
  
  const FM = FLIGHT_MODEL;
  const { rotation, rotationalVelocity, virtualVelocity } = state;
  
  // Use actual camera position for smoother transitions
  const currentCamPos = new THREE.Vector3().copy(camera.position);
  
  // SAFEGUARD: Prevent NaN or infinite values in state that could cause resets
  if (isNaN(state.worldOffset.x) || !isFinite(state.worldOffset.x) ||
      isNaN(state.worldOffset.y) || !isFinite(state.worldOffset.y) ||
      isNaN(state.worldOffset.z) || !isFinite(state.worldOffset.z)) {
    console.warn("Invalid world offset detected, resetting to safe values");
    state.worldOffset.x = 0;
    state.worldOffset.y = 0;
    state.worldOffset.z = 0;
  }
  
  if (isNaN(state.speed) || !isFinite(state.speed)) {
    console.warn("Invalid speed detected, resetting to safe values");
    state.speed = FM.MIN_SPEED;
  }
  
  // SAFEGUARD: Prevent extreme rotations
  if (Math.abs(rotation.x) > Math.PI * 2 || Math.abs(rotation.y) > Math.PI * 2 || Math.abs(rotation.z) > Math.PI * 2) {
    console.warn("Extreme rotation detected, normalizing");
    // Fix: Properly normalize rotations while preserving signs
    if (Math.abs(rotation.x) > Math.PI * 2) {
      rotation.x = (rotation.x % (Math.PI * 2));
      // Preserve sign after modulo
      if (Math.abs(rotation.x) > Math.PI) {
        rotation.x = rotation.x > 0 ? rotation.x - Math.PI * 2 : rotation.x + Math.PI * 2;
      }
    }
    if (Math.abs(rotation.y) > Math.PI * 2) {
      rotation.y = (rotation.y % (Math.PI * 2));
      // Preserve sign after modulo
      if (Math.abs(rotation.y) > Math.PI) {
        rotation.y = rotation.y > 0 ? rotation.y - Math.PI * 2 : rotation.y + Math.PI * 2;
      }
    }
    if (Math.abs(rotation.z) > Math.PI * 2) {
      rotation.z = (rotation.z % (Math.PI * 2));
      // Preserve sign after modulo
      if (Math.abs(rotation.z) > Math.PI) {
        rotation.z = rotation.z > 0 ? rotation.z - Math.PI * 2 : rotation.z + Math.PI * 2;
      }
    }
    
    // Also ensure rotational velocity is capped during extreme rotations
    // to prevent further escalation
    const maxRotVelDuringRecovery = 0.5;
    if (Math.abs(rotationalVelocity.x) > maxRotVelDuringRecovery) 
      rotationalVelocity.x = Math.sign(rotationalVelocity.x) * maxRotVelDuringRecovery;
    if (Math.abs(rotationalVelocity.y) > maxRotVelDuringRecovery) 
      rotationalVelocity.y = Math.sign(rotationalVelocity.y) * maxRotVelDuringRecovery;
    if (Math.abs(rotationalVelocity.z) > maxRotVelDuringRecovery) 
      rotationalVelocity.z = Math.sign(rotationalVelocity.z) * maxRotVelDuringRecovery;
  }
  
  // SAFEGUARD: Handle NaN or undefined rotation values that could cause bugs
  if (isNaN(rotation.x) || !isFinite(rotation.x)) {
    console.warn("Invalid rotation.x detected, resetting to 0");
    rotation.x = 0;
    rotationalVelocity.x = 0;
  }
  if (isNaN(rotation.y) || !isFinite(rotation.y)) {
    console.warn("Invalid rotation.y detected, resetting to 0");
    rotation.y = 0;
    rotationalVelocity.y = 0;
  }
  if (isNaN(rotation.z) || !isFinite(rotation.z)) {
    console.warn("Invalid rotation.z detected, resetting to 0");
    rotation.z = 0;
    rotationalVelocity.z = 0;
  }
  
  // SAFEGUARD: Prevent extreme rotational velocity which could cause twitching
  const maxRotVel = 2.0;
  if (Math.abs(rotationalVelocity.x) > maxRotVel) rotationalVelocity.x = Math.sign(rotationalVelocity.x) * maxRotVel;
  if (Math.abs(rotationalVelocity.y) > maxRotVel) rotationalVelocity.y = Math.sign(rotationalVelocity.y) * maxRotVel;
  if (Math.abs(rotationalVelocity.z) > maxRotVel) rotationalVelocity.z = Math.sign(rotationalVelocity.z) * maxRotVel;
  
  // SAFEGUARD: Prevent extreme virtual velocity which could cause jumps
  const maxVirtVel = FM.MAX_AFTERBURNER_SPEED * 1.5;
  const currentVelMagnitude = Math.sqrt(
    virtualVelocity.x * virtualVelocity.x + 
    virtualVelocity.y * virtualVelocity.y + 
    virtualVelocity.z * virtualVelocity.z
  );
  
  if (currentVelMagnitude > maxVirtVel) {
    const scaleFactor = maxVirtVel / currentVelMagnitude;
    virtualVelocity.x *= scaleFactor;
    virtualVelocity.y *= scaleFactor;
    virtualVelocity.z *= scaleFactor;
  }
  
  // More stable camera orientation with dampened rotation effects
  // Create a modified rotation that limits extreme roll for the camera
  const cameraRotation = {
    x: rotation.x * 0.6, // Reduce pitch influence
    y: rotation.y,       // Keep full yaw
    z: rotation.z * 0.35 // Significantly reduce roll influence on camera
  };
  
  // Calculate position behind aircraft with F-16 chase cam
  const dir = new THREE.Vector3(0, 0, -1);
  dir.applyEuler(new THREE.Euler(cameraRotation.x, cameraRotation.y, cameraRotation.z));
  
  // SAFEGUARD: Verify direction vector is valid
  if (isNaN(dir.x) || isNaN(dir.y) || isNaN(dir.z) || 
      dir.length() === 0 || !isFinite(dir.length())) {
    console.warn("Invalid direction vector, resetting to default");
    dir.set(0, 0, -1);
  }
  
  // Position camera with more stability
  const offset = dir.clone().multiplyScalar(-FM.CAMERA_DISTANCE);
  
  // Add height with reduced influence from pitch
  offset.y += FM.CAMERA_HEIGHT + (Math.abs(rotation.x) * 0.8); 
  
  // Add subtle banking effect - much more reduced for stability
  const rightVector = new THREE.Vector3(1, 0, 0);
  rightVector.applyEuler(new THREE.Euler(0, rotation.y, 0));
  
  // SAFEGUARD: Verify right vector is valid
  if (isNaN(rightVector.x) || isNaN(rightVector.y) || isNaN(rightVector.z) || 
      rightVector.length() === 0 || !isFinite(rightVector.length())) {
    console.warn("Invalid right vector, resetting to default");
    rightVector.set(1, 0, 0);
  }
  
  // Apply banking with limits
  const maxCameraBankOffset = 4.0; // Limit how much the camera can offset due to banking
  const bankOffset = Math.min(maxCameraBankOffset, Math.abs(rotation.z) * 2.0) * Math.sign(rotation.z);
  offset.add(rightVector.multiplyScalar(bankOffset));
  
  // Adaptive camera height based on roll - keep camera higher during rolls
  offset.y += Math.abs(rotation.z) * 1.5;
  
  // Add g-force camera effects - more substantial
  const speedFactor = Math.min(1, state.speed / FM.MAX_SPEED);
  const gForceOffset = new THREE.Vector3();
  
  // ======= ENHANCED THRUST EFFECTS =======
  
  // More dramatic thrust effect - camera pulls back during acceleration
  const thrustEffect = state.enginePower * (1 + state.afterburnerEffect * 1.2);
  
  // Check if we're in afterburner cooldown transition (using persistentMaxSpeed)
  const isAfterburnerCooldown = state.persistentMaxSpeed > FM.MAX_SPEED + 0.5;
  
  // Combined effect for both active thrust and afterburner cooldown
  if ((state.speed > 5 && thrustEffect > 0.3) || isAfterburnerCooldown) {
    // Calculate base thrust effect
    let thrustPushback;
    
    if (isAfterburnerCooldown && thrustEffect < 0.5) {
      // During afterburner cooldown, maintain some camera effects
      // Calculate a cooldown factor based on how much we're still over normal max speed
      const cooldownFactor = (state.persistentMaxSpeed - FM.MAX_SPEED) / 
                           (FM.MAX_AFTERBURNER_SPEED - FM.MAX_SPEED);
      
      // Apply reduced but still noticeable effect during cooldown
      thrustPushback = -FM.CAMERA_G_EFFECT * (0.4 + cooldownFactor * 0.8) * (0.8 + speedFactor * 0.7); // Increased effect
    } else {
      // Regular thrust effect
      thrustPushback = -FM.CAMERA_G_EFFECT * thrustEffect * (0.9 + speedFactor * 0.7); // Increased effect
    }
    
    // Apply thrust pushback
    gForceOffset.copy(dir).multiplyScalar(thrustPushback * 2.5); // Increased from 2.2
    
    // Add more dramatic vertical offset during high acceleration
    const verticalOffset = isAfterburnerCooldown ? 
      Math.max(0.1, thrustEffect) * 0.6 * (0.5 + state.afterburnerEffect * 0.9) : // Increased from 0.5/0.8
      thrustEffect * 0.6 * (0.5 + state.afterburnerEffect * 0.9); // Increased from 0.5/0.8
    
    gForceOffset.y -= verticalOffset;
    
    // Add progressive FOV effect for forward thrust acceleration
    let firingFovIncrease;
    
    if (isAfterburnerCooldown && thrustEffect < 0.5) {
      // Maintain some FOV effect during cooldown for smoother transition
      const cooldownFactor = (state.persistentMaxSpeed - FM.MAX_SPEED) / 
                           (FM.MAX_AFTERBURNER_SPEED - FM.MAX_SPEED);
      firingFovIncrease = Math.min(18, cooldownFactor * 12); // Increased from 15/10
    } else {
      firingFovIncrease = Math.min(18, thrustEffect * 9 * (1 + state.afterburnerEffect)); // Increased from 15/8
    }
    
    // SAFEGUARD: Clamp FOV changes to reasonable values
    const targetFOV = 75 + Math.max(0, Math.min(18, firingFovIncrease)); // Increased from 15
    
    // Add more gradual transition for FOV changes to prevent sudden changes
    let fovChangeRate = 1.0;
    
    // Reduce FOV change rate during transitions between states to prevent twitching
    if ((isAfterburnerCooldown && thrustEffect < 0.5) || 
        (state.afterburnerEffect > 0 && state.afterburnerEffect < 0.3) ||
        (state.virtualVelocity.z > 0 && thrustEffect > 0)) {
      // Apply much slower FOV transitions during potential state conflicts
      fovChangeRate = 0.4;
    }
    
    // Apply gradual FOV transition with adaptive rate
    const fovDiff = targetFOV - camera.fov;
    camera.fov += fovDiff * Math.min(1, delta * 5 * fovChangeRate);
    camera.updateProjectionMatrix();
    
    // Add screen shake during afterburner or cooldown
    if (state.afterburnerEffect > 0.5 || isAfterburnerCooldown) {
      let vibrateIntensity;
      
      if (isAfterburnerCooldown && state.afterburnerEffect < 0.5) {
        // Reduced shake during cooldown
        const cooldownFactor = (state.persistentMaxSpeed - FM.MAX_SPEED) / 
                             (FM.MAX_AFTERBURNER_SPEED - FM.MAX_SPEED);
        vibrateIntensity = 0.04 * cooldownFactor * (1 + speedFactor * 0.4); // Increased from 0.03/0.3
      } else {
        vibrateIntensity = 0.08 * state.afterburnerEffect * (1 + speedFactor * 0.6); // Increased from 0.06/0.5
      }
      
      // SAFEGUARD: Limit shake to prevent excessive movement
      vibrateIntensity = Math.min(0.12, vibrateIntensity); // Increased from 0.1
      
      gForceOffset.x += (Math.random() - 0.5) * vibrateIntensity;
      gForceOffset.y += (Math.random() - 0.5) * vibrateIntensity;
      
      // Add additional directional shake for more dramatic effect during full afterburner
      if (state.afterburnerEffect > 0.8) {
        const directionalShake = Math.sin(Date.now() / 60) * 0.03 * state.afterburnerEffect;
        gForceOffset.z += directionalShake; // Subtle back-and-forth motion
      }
    }
  } else {
    // Reset FOV when not accelerating with ultra-smooth transition
    const baseFOV = 75;
    if (camera.fov !== baseFOV) {
      // Use a very slow transition rate that gets even slower as it approaches the base FOV
      const fovDifference = camera.fov - baseFOV;
      const transitionRate = Math.min(0.03, 0.01 + (fovDifference / 15) * 0.02);
      camera.fov = camera.fov - fovDifference * transitionRate;
      
      // Prevent perpetual tiny adjustments
      if (Math.abs(camera.fov - baseFOV) < 0.05) {
        camera.fov = baseFOV;
      }
      camera.updateProjectionMatrix();
    }
  }
  
  // Add special camera effect during reverse thrust
  const isReverseThrust = state.speed > 5 && state.virtualVelocity.z > 0; // More aggressive threshold
  
  // SAFEGUARD: Handle conflict between thrust and reverse effects to prevent twitching
  // Only apply reverse effects if we're not in active acceleration or afterburner cooldown
  if (isReverseThrust && thrustEffect < 0.3 && !isAfterburnerCooldown) {
    // Calculate intensity based on speed and reverse rate
    const reverseFactor = Math.min(1, state.virtualVelocity.z / 5) * (0.5 + speedFactor * 0.5); // Increased sensitivity (was z/6)
    
    // More dramatic forward push during braking (zooms camera in closer to aircraft)
    gForceOffset.z -= reverseFactor * 6; // Increased from 4 for more dramatic effect
    
    // Add vertical lift for more dramatic braking feel
    gForceOffset.y += reverseFactor * 2.0; // Increased from 1.2
    
    // Add slight downward tilt to camera to emphasize nose-down effect during braking
    if (state.speed > FM.MIN_SPEED * 1.2) {
      const noseDipFactor = 0.3 * reverseFactor;
      gForceOffset.y -= noseDipFactor * 1.5;
    }
    
    // Add FOV narrowing during braking for more intense effect
    const fovReduction = Math.min(12, reverseFactor * 18); // Increased from 10/15
    const targetBrakeFOV = 75 - fovReduction;
    
    // SAFEGUARD: Smooth transition for FOV changes
    const fovDiff = targetBrakeFOV - camera.fov;
    camera.fov += fovDiff * Math.min(1, delta * 5);
    camera.updateProjectionMatrix();
    
    // Add stronger shake during aggressive braking
    if (reverseFactor > 0.4) {
      const brakeVibrateIntensity = Math.min(0.1, 0.12 * reverseFactor); // Increased intensity
      gForceOffset.x += (Math.random() - 0.5) * brakeVibrateIntensity;
      gForceOffset.y += (Math.random() - 0.5) * brakeVibrateIntensity;
      
      // Add pulsing left/right movement for more dramatic feel
      const brakeOscillation = Math.sin(Date.now() / 80) * 0.4 * reverseFactor; // Faster oscillation and stronger effect
      gForceOffset.x += brakeOscillation;
    }
  }
  
  // ======= WEAPON FIRING EFFECTS =======
  
  // Add recoil and screen wobble when firing weapons
  if (controls.fire) {
    // Store firing state for animation consistency between frames
    if (!state.hasOwnProperty('_firingEffectState')) {
      (state as any)._firingEffectState = {
        pulseTime: 0,
        recoilIntensity: 0
      };
    }
    
    const firingState = (state as any)._firingEffectState;
    const FE = FM.FIRING_EFFECTS;
    
    // Get prolonged firing factor from window.shipState
    const shipState = (window as any).shipState || {};
    const prolongedFiringFactor = shipState.prolongedFiringFactor || 0;
    
    // Build up recoil intensity with continuous fire
    // This simulates the gun warming up and intensifying
    firingState.recoilIntensity = Math.min(1.0, firingState.recoilIntensity + delta * FE.RECOIL_BUILDUP_RATE);
    
    // Calculate base recoil strength - stronger at higher speeds
    // Enhanced with prolonged firing factor
    const recoilStrength = FE.RECOIL_STRENGTH * 
      (0.7 + speedFactor * 0.6) * 
      firingState.recoilIntensity * 
      (1 + prolongedFiringFactor * 2.0); // Increase recoil significantly for prolonged firing
    
    // Apply pushback effect - the gun's recoil pushes the camera back
    gForceOffset.z += recoilStrength * FE.PUSHBACK_FACTOR;
    
    // Add slight upward tilt as recoil lifts the nose
    gForceOffset.y += recoilStrength * FE.LIFT_FACTOR;
    
    // Add directional shake that increases with continuous fire
    // Use oscillating pattern for more realistic gun vibration
    firingState.pulseTime += delta * FE.VIBRATION_FREQUENCY * (1 + prolongedFiringFactor * 1.5); // Increased frequency with prolonged fire
    
    // Add high-frequency vibration with varying intensity over time
    // Enhanced with prolonged firing factor
    const vibrationX = Math.sin(firingState.pulseTime) * FE.VIBRATION_X_FACTOR * 
      firingState.recoilIntensity * (1 + prolongedFiringFactor * 3.0);
    const vibrationY = Math.cos(firingState.pulseTime * 1.3) * FE.VIBRATION_Y_FACTOR * 
      firingState.recoilIntensity * (1 + prolongedFiringFactor * 3.0);
    
    // Random component for gun firing shake - increased with prolonged firing
    const shakeIntensity = FE.SHAKE_INTENSITY * 
      firingState.recoilIntensity * 
      (1 + prolongedFiringFactor * 4.0); // Much more dramatic shake after prolonged firing
    const randomShakeX = (Math.random() - 0.5) * shakeIntensity;
    const randomShakeY = (Math.random() - 0.5) * shakeIntensity;
    
    // Apply combined vibration and shake to camera offset
    gForceOffset.x += vibrationX + randomShakeX;
    gForceOffset.y += vibrationY + randomShakeY;
    
    // Add more extreme shake and distortion for prolonged firing
    if (prolongedFiringFactor > 0) {
      // Add barrel overheating effect - low frequency pulsing
      const overheatPulse = Math.sin(Date.now() / 200) * prolongedFiringFactor * 0.8; // Increased from 0.5
      
      // Apply progressive shake and distortion based on prolonged firing duration
      // Strong side-to-side movement - increased from 0.9
      gForceOffset.x += Math.sin(Date.now() / 80) * prolongedFiringFactor * 1.5;
      // Vertical juddering - increased from 0.7
      gForceOffset.y += Math.sin(Date.now() / 45) * prolongedFiringFactor * 1.2 + overheatPulse;
      // Forward-backward pulsing - increased from 1.2
      gForceOffset.z += Math.sin(Date.now() / 120) * prolongedFiringFactor * 1.8;
      
      // Increase FOV for a more intense feel during prolonged firing
      // Increased from 6 to 10 degrees max FOV change
      const intenseFiringFOV = 10 * prolongedFiringFactor;
      
      // Apply smooth transition for FOV change with faster transition (increased from delta * 3)
      const prolongedTargetFOV = 75 + intenseFiringFOV;
      camera.fov += (prolongedTargetFOV - camera.fov) * Math.min(1, delta * 4.5);
      camera.updateProjectionMatrix();
      
      // Add more pronounced roll oscillation for extreme weapon vibration (increased from 0.004)
      const rollShake = Math.sin(Date.now() / 60) * 0.007 * prolongedFiringFactor;
      camera.rotation.z += rollShake;
      
      // Add additional pitch bobbing for more chaotic feel - new effect
      const pitchBob = Math.sin(Date.now() / 40) * 0.005 * prolongedFiringFactor;
      camera.rotation.x += pitchBob;
    }
    
    // Add slight FOV increase to enhance firing effect
    const firingFovIncrease = FE.FOV_INCREASE * firingState.recoilIntensity;
    const targetFiringFOV = 75 + firingFovIncrease;
    
    // Apply smooth transition
    const fovDiff = targetFiringFOV - camera.fov;
    camera.fov += fovDiff * Math.min(1, delta * 4);
    camera.updateProjectionMatrix();
  } else if ((state as any)?._firingEffectState?.recoilIntensity > 0) {
    // Gradually reduce firing effects when not firing
    const firingState = (state as any)._firingEffectState;
    const FE = FM.FIRING_EFFECTS;
    firingState.recoilIntensity *= FE.RECOIL_DECAY_RATE; // Quick decay
    
    // Reset when intensity gets very low
    if (firingState.recoilIntensity < 0.05) {
      firingState.recoilIntensity = 0;
      firingState.pulseTime = 0;
    }
  }
  
  // Side G-force during high-G turns - more substantial
  if (Math.abs(rotationalVelocity.y) > 0.01) {
    const sideG = rotationalVelocity.y * FM.CAMERA_G_EFFECT * speedFactor * 0.8; // Enhanced effect
    gForceOffset.x -= rightVector.x * sideG * 1.2;
    gForceOffset.z -= rightVector.z * sideG * 1.2;
  }
  
  // Enhanced camera shake based on throttle and G-forces
  let shakeIntensity = state.shakeMagnitude * (0.2 + speedFactor * 0.4);
  
  // Add additional shake during max thrust or high-G turns
  if (thrustEffect > 0.8 || state.currentGForce > 3) {
    shakeIntensity += thrustEffect * 0.03 + (state.currentGForce - 3) * 0.02;
  }
  
  // SAFEGUARD: Limit shake to prevent excessive movement
  shakeIntensity = Math.min(0.15, shakeIntensity);
  
  const shakeX = (Math.random() - 0.5) * shakeIntensity;
  const shakeY = (Math.random() - 0.5) * shakeIntensity;
  
  // SAFEGUARD: Apply smoothing to gForceOffset to prevent abrupt changes
  // This helps prevent camera twitching during transitions between states
  if (!state.hasOwnProperty('_prevGForceOffset')) {
    (state as any)._prevGForceOffset = new THREE.Vector3();
  }
  
  const prevOffset = (state as any)._prevGForceOffset as THREE.Vector3;
  const smoothingFactor = Math.min(1, delta * 8); // Adjust for different framerates
  
  // Apply smoothing between frames
  gForceOffset.x = prevOffset.x + (gForceOffset.x - prevOffset.x) * smoothingFactor;
  gForceOffset.y = prevOffset.y + (gForceOffset.y - prevOffset.y) * smoothingFactor;
  gForceOffset.z = prevOffset.z + (gForceOffset.z - prevOffset.z) * smoothingFactor;
  
  // Store current offset for next frame
  prevOffset.copy(gForceOffset);
  
  // SAFEGUARD: Check for any NaN or infinite values in gForceOffset
  if (isNaN(gForceOffset.x) || !isFinite(gForceOffset.x) ||
      isNaN(gForceOffset.y) || !isFinite(gForceOffset.y) ||
      isNaN(gForceOffset.z) || !isFinite(gForceOffset.z)) {
    console.warn("Invalid gForce offset detected, resetting to zero");
    gForceOffset.set(0, 0, 0);
    prevOffset.set(0, 0, 0);
  }
  
  // Target position with all effects combined
  const targetPos = new THREE.Vector3(
    FM.SHIP_FIXED_POSITION.x + offset.x + gForceOffset.x + shakeX,
    FM.SHIP_FIXED_POSITION.y + offset.y + gForceOffset.y + shakeY,
    FM.SHIP_FIXED_POSITION.z + offset.z + gForceOffset.z
  );
  
  // SAFEGUARD: Check if target position is valid
  if (isNaN(targetPos.x) || !isFinite(targetPos.x) ||
      isNaN(targetPos.y) || !isFinite(targetPos.y) ||
      isNaN(targetPos.z) || !isFinite(targetPos.z)) {
    console.warn("Invalid target position detected, using fallback");
    targetPos.copy(FM.SHIP_FIXED_POSITION);
    targetPos.z -= FM.CAMERA_DISTANCE; // Move backward from ship
    targetPos.y += FM.CAMERA_HEIGHT;   // Move up a bit
  }
  
  // SAFEGUARD: Calculate distance between current and target position
  const distanceToTarget = new THREE.Vector3()
    .copy(targetPos)
    .sub(currentCamPos)
    .length();
  
  // Check if we're in a risky transition state (afterburner to reverse)
  const isRiskyStateTransition = 
    Date.now() - (state as any)._lastAfterburnerTime < 1500 && // Recently used afterburner
    controls.reverse; // Currently trying to reverse
  
  // SAFEGUARD: Detect potential teleporting and prevent it
  // Skip this check during active afterburner or cooldown to prevent disruption
  // But apply additional checks during risky transitions
  if ((distanceToTarget > 40 && !controls.boost && !isAfterburnerCooldown) || 
      (isRiskyStateTransition && distanceToTarget > 10)) {  
    console.warn("Large camera jump detected, smoothing transition");
    // Instead of jumping, move a maximum fixed distance toward target
    const direction = new THREE.Vector3()
      .copy(targetPos)
      .sub(currentCamPos)
      .normalize();
    
    // Move smoothly toward target without jumps
    // Use even more gradual transition during risky states
    const transitionSpeed = isRiskyStateTransition ? 5 : 8;
    camera.position.x += direction.x * transitionSpeed;
    camera.position.y += direction.y * transitionSpeed;
    camera.position.z += direction.z * transitionSpeed;
  } else {
    // Apply camera lag with thrust-based adjustment - faster response during acceleration
    let lagFactor = FM.CAMERA_LAG * (1.2 - thrustEffect * 0.4);
    
    // When afterburner is cooling down, increase lag for smoother transition
    // BUT don't interfere with active afterburner usage
    if (isAfterburnerCooldown) {
      const cooldownFactor = (state.persistentMaxSpeed - FM.MAX_SPEED) / 
                         (FM.MAX_AFTERBURNER_SPEED - FM.MAX_SPEED);
      
      // Calculate two different movement methods and blend between them
      // depending on whether boost is active or not
      
      // Method 1: Slower, more gradual camera for cooldown
      const distanceTransitionFactor = Math.min(0.05, 0.01 + distanceToTarget * 0.01);
      
      // Method 2: Normal camera movement for active afterburner 
      const moveSpeed = Math.min(1, 1 - lagFactor);
      
      // If actively boosting during cooldown, blend between the two methods
      // This prevents jarring camera changes when spamming SHIFT
      const boostBlendFactor = controls.boost ? 0.7 : 0.0; // 0.7 = 70% normal movement when boosting
      const cooldownBlendFactor = 1.0 - boostBlendFactor;
      
      // Blend the two movement calculations
      const xMovement = (targetPos.x - currentCamPos.x) * 
                     (distanceTransitionFactor * cooldownBlendFactor + moveSpeed * boostBlendFactor);
      const yMovement = (targetPos.y - currentCamPos.y) * 
                     (distanceTransitionFactor * cooldownBlendFactor + moveSpeed * boostBlendFactor);
      const zMovement = (targetPos.z - currentCamPos.z) * 
                     (distanceTransitionFactor * cooldownBlendFactor + moveSpeed * boostBlendFactor);
      
      // Apply blended movement
      camera.position.x += xMovement;
      camera.position.y += yMovement;
      camera.position.z += zMovement;
    } else {
      // Normal camera movement for active afterburner or non-cooldown states
      const moveSpeed = Math.min(1, 1 - lagFactor);
      camera.position.x += (targetPos.x - currentCamPos.x) * moveSpeed;
      camera.position.y += (targetPos.y - currentCamPos.y) * moveSpeed;
      camera.position.z += (targetPos.z - currentCamPos.z) * moveSpeed;
    }
  }
  
  // SAFEGUARD: Store previous camera position for next frame to detect jumps
  if (!state.hasOwnProperty('_prevCameraPos')) {
    (state as any)._prevCameraPos = new THREE.Vector3().copy(camera.position);
  }
  
  // Check for sudden camera jumps between frames
  const prevCamPos = (state as any)._prevCameraPos as THREE.Vector3;
  const frameDist = new THREE.Vector3().copy(camera.position).sub(prevCamPos).length();
  
  // Skip this check during active afterburner or cooldown to prevent disruption
  if (frameDist > 25 && !controls.boost && !isAfterburnerCooldown) {
    console.warn("Camera jump between frames detected, smoothing transition");
    const jumpDir = new THREE.Vector3().copy(camera.position).sub(prevCamPos).normalize();
    camera.position.copy(prevCamPos).add(jumpDir.multiplyScalar(8));  // Increased from 3 to 8 for smoother transitions
  }
  
  // Store current camera position for next frame
  prevCamPos.copy(camera.position);
  
  // Create a stabilized look target with enhanced throttle effect
  // The camera looks ahead more when at high thrust
  const lookAheadBoost = 1 + thrustEffect * 0.5;
  
  // SAFEGUARD: Prevent any NaN or infinite values in velocity
  let safeVelocityX = isNaN(virtualVelocity.x) || !isFinite(virtualVelocity.x) ? 0 : virtualVelocity.x;
  let safeVelocityY = isNaN(virtualVelocity.y) || !isFinite(virtualVelocity.y) ? 0 : virtualVelocity.y;
  let safeVelocityZ = isNaN(virtualVelocity.z) || !isFinite(virtualVelocity.z) ? 0 : virtualVelocity.z;
  
  // Add recoil factor to look target when firing
  let firingRecoilX = 0;
  let firingRecoilY = 0;
  
  // Apply firing recoil effect to look target
  if ((state as any)?._firingEffectState?.recoilIntensity > 0) {
    const recoilIntensity = (state as any)._firingEffectState.recoilIntensity;
    const FE = FM.FIRING_EFFECTS;
    // Add a slight random drift to the aim point to simulate weapon recoil
    firingRecoilX = (Math.random() - 0.5) * FE.LOOK_RECOIL_X * recoilIntensity;
    firingRecoilY = (Math.random() - 0.5) * FE.LOOK_RECOIL_Y * recoilIntensity + 
                   (recoilIntensity * FE.LOOK_RECOIL_Y_BIAS); // Slight upward bias
  }
  
  const lookTarget = new THREE.Vector3(
    FM.SHIP_FIXED_POSITION.x + safeVelocityX * FM.LOOK_AHEAD * 0.6 * lookAheadBoost + firingRecoilX,
    FM.SHIP_FIXED_POSITION.y + safeVelocityY * FM.LOOK_AHEAD * 0.4 * lookAheadBoost + firingRecoilY, 
    FM.SHIP_FIXED_POSITION.z + safeVelocityZ * FM.LOOK_AHEAD * 0.6 * lookAheadBoost
  );
  
  // SAFEGUARD: Ensure lookTarget is not the same as camera position to prevent lookAt errors
  if (lookTarget.distanceTo(camera.position) < 0.001) {
    lookTarget.z -= 0.1; // Just move it slightly forward
  }
  
  // Create a weighted look vector that's partially based on ship orientation
  // and partially on a stabilized horizon
  const stabilizedUp = new THREE.Vector3(
    Math.sin(rotation.z) * 0.3, // Reduced influence of roll on up vector
    1.0, // Bias toward world up
    0
  ).normalize();
  
  // SAFEGUARD: Verify up vector is valid
  if (isNaN(stabilizedUp.x) || isNaN(stabilizedUp.y) || isNaN(stabilizedUp.z) || 
      stabilizedUp.length() === 0) {
    stabilizedUp.set(0, 1, 0); // Default world up
  }
  
  // Apply the stabilized look with custom up vector
  camera.lookAt(lookTarget);
  camera.up.copy(stabilizedUp);
}

// Calculate flight data for HUD display
export function calculateFlightData(state: ShipState, delta: number, currentYawAngle: number, controls: ShipControls): HUDData {
  const { rotation, speed } = state;
  const FM = FLIGHT_MODEL;
  
  // Convert radians to degrees for display
  const pitchDegrees = rotation.x * (180 / Math.PI);
  const rollDegrees = rotation.z * (180 / Math.PI);
  
  // Calculate heading (0-360 degrees)
  let headingDegrees = -rotation.y * (180 / Math.PI);
  headingDegrees = ((headingDegrees % 360) + 360) % 360;
  
  // Calculate altitude with subtle variations
  const baseAltitude = 12000;
  const altitudeVariation = 100 * Math.sin(rotation.x) + (speed * 0.5);
  const currentAltitude = baseAltitude + altitudeVariation;
  
  // Calculate mach number with more realistic scaling
  // Mach 1 should be around MAX_SPEED (typical max non-afterburner speed)
  // Mach 2+ only when afterburner is engaged
  let machNumber = 0;
  
  if (speed > 0) {
    // Base calculation with realistic scaling - modified to produce more varying values
    machNumber = speed / (FM.MAX_SPEED * 0.7);
    
    // Fine-tune the curve to make sub-mach more granular
    if (machNumber < 1) {
      // Sub-mach numbers should change more gradually but be more noticeable
      machNumber = machNumber * 0.9;
    } else if (machNumber > 1) {
      // Super-mach should be harder to achieve but still possible
      machNumber = 1 + (machNumber - 1) * 0.8;
    }
    
    // Add slight variation based on altitude to make it more dynamic
    const altitudeFactor = 1 + (state.worldOffset.y / 5000) * 0.1;
    machNumber *= altitudeFactor;
  }
  
  // Keep high precision for display
  const machNumberDisplay = parseFloat(machNumber.toFixed(2));
  
  // Determine if we're in reverse thrust
  const isReverse = controls.reverse;
  
  // Get auto-stabilization info from window.shipState
  const shipState = (window as any).shipState || {};
  const isAutoStabilizing = shipState.isAutoStabilizing || false;
  const autoStabilizationProgress = shipState.autoStabilizationProgress || 0;
  const recoveryThrustActive = shipState.recoveryThrustActive || false;
  
  // Check if afterburner is in cooldown
  const isAfterburnerCooldown = state._afterburnerCooldownUntil > Date.now();
  
  return {
    speed: Math.round(speed),
    mach: machNumberDisplay,
    afterburnerEffect: state.afterburnerEffect,
    altitude: Math.round(currentAltitude),
    heading: Math.round(headingDegrees),
    roll: Math.round(rollDegrees),
    pitch: Math.round(pitchDegrees),
    gForce: parseFloat(state.currentGForce.toFixed(1)),
    fuelPercent: Math.round(state.fuelPercentage),
    yawAngle: currentYawAngle,
    aoa: parseFloat(state.aoa.toFixed(1)), // Increased precision
    isReverse: isReverse,
    isFiring: false, // Default value, will be updated in demoScene
    ammoCount: 6900, // Default value, will be updated in demoScene
    currentAmmo: 6900, // Default value, will be updated in demoScene
    isAutoStabilizing,
    autoStabilizationProgress,
    recoveryThrustActive,
    isAfterburnerCooldown
  };
} 