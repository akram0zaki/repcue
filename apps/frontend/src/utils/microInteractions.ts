/**
 * Micro-Interactions Utility
 *
 * Centralized utilities for delightful UI micro-interactions including:
 * - Confetti celebrations for PRs, milestones, badge unlocks
 * - Sound cues (optional, user-controlled)
 * - Pulsing animations for attention-grabbing elements
 *
 * Features:
 * - Respects prefers-reduced-motion accessibility preference
 * - User-configurable celebration sounds
 * - Lightweight confetti without external dependencies
 * - CSS-based pulsing animations
 */

import logger from './logger';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Confetti configuration
 */
export interface ConfettiConfig {
  particleCount?: number; // Number of confetti pieces (default: 100)
  intensity?: 'subtle' | 'medium' | 'full'; // Animation intensity
  duration?: number; // Animation duration in ms (default: 3000)
  colors?: string[]; // Confetti colors
}

/**
 * Sound cue types
 */
export type SoundCueType =
  | 'achievement' // Badge unlock, PR celebration
  | 'milestone' // Streak milestone
  | 'complete'; // Workout completion

/**
 * Audio file paths for sound cues
 */
const SOUND_FILES: Record<SoundCueType, string> = {
  achievement: '/sounds/achievement.mp3',
  milestone: '/sounds/milestone.mp3',
  complete: '/sounds/complete.mp3',
};

// ============================================================================
// Accessibility Checks
// ============================================================================

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mediaQuery.matches;
}

/**
 * Check if animations are allowed (respects reduced motion preference)
 */
export function canAnimate(): boolean {
  return !prefersReducedMotion();
}

// ============================================================================
// Confetti Celebration
// ============================================================================

/**
 * Default confetti configuration
 */
const DEFAULT_CONFETTI_CONFIG: Required<ConfettiConfig> = {
  particleCount: 100,
  intensity: 'medium',
  duration: 3000,
  colors: [
    '#FF6B6B', // red
    '#4ECDC4', // teal
    '#45B7D1', // blue
    '#FFA07A', // orange
    '#98D8C8', // mint
    '#F7DC6F', // yellow
    '#BB8FCE', // purple
  ],
};

/**
 * Particle interface for confetti
 */
interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  size: number;
  opacity: number;
}

/**
 * Launch confetti celebration animation
 *
 * Creates a canvas-based confetti effect that falls from the top of the screen.
 * Respects reduced motion preferences - skips animation if user prefers reduced motion.
 *
 * @param config - Optional confetti configuration
 * @returns Cleanup function to remove canvas
 */
export function launchConfetti(config: ConfettiConfig = {}): () => void {
  // Respect reduced motion preference
  if (!canAnimate()) {
    logger.log('[microInteractions] Skipping confetti - reduced motion preferred');
    return () => {}; // No-op cleanup
  }

  const finalConfig = { ...DEFAULT_CONFETTI_CONFIG, ...config };

  // Adjust particle count based on intensity
  const particleMultiplier = {
    subtle: 0.5,
    medium: 1.0,
    full: 1.5,
  }[finalConfig.intensity];

  const particleCount = Math.floor(finalConfig.particleCount * particleMultiplier);

  logger.log('[microInteractions] Launching confetti', { particleCount, intensity: finalConfig.intensity });

  // Create canvas element
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    logger.error('[microInteractions] Failed to get canvas context');
    document.body.removeChild(canvas);
    return () => {};
  }

  // Initialize particles
  const particles: ConfettiParticle[] = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -20,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 2 + 2,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      color: finalConfig.colors[Math.floor(Math.random() * finalConfig.colors.length)],
      size: Math.random() * 6 + 4,
      opacity: 1,
    });
  }

  const startTime = Date.now();
  let animationId: number;

  // Animation loop
  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = elapsed / finalConfig.duration;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw particles
    particles.forEach((particle) => {
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.1; // gravity
      particle.rotation += particle.rotationSpeed;

      // Fade out towards the end
      particle.opacity = Math.max(0, 1 - progress);

      // Draw particle
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate((particle.rotation * Math.PI) / 180);
      ctx.globalAlpha = particle.opacity;
      ctx.fillStyle = particle.color;
      ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
      ctx.restore();
    });

    // Continue animation or cleanup
    if (progress < 1) {
      animationId = requestAnimationFrame(animate);
    } else {
      document.body.removeChild(canvas);
    }
  };

  animationId = requestAnimationFrame(animate);

  // Cleanup function
  return () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    if (canvas.parentElement) {
      document.body.removeChild(canvas);
    }
  };
}

// ============================================================================
// Sound Cues
// ============================================================================

/**
 * Audio cache for sound cues
 */
const audioCache: Map<SoundCueType, HTMLAudioElement> = new Map();

/**
 * Preload a sound cue
 *
 * @param type - Sound cue type
 */
export function preloadSound(type: SoundCueType): void {
  if (audioCache.has(type)) return;

  try {
    const audio = new Audio(SOUND_FILES[type]);
    audio.preload = 'auto';
    audioCache.set(type, audio);
    logger.log(`[microInteractions] Preloaded sound: ${type}`);
  } catch (error) {
    logger.error(`[microInteractions] Failed to preload sound: ${type}`, error);
  }
}

/**
 * Play a sound cue
 *
 * Only plays if:
 * - User has enabled celebration sounds in settings
 * - Audio file exists and is loaded
 *
 * @param type - Sound cue type
 * @param enabled - Whether sounds are enabled (from user settings)
 */
export function playSound(type: SoundCueType, enabled: boolean = false): void {
  if (!enabled) {
    logger.log(`[microInteractions] Sound disabled: ${type}`);
    return;
  }

  try {
    let audio = audioCache.get(type);

    // Load if not cached
    if (!audio) {
      audio = new Audio(SOUND_FILES[type]);
      audioCache.set(type, audio);
    }

    // Reset and play
    audio.currentTime = 0;
    audio.volume = 0.5; // 50% volume for non-intrusive sounds
    audio.play().catch((error) => {
      // Autoplay policy may prevent playback
      logger.warn(`[microInteractions] Failed to play sound: ${type}`, error);
    });

    logger.log(`[microInteractions] Played sound: ${type}`);
  } catch (error) {
    logger.error(`[microInteractions] Error playing sound: ${type}`, error);
  }
}

// ============================================================================
// Pulsing Animations (CSS-based)
// ============================================================================

/**
 * CSS class for pulsing animation
 *
 * Usage: Add 'pulse-animation' class to elements that should pulse
 * This class is defined in global styles and respects prefers-reduced-motion
 */
export const PULSE_ANIMATION_CLASS = 'pulse-animation';

/**
 * Add pulsing animation to an element
 *
 * @param element - DOM element to animate
 * @param duration - Animation duration in seconds (default: 2)
 */
export function addPulse(element: HTMLElement, duration: number = 2): void {
  if (!canAnimate()) {
    logger.log('[microInteractions] Skipping pulse - reduced motion preferred');
    return;
  }

  element.classList.add(PULSE_ANIMATION_CLASS);
  element.style.animationDuration = `${duration}s`;

  logger.log('[microInteractions] Added pulse animation');
}

/**
 * Remove pulsing animation from an element
 *
 * @param element - DOM element
 */
export function removePulse(element: HTMLElement): void {
  element.classList.remove(PULSE_ANIMATION_CLASS);
  element.style.animationDuration = '';

  logger.log('[microInteractions] Removed pulse animation');
}

// ============================================================================
// High-Level Celebration Functions
// ============================================================================

/**
 * Celebrate a personal record
 *
 * Combines confetti and sound for maximum celebration effect
 *
 * @param soundsEnabled - Whether celebration sounds are enabled
 */
export function celebratePersonalRecord(soundsEnabled: boolean = false): () => void {
  logger.log('[microInteractions] Celebrating personal record');

  // Launch confetti with full intensity
  const cleanupConfetti = launchConfetti({
    intensity: 'full',
    duration: 4000,
  });

  // Play achievement sound
  playSound('achievement', soundsEnabled);

  return cleanupConfetti;
}

/**
 * Celebrate a milestone (e.g., 10-day streak)
 *
 * @param soundsEnabled - Whether celebration sounds are enabled
 */
export function celebrateMilestone(soundsEnabled: boolean = false): () => void {
  logger.log('[microInteractions] Celebrating milestone');

  // Launch confetti with medium intensity
  const cleanupConfetti = launchConfetti({
    intensity: 'medium',
    duration: 3000,
  });

  // Play milestone sound
  playSound('milestone', soundsEnabled);

  return cleanupConfetti;
}

/**
 * Celebrate a badge unlock
 *
 * @param soundsEnabled - Whether celebration sounds are enabled
 */
export function celebrateBadgeUnlock(soundsEnabled: boolean = false): () => void {
  logger.log('[microInteractions] Celebrating badge unlock');

  // Launch confetti with subtle intensity
  const cleanupConfetti = launchConfetti({
    intensity: 'subtle',
    duration: 2500,
  });

  // Play achievement sound
  playSound('achievement', soundsEnabled);

  return cleanupConfetti;
}

/**
 * Celebrate workout completion
 *
 * @param soundsEnabled - Whether celebration sounds are enabled
 */
export function celebrateWorkoutComplete(soundsEnabled: boolean = false): () => void {
  logger.log('[microInteractions] Celebrating workout completion');

  // Launch confetti with medium intensity
  const cleanupConfetti = launchConfetti({
    intensity: 'medium',
    duration: 3000,
  });

  // Play complete sound
  playSound('complete', soundsEnabled);

  return cleanupConfetti;
}

// ============================================================================
// Preload All Sounds
// ============================================================================

/**
 * Preload all celebration sounds
 * Call this on app initialization to ensure sounds are ready
 */
export function preloadAllSounds(): void {
  logger.log('[microInteractions] Preloading all celebration sounds');

  (['achievement', 'milestone', 'complete'] as SoundCueType[]).forEach((type) => {
    preloadSound(type);
  });
}
