import React, { useRef, useState } from 'react';
import { ImageStyle, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { placeholderImage } from '../utils/cafeImage';

interface Props {
  photos?: string[];
  name: string;
  style: ImageStyle | ViewStyle;
  cafeId?: string | number;
  initialsSize?: number;
  hideOnError?: boolean;
}

function CafePhoto({ photos, style, cafeId }: Props) {
  const hasReal = !!(photos && photos.length > 0 && photos[0]);
  const propUri = hasReal ? (photos as string[])[0] : placeholderImage(cafeId ?? 0);

  // Track failed URIs so we can swap to placeholder. Reset when the parent
  // cell is recycled with a new cafe (cafeId changes) — otherwise we'd keep
  // showing the previous cafe's photo or stale fallback state.
  const lastCafeIdRef = useRef(cafeId);
  const [failedFor, setFailedFor] = useState<string | null>(null);

  if (lastCafeIdRef.current !== cafeId) {
    lastCafeIdRef.current = cafeId;
    if (failedFor != null) setFailedFor(null);
  }

  const uri = failedFor === propUri ? placeholderImage(cafeId ?? 0) : propUri;

  return (
    <Image
      source={{ uri }}
      style={style as ImageStyle}
      onError={() => {
        if (failedFor !== propUri) setFailedFor(propUri);
      }}
      cachePolicy="memory-disk"
      transition={0}
      contentFit="cover"
      recyclingKey={uri}
    />
  );
}

export default React.memo(CafePhoto, (prev, next) => {
  return (
    prev.cafeId === next.cafeId &&
    (prev.photos?.[0] ?? null) === (next.photos?.[0] ?? null)
  );
});
