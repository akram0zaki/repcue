/**
 * Catalog Badge System Type Definitions
 * 
 * This file defines the types for the flexible, catalog-specific badge system
 * that replaces hardcoded filtering (e.g., Aikido Kyu levels, static categories).
 */

import type { ReactNode } from 'react';

/**
 * Represents a single value for a catalog badge
 * 
 * @example
 * // Simple badge value
 * { id: 'bodyweight', label: 'catalogs:general-fitness.badges.equipment.values.bodyweight' }
 * 
 * @example
 * // Badge value with parameters
 * { id: 1, label: 'catalogs:aikido.badges.kyuLevel.values.kyu1', labelParams: { level: 6 } }
 * 
 * @example
 * // Badge value with icon
 * { id: 'dumbbells', label: '...', icon: <DumbbellIcon /> }
 */
export interface BadgeValue {
  /** Unique identifier for this badge value (e.g., 'bodyweight', 1, 'salsa') */
  id: string | number;
  
  /** i18n key for the badge value label */
  label: string;
  
  /** Optional parameters for i18n interpolation */
  labelParams?: Record<string, string | number>;
  
  /** Optional icon component to display with the badge */
  icon?: ReactNode;
  
  /** Fallback label if translation is missing */
  fallbackLabel?: string;
}

/**
 * Defines a badge type for a catalog
 * 
 * Badges are catalog-specific filters that allow users to narrow exercise selection
 * based on relevant attributes (e.g., equipment, intensity, Kyu level, dance style).
 * 
 * @example
 * // Structured numeric badge (Aikido Kyu levels)
 * {
 *   id: 'kyuLevel',
 *   label: 'catalogs:aikido.badges.kyuLevel.label',
 *   values: [
 *     { id: 1, label: 'catalogs:aikido.badges.kyuLevel.values.kyu1' },
 *     { id: 2, label: 'catalogs:aikido.badges.kyuLevel.values.kyu2' },
 *   ],
 *   tagPattern: { prefix: 'kyu:' }
 * }
 * 
 * @example
 * // Simple categorical badge (Equipment)
 * {
 *   id: 'equipment',
 *   label: 'catalogs:general-fitness.badges.equipment.label',
 *   filterType: 'multiple',
 *   values: [
 *     { id: 'bodyweight', label: '...' },
 *     { id: 'dumbbells', label: '...' }
 *   ],
 *   tagPattern: { prefix: 'equipment:' }
 * }
 * 
 * @example
 * // Dynamic discovery badge (Tai Chi forms)
 * {
 *   id: 'form',
 *   label: 'catalogs:tai-chi.badges.form.label',
 *   dynamicDiscovery: true,
 *   tagPattern: { 
 *     prefix: 'form:',
 *     extractPattern: /^form:(.+)$/
 *   }
 * }
 * 
 * @example
 * // Computed badge (read-only, derived from other data)
 * {
 *   id: 'hasVideo',
 *   label: 'catalogs:general-fitness.badges.hasVideo.label',
 *   computed: true,
 *   values: [
 *     { id: 'yes', label: 'common:yes' },
 *     { id: 'no', label: 'common:no' }
 *   ]
 * }
 */
export interface CatalogBadge {
  /** Unique badge ID within catalog (e.g., 'kyuLevel', 'equipment', 'category') */
  id: string;
  
  /** i18n key for the badge label */
  label: string;
  
  /** 
   * Selection mode: 'single' allows only one value, 'multiple' allows many
   * @default 'multiple'
   */
  filterType?: 'single' | 'multiple';
  
  /** Predefined badge values (for static badges) */
  values?: BadgeValue[];
  
  /** 
   * Tag-based filtering configuration
   * Defines how badge values map to exercise tags
   */
  tagPattern?: {
    /** Tag prefix (e.g., 'kyu:' for Kyu level tags) */
    prefix?: string;
    
    /** Tag suffix (rarely used) */
    suffix?: string;
    
    /** Regex to extract value from tag (for complex patterns) */
    extractPattern?: RegExp;
  };
  
  /** 
   * If true, badge values are discovered from existing exercise tags
   * Used for badges where values aren't predefined (e.g., Tai Chi forms)
   */
  dynamicDiscovery?: boolean;
  
  /** 
   * If true, badge is read-only and derived from other exercise data
   * Not editable in forms, but can be filtered and displayed
   * Examples: hasVideo (from video_files), durationRange (from default_duration)
   */
  computed?: boolean;
}

/**
 * Exercise Catalog with Badge Support
 * 
 * Extended catalog definition that includes badge metadata for filtering
 */
export interface ExerciseCatalog {
  /** Unique catalog identifier */
  id: string;
  
  /** i18n key for catalog name */
  nameKey: string;
  
  /** i18n key for catalog description */
  descriptionKey: string;
  
  /** Whether this is the default catalog */
  isDefault?: boolean;
  
  /** Whether this catalog requires premium access */
  isPremium?: boolean;
  
  /** Display order in catalog list */
  displayOrder: number;
  
  /** Optional icon component */
  icon?: ReactNode;
  
  /** Optional color theme */
  colorTheme?: string;
  
  /** Optional picture URL */
  pictureUrl?: string;
  
  /** 
   * Catalog-specific badges for filtering exercises
   * Zero or more badges can be defined per catalog
   */
  badges?: CatalogBadge[];
  
  /** 
   * Optional badge ID to use for grouping exercises on the listing page.
   * If specified, exercises will be grouped by this badge's values.
   * If omitted, exercises are displayed in a flat list.
   * @example 'category' - groups by category badge
   * @example 'kyuLevel' - groups by Aikido Kyu level
   */
  groupByBadge?: string;
}

