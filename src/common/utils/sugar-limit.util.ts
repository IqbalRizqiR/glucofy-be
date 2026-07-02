/**
 * Dynamic daily added-sugar limit calculation.
 *
 * Rationale (see PRD):
 * - A static 25g/day limit is irrational for a beverage-tracking app because it
 *   ignores body size, sex, and activity. An active 85kg male and a sedentary
 *   50kg female have very different metabolic needs.
 * - We derive a personalized MAXIMUM added-sugar ceiling from the user's Basal
 *   Metabolic Rate (Mifflin-St Jeor) scaled by an activity multiplier (TDEE),
 *   then cap added sugars at 10% of total calories (WHO upper guideline).
 *
 * Formula:
 *   BMR (male)   = 10*kg + 6.25*cm - 5*age + 5
 *   BMR (female) = 10*kg + 6.25*cm - 5*age - 161
 *   TDEE         = BMR * activityMultiplier
 *   sugarLimit_g = (TDEE * 0.10) / 4      (1g sugar = 4 kcal)
 *
 * Fallback = 50g/day (FDA Daily Value for added sugars on a 2000 kcal diet)
 * whenever the profile lacks weight, height, age, or gender.
 */

export const FALLBACK_DAILY_SUGAR_LIMIT = 50;

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
};

export interface HealthProfileForLimit {
  weight?: number | null;
  height?: number | null;
  age?: number | null;
  gender?: string | null;
  activityLevel?: string | null;
}

/**
 * Compute the personalized daily added-sugar limit in grams.
 * Returns the 50g fallback when the profile is incomplete.
 */
export function calculateDailySugarLimit(
  profile: HealthProfileForLimit | null | undefined,
): number {
  if (
    !profile ||
    profile.weight == null ||
    profile.height == null ||
    profile.age == null ||
    !profile.gender
  ) {
    return FALLBACK_DAILY_SUGAR_LIMIT;
  }

  const { weight, height, age, gender } = profile;

  const bmrBase = 10 * weight + 6.25 * height - 5 * age;
  const bmr = gender === 'MALE' ? bmrBase + 5 : bmrBase - 161;

  const multiplier =
    ACTIVITY_MULTIPLIERS[profile.activityLevel ?? 'SEDENTARY'] ??
    ACTIVITY_MULTIPLIERS.SEDENTARY;

  const tdee = bmr * multiplier;
  const sugarLimit = (tdee * 0.1) / 4;

  // Guard against nonsensical (non-finite or non-positive) results from
  // extreme/invalid inputs — fall back rather than return garbage.
  if (!Number.isFinite(sugarLimit) || sugarLimit <= 0) {
    return FALLBACK_DAILY_SUGAR_LIMIT;
  }

  return Math.round(sugarLimit * 10) / 10;
}
