import SponsoredCafeSlot from './SponsoredCafeSlot';
import InFeedAd from './InFeedAd';

type Variant = 'card' | 'list';

interface Props {
  slotIndex: number;
  variant?: Variant;
}

/**
 * Alternates between internal sponsored cafes (paid by cafe owners) and Google
 * AdSense (programmatic). Even slots → internal promo, odd slots → AdSense.
 * SponsoredCafeSlot still falls back to AdSense if internal inventory is empty.
 */
export default function HybridAdSlot({ slotIndex, variant = 'card' }: Props) {
  const isAdSenseSlot = slotIndex % 2 === 1;
  if (isAdSenseSlot) {
    return <InFeedAd variant={variant} />;
  }
  // Internal sponsored cafe — receives a halved index so it round-robins through
  // its own inventory independently of AdSense slots.
  return <SponsoredCafeSlot slotIndex={Math.floor(slotIndex / 2)} variant={variant} />;
}
