import SponsoredCafeSlot from './SponsoredCafeSlot';
import InFeedAd from './InFeedAd';

type Variant = 'card' | 'list';
type Size = 'normal' | 'compact';

interface Props {
  slotIndex: number;
  variant?: Variant;
  size?: Size;
}

/**
 * Alternates between internal sponsored cafes (paid by cafe owners) and Google
 * AdSense (programmatic). Even slots → internal promo, odd slots → AdSense.
 * SponsoredCafeSlot still falls back to AdSense if internal inventory is empty.
 */
export default function HybridAdSlot({ slotIndex, variant = 'card', size = 'normal' }: Props) {
  const isAdSenseSlot = slotIndex % 2 === 1;
  if (isAdSenseSlot) {
    return <InFeedAd variant={variant} size={size} />;
  }
  // Internal sponsored cafe — receives a halved index so it round-robins through
  // its own inventory independently of AdSense slots.
  return (
    <SponsoredCafeSlot slotIndex={Math.floor(slotIndex / 2)} variant={variant} size={size} />
  );
}
