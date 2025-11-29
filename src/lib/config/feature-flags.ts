/**
 * @file src/lib/config/feature-flags.ts
 * @description Feature flags configuration for progressive rollout
 * 
 * AI AGENTS: Update this file when adding new features or changing rollout status
 * 
 * Usage:
 * - Set flags to enable/disable features across the app
 * - Use for gradual rollout of new functionality
 * - Can be extended to be org-specific or user-specific
 */

/**
 * Feature flags for Feature Update phases
 * All Phase 1-7 features are now enabled by default
 */
export const FEATURE_FLAGS = {
  // Phase 1: Truth Layers & Audit Trail
  WORKFLOW_VERSIONING: true,
  AUDIT_LOG: true,
  FACT_IMMUTABILITY: true,

  // Phase 2: Overrides & Owner Notes
  WORKFLOW_OVERRIDES: true,
  ACCURACY_FEEDBACK: true,
  OWNER_NOTES: true,
  RESET_TO_AI: true,

  // Phase 3: Variants & Friction Tracking
  WORKFLOW_VARIANTS: true,
  FRICTION_TRACKING: true,
  VARIANT_ANALYTICS: true,

  // Phase 4: Multi-Language Support
  MULTI_LANGUAGE: true,
  LANGUAGE_PREFERENCES: true,
  AUTO_TRANSLATION: true,

  // Phase 5: Team Health Metrics
  TEAM_HEALTH_SCORECARD: true,
  DEPARTMENT_METRICS: true,
  METRIC_COMPUTATION: true,

  // Phase 6: Pattern Alerts & Coaching
  PATTERN_ALERTS: true,
  COACHING_SUGGESTIONS: true,
  ALERT_LIFECYCLE: true,

  // Phase 7: Privacy & Trust Controls
  PRIVACY_SETTINGS: true,
  CONSENT_TRACKING: true,
  DATA_EXPORT: true,
  DATA_RETENTION: true,
} as const

/**
 * Helper to check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[feature] ?? false
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures(): string[] {
  return Object.entries(FEATURE_FLAGS)
    .filter(([, enabled]) => enabled)
    .map(([feature]) => feature)
}

/**
 * Get all disabled features
 */
export function getDisabledFeatures(): string[] {
  return Object.entries(FEATURE_FLAGS)
    .filter(([, enabled]) => !enabled)
    .map(([feature]) => feature)
}

/**
 * Feature flag categories for UI grouping
 */
export const FEATURE_CATEGORIES = {
  'Data Integrity': [
    'WORKFLOW_VERSIONING',
    'AUDIT_LOG',
    'FACT_IMMUTABILITY',
  ],
  'Owner Controls': [
    'WORKFLOW_OVERRIDES',
    'ACCURACY_FEEDBACK',
    'OWNER_NOTES',
    'RESET_TO_AI',
  ],
  'Variant Management': [
    'WORKFLOW_VARIANTS',
    'FRICTION_TRACKING',
    'VARIANT_ANALYTICS',
  ],
  'Internationalization': [
    'MULTI_LANGUAGE',
    'LANGUAGE_PREFERENCES',
    'AUTO_TRANSLATION',
  ],
  'Analytics': [
    'TEAM_HEALTH_SCORECARD',
    'DEPARTMENT_METRICS',
    'METRIC_COMPUTATION',
  ],
  'Alerting': [
    'PATTERN_ALERTS',
    'COACHING_SUGGESTIONS',
    'ALERT_LIFECYCLE',
  ],
  'Privacy': [
    'PRIVACY_SETTINGS',
    'CONSENT_TRACKING',
    'DATA_EXPORT',
    'DATA_RETENTION',
  ],
} as const

/**
 * Type for feature flag keys
 */
export type FeatureFlag = keyof typeof FEATURE_FLAGS
