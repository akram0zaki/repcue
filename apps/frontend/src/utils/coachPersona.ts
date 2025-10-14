/**
 * Coach Persona Utility
 *
 * Provides personality-driven text transformations for coaching insights
 * based on user-selected coach persona.
 *
 * Personas:
 * - 'zen': Calm, mindful, holistic approach (default)
 * - 'energy': Enthusiastic, motivational, high-energy
 * - 'logic': Data-driven, analytical, precise
 *
 * Features:
 * - Applies persona-specific tone to insight messages
 * - Persona-specific greeting and encouragement patterns
 * - Maintains message meaning while adjusting tone
 * - Respects user preference (defaults to 'zen' if not set)
 */

import type { AppSettings } from '../types';
import logger from './logger';

/**
 * Coach persona types
 */
export type CoachPersona = 'zen' | 'energy' | 'logic';

/**
 * Persona configuration
 */
interface PersonaConfig {
  name: string; // Display name for the persona
  description: string; // Short description
  greeting: string[]; // Greeting phrases
  encouragement: string[]; // Encouragement phrases
  celebration: string[]; // Celebration phrases
  toneModifiers: {
    // Tone adjustment patterns (for future use with AI-generated insights)
    prefix?: string[]; // Optional sentence prefixes
    suffix?: string[]; // Optional sentence suffixes
    replacements?: Map<string, string>; // Word/phrase replacements
  };
}

/**
 * Persona configurations
 */
const PERSONA_CONFIGS: Record<CoachPersona, PersonaConfig> = {
  zen: {
    name: 'Zen Coach',
    description: 'Calm, mindful, holistic approach',
    greeting: [
      'Welcome back, friend',
      'Good to see you again',
      'Hello there',
      'Greetings',
    ],
    encouragement: [
      'Take your time',
      'Listen to your body',
      'You\'re making progress',
      'Every step counts',
      'Be present in the moment',
    ],
    celebration: [
      'Well done',
      'Beautiful work',
      'You did it',
      'Wonderful',
      'Nicely done',
    ],
    toneModifiers: {
      prefix: [
        'Consider this:',
        'Here\'s a thought:',
        'You might find:',
      ],
      replacements: new Map([
        ['must', 'might'],
        ['should', 'could'],
        ['need to', 'can'],
        ['have to', 'consider'],
        ['important', 'beneficial'],
      ]),
    },
  },
  energy: {
    name: 'Energy Coach',
    description: 'Enthusiastic, motivational, high-energy',
    greeting: [
      'Let\'s go!',
      'Ready to crush it?',
      'You\'ve got this!',
      'Time to shine!',
      'Here we go!',
    ],
    encouragement: [
      'Push through!',
      'You\'re unstoppable!',
      'Keep that fire burning!',
      'Amazing work!',
      'You\'re on fire!',
    ],
    celebration: [
      'YES! Incredible!',
      'Boom! That\'s how it\'s done!',
      'Absolutely crushing it!',
      'Phenomenal!',
      'You\'re a champion!',
    ],
    toneModifiers: {
      prefix: [
        'Here\'s the exciting part:',
        'Get pumped!',
        'Check this out!',
      ],
      suffix: [
        'Let\'s make it happen!',
        'You\'ve got this!',
        'Keep pushing!',
      ],
      replacements: new Map([
        ['might', 'can definitely'],
        ['could', 'should'],
        ['consider', 'go for'],
        ['try', 'crush'],
        ['good', 'awesome'],
      ]),
    },
  },
  logic: {
    name: 'Logic Coach',
    description: 'Data-driven, analytical, precise',
    greeting: [
      'Analysis ready',
      'Data compiled',
      'Report generated',
      'Insights available',
    ],
    encouragement: [
      'Progress detected',
      'Metrics improving',
      'On track',
      'Data shows improvement',
      'Performance trending up',
    ],
    celebration: [
      'Goal achieved',
      'New personal best recorded',
      'Milestone reached',
      'Target exceeded',
      'Performance optimized',
    ],
    toneModifiers: {
      prefix: [
        'Analysis indicates:',
        'Data shows:',
        'Metrics suggest:',
        'Based on your performance:',
      ],
      replacements: new Map([
        ['might', 'statistically likely to'],
        ['feel', 'data indicates'],
        ['think', 'analyze'],
        ['awesome', 'optimal'],
        ['great', 'efficient'],
      ]),
    },
  },
};

/**
 * Get the current coach persona from settings
 *
 * @param settings - User app settings
 * @returns Coach persona (defaults to 'zen')
 */
export function getCoachPersona(settings: AppSettings): CoachPersona {
  return settings.coach_persona || 'zen';
}

/**
 * Get persona configuration
 *
 * @param persona - Coach persona
 * @returns Persona configuration
 */
export function getPersonaConfig(persona: CoachPersona): PersonaConfig {
  return PERSONA_CONFIGS[persona];
}

/**
 * Get a random greeting for the selected persona
 *
 * @param persona - Coach persona
 * @returns Greeting message
 */
export function getPersonaGreeting(persona: CoachPersona): string {
  const config = PERSONA_CONFIGS[persona];
  const randomIndex = Math.floor(Math.random() * config.greeting.length);
  return config.greeting[randomIndex];
}

/**
 * Get a random encouragement for the selected persona
 *
 * @param persona - Coach persona
 * @returns Encouragement message
 */
export function getPersonaEncouragement(persona: CoachPersona): string {
  const config = PERSONA_CONFIGS[persona];
  const randomIndex = Math.floor(Math.random() * config.encouragement.length);
  return config.encouragement[randomIndex];
}

/**
 * Get a random celebration for the selected persona
 *
 * @param persona - Coach persona
 * @returns Celebration message
 */
export function getPersonaCelebration(persona: CoachPersona): string {
  const config = PERSONA_CONFIGS[persona];
  const randomIndex = Math.floor(Math.random() * config.celebration.length);
  return config.celebration[randomIndex];
}

/**
 * Apply persona tone to a message
 *
 * Applies persona-specific word replacements and optional prefix/suffix
 * to adjust the tone of a message while maintaining its meaning.
 *
 * @param message - Original message
 * @param persona - Coach persona
 * @param addPrefix - Whether to add a persona-specific prefix
 * @param addSuffix - Whether to add a persona-specific suffix
 * @returns Message with persona tone applied
 */
export function applyPersonaTone(
  message: string,
  persona: CoachPersona,
  addPrefix: boolean = false,
  addSuffix: boolean = false
): string {
  const config = PERSONA_CONFIGS[persona];
  let transformedMessage = message;

  // Apply word/phrase replacements
  if (config.toneModifiers.replacements) {
    config.toneModifiers.replacements.forEach((replacement, original) => {
      const regex = new RegExp(`\\b${original}\\b`, 'gi');
      transformedMessage = transformedMessage.replace(regex, replacement);
    });
  }

  // Add prefix if requested
  if (addPrefix && config.toneModifiers.prefix && config.toneModifiers.prefix.length > 0) {
    const randomPrefix = config.toneModifiers.prefix[
      Math.floor(Math.random() * config.toneModifiers.prefix.length)
    ];
    transformedMessage = `${randomPrefix} ${transformedMessage}`;
  }

  // Add suffix if requested
  if (addSuffix && config.toneModifiers.suffix && config.toneModifiers.suffix.length > 0) {
    const randomSuffix = config.toneModifiers.suffix[
      Math.floor(Math.random() * config.toneModifiers.suffix.length)
    ];
    transformedMessage = `${transformedMessage} ${randomSuffix}`;
  }

  logger.log('[coachPersona] Applied tone transformation', {
    persona,
    originalLength: message.length,
    transformedLength: transformedMessage.length,
  });

  return transformedMessage;
}

/**
 * Get all available personas for UI selection
 *
 * @returns Array of persona options
 */
export function getAllPersonas(): Array<{
  value: CoachPersona;
  label: string;
  description: string;
}> {
  return [
    {
      value: 'zen',
      label: PERSONA_CONFIGS.zen.name,
      description: PERSONA_CONFIGS.zen.description,
    },
    {
      value: 'energy',
      label: PERSONA_CONFIGS.energy.name,
      description: PERSONA_CONFIGS.energy.description,
    },
    {
      value: 'logic',
      label: PERSONA_CONFIGS.logic.name,
      description: PERSONA_CONFIGS.logic.description,
    },
  ];
}

/**
 * Format a coaching insight message with persona tone
 *
 * Convenience function that applies persona tone to coaching insights
 * based on user settings.
 *
 * @param message - Original insight message
 * @param settings - User app settings
 * @returns Message with persona tone applied
 */
export function formatCoachingMessage(
  message: string,
  settings: AppSettings
): string {
  const persona = getCoachPersona(settings);
  return applyPersonaTone(message, persona);
}
