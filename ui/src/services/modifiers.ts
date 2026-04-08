// Shadow Run — Score Modifier System
// All modifiers are computed client-side in TypeScript
// finalPoints = basePoints * product(all active multipliers)

export interface Modifier {
  id: string;
  name: string;
  description: string;
  multiplier: number; // e.g., 1.25 = +25%
  icon: string;
  condition: () => boolean;
}

// Check if current UTC hour falls within window
function isHourInRange(startHour: number, endHour: number): boolean {
  const hour = new Date().getUTCHours();
  return hour >= startHour && hour < endHour;
}

export const MODIFIERS: Modifier[] = [
  {
    id: 'silent_crossing',
    name: 'Silent Crossing',
    description: 'Zero on-chain metadata correlation',
    multiplier: 1.25,
    icon: '🤫',
    condition: () => true, // always possible if stealth criteria met
  },
  {
    id: 'sunrise_sprint',
    name: 'Sunrise Sprint',
    description: 'Complete within 50% of time limit',
    multiplier: 1.20,
    icon: '🌅',
    condition: () => isHourInRange(4, 8), // dawn UTC
  },
  {
    id: 'chain_alert',
    name: 'CHAIN Alert',
    description: 'Complete during a high-alert event',
    multiplier: 1.40,
    icon: '🔴',
    condition: () => {
      // CHAIN alert active every 3 hours for 30 minutes
      const minutes = new Date().getUTCMinutes();
      const hour = new Date().getUTCHours();
      return hour % 3 === 0 && minutes < 30;
    },
  },
  {
    id: 'canopy_streak',
    name: 'Canopy Streak',
    description: '5+ missions completed in same session',
    multiplier: 1.15,
    icon: '🔥',
    condition: () => false, // checked externally via session count
  },
  {
    id: 'deep_forest',
    name: 'Deep Forest',
    description: 'Use a route through the hardest terrain tier',
    multiplier: 1.30,
    icon: '🌲',
    condition: () => true, // always available for difficulty 4+
  },
  {
    id: 'shadow_veil',
    name: 'Shadow Veil',
    description: 'Night mission bonus',
    multiplier: 1.15,
    icon: '🌑',
    condition: () => isHourInRange(20, 24) || isHourInRange(0, 4),
  },
];

export function getActiveModifiers(
  missionDifficulty: number = 1,
  sessionMissions: number = 0,
  completedFast: boolean = false,
): Modifier[] {
  return MODIFIERS.filter(m => {
    if (m.id === 'canopy_streak') return sessionMissions >= 5;
    if (m.id === 'deep_forest') return missionDifficulty >= 4;
    if (m.id === 'sunrise_sprint') return completedFast && m.condition();
    if (m.id === 'silent_crossing') return true; // always shown as possible
    return m.condition();
  });
}

export function calculateFinalPoints(
  basePoints: number,
  activeModifiers: Modifier[],
): { total: number; breakdown: { name: string; bonus: number }[] } {
  let total = basePoints;
  const breakdown: { name: string; bonus: number }[] = [
    { name: 'Base Score', bonus: basePoints },
  ];

  for (const mod of activeModifiers) {
    const bonus = Math.round(basePoints * (mod.multiplier - 1));
    total += bonus;
    breakdown.push({ name: mod.name, bonus });
  }

  return { total, breakdown };
}
