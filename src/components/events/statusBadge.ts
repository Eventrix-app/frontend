// The gradient ramp shared by every card's corner badge — EventInterestCard, MainEventCard
// and FeaturedCarousel all pin the same tag to the same seam, so the colours live here rather
// than being declared identically in three files.

export const BADGE_GRADIENT = ['#FF8FA8', '#FF3366', '#DE1F4C', '#A81038'] as const;

type Ramp = readonly [string, string, string, string];

// The brand ramp reads as a promotion, which is right for a price and wrong for a state.
// Each status gets its own so the badge is legible at a glance while scrolling: muted for
// something finished, green for something happening now, and a red darker than the brand pink
// for a cancellation, so the two are not mistaken for one another.
const STATUS_BADGE_GRADIENTS: Record<string, Ramp> = {
  Completed: ['#9AA0A6', '#7C838A', '#61686F', '#4A5057'],
  Live: ['#5BD08A', '#2FB86A', '#1E9E57', '#137A42'],
  Cancelled: ['#C2415C', '#A32341', '#87182F', '#61101F'],
};

/** Badge colours for a card: the status ramp when one applies, otherwise the price ramp. */
export function badgeGradientFor(statusLabel?: string): Ramp {
  if (!statusLabel) return BADGE_GRADIENT;
  return STATUS_BADGE_GRADIENTS[statusLabel] ?? BADGE_GRADIENT;
}
