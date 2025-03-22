import { writable } from 'svelte/store';

// Define the HUD data interface
export interface HUDData {
  speed: number;
  mach: number;
  afterburnerEffect: number;
  altitude: number;
  heading: number;
  roll: number;
  pitch: number;
  gForce: number;
  fuelPercent: number;
  yawAngle: number;
  aoa: number; // Add angle of attack
  isReverse: boolean;
  isFiring: boolean; // Minigun firing state
  ammoCount: number;
  currentAmmo: number;
  isAutoStabilizing: boolean; // Auto-pilot stabilization active
  autoStabilizationProgress: number; // Progress of auto-stabilization (0-1)
  recoveryThrustActive: boolean; // Recovery thrust is active
  isAfterburnerCooldown: boolean; // Whether afterburner is in cooldown state
}

// Define the AI UFO state interface
export interface AIState {
  health: number;          // Current health (0-100)
  maxHealth: number;       // Maximum health
  shieldHealth: number;    // Energy shield health (0-100)
  maxShieldHealth: number; // Maximum shield health
  shieldActive: boolean;   // Whether shield is currently active
  isHit: boolean;          // Whether UFO was just hit (for visual feedback)
  hitTime: number;         // Time when last hit occurred
  hitsReceived: number;    // How many hits the UFO has received
  isDestroyed: boolean;    // Whether UFO is destroyed
  damageEffect: number;    // Visual damage effect intensity (0-1)
  criticalDamage: boolean; // Whether UFO has critical damage (smoking/fire)
  invulnerable: boolean;   // Temporary invulnerability after hit
  repairActive: boolean;   // Self-repair system active
  repairProgress: number;  // Progress of self-repair (0-1)
  destroyedTime: number;   // Timestamp when UFO was destroyed
  missilesFired: number;   // Number of missiles fired
  timeElapsed: number;     // Time elapsed since mission start in seconds
  efficiency: number;      // Efficiency score (0-100)
}

// Initial default values
const defaultHUDData: HUDData = {
  speed: 0,
  mach: 0,            // Mach number (speed as multiple of sound)
  afterburnerEffect: 0,
  altitude: 5000,       // Simulated altitude in meters
  heading: 0,           // Current heading in degrees (0-360)
  roll: 0,              // Roll angle in degrees
  pitch: 0,             // Pitch angle in degrees
  gForce: 1.0,          // Current G-Force
  fuelPercent: 85,      // Fuel remaining (percentage)
  yawAngle: 0,
  aoa: 0,
  isReverse: false,
  isFiring: false,       // Default not firing
  ammoCount: 6900,
  currentAmmo: 6900,
  isAutoStabilizing: false,
  autoStabilizationProgress: 0,
  recoveryThrustActive: false,
  isAfterburnerCooldown: false
};

// Initial UFO AI state values
const defaultAIState: AIState = {
  health: 4000,
  maxHealth: 4000,
  shieldHealth: 2000,
  maxShieldHealth: 2000,
  shieldActive: true,
  isHit: false,
  hitTime: 0,
  hitsReceived: 0,
  isDestroyed: false,
  damageEffect: 0,
  criticalDamage: false,
  invulnerable: false,
  repairActive: false,
  repairProgress: 0,
  destroyedTime: 0,
  missilesFired: 0,
  timeElapsed: 0,
  efficiency: 0
};

// Create the stores with initial values
export const hudState = writable<HUDData>(defaultHUDData);
export const aiState = writable<AIState>(defaultAIState); 

// Game timer functions
let missionStartTime = Date.now();
let timerInterval: ReturnType<typeof setInterval> | null = null;

// High score interfaces
export interface HighScore {
  date: string;
  efficiency: number;
  timeElapsed: number;
  hits: number;
  ammoUsed: number;
}

// Function to save high score to localStorage
export function saveHighScore(score: HighScore) {
  try {
    // Get existing scores or initialize empty array
    const existingScoresJSON = localStorage.getItem('jp8-highscores');
    let scores: HighScore[] = existingScoresJSON ? JSON.parse(existingScoresJSON) : [];
    
    // Add new score
    scores.push(score);
    
    // Sort by efficiency (highest first)
    scores.sort((a, b) => b.efficiency - a.efficiency);
    
    // Keep only top 10
    if (scores.length > 10) {
      scores = scores.slice(0, 10);
    }
    
    // Save back to localStorage
    localStorage.setItem('jp8-highscores', JSON.stringify(scores));
    
    return true;
  } catch (error) {
    console.error('Error saving high score:', error);
    return false;
  }
}

// Function to get all high scores
export function getHighScores(): HighScore[] {
  try {
    const scoresJSON = localStorage.getItem('jp8-highscores');
    const scores = scoresJSON ? JSON.parse(scoresJSON) : [];
    
    // Filter out duplicate scores with identical values
    const uniqueScores: HighScore[] = [];
    const seen = new Set();
    
    for (const score of scores) {
      // Create a unique key based on the score's values
      const key = `${score.efficiency}-${score.timeElapsed}-${score.hits}-${score.ammoUsed}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        uniqueScores.push(score);
      }
    }
    
    return uniqueScores;
  } catch (error) {
    console.error('Error retrieving high scores:', error);
    return [];
  }
}

// Start the mission timer
export function startMissionTimer() {
  missionStartTime = Date.now();
  
  // Clear any existing interval
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  // Update the time every second
  timerInterval = setInterval(() => {
    aiState.update(state => {
      state.timeElapsed = Math.floor((Date.now() - missionStartTime) / 1000);
      return state;
    });
  }, 1000);
}

// Stop the mission timer
export function stopMissionTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// Calculate and update efficiency when UFO is destroyed
export function calculateEfficiency(ammoUsed: number, maxAmmo: number) {
  aiState.update(state => {
    // Calculate time bonus (faster is better)
    const timeBonus = Math.max(0, 300 - state.timeElapsed) / 3;
    
    // Calculate ammo efficiency (using fewer bullets is better)
    const ammoEfficiency = Math.min(100, (1 - (ammoUsed / maxAmmo)) * 100);
    
    // Calculate hit efficiency (fewer hits needed is better, assuming at least 10 hits required)
    const hitEfficiency = Math.max(0, 100 - (state.hitsReceived - 10) * 5);
    
    // Combine scores with weights
    state.efficiency = Math.round(
      (ammoEfficiency * 0.5) + (timeBonus * 0.3) + (hitEfficiency * 0.2)
    );
    
    // Record destroyed time
    state.destroyedTime = Date.now();
    
    return state;
  });
  
  // Stop the timer when UFO is destroyed
  stopMissionTimer();
} 