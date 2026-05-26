import React, { useState } from 'react';
import { View, Text, ImageStyle, ViewStyle } from 'react-native';
import { Image } from 'expo-image';

const PLACEHOLDER_COLORS = [
  '#B08850', '#6B8E7A', '#7B6E9E', '#8B7355', '#5E8A8A',
  '#9E6B6B', '#7A8E6B', '#6B7A8E', '#8E7A6B', '#6B8E8E',
];

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function pickColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  }
  return PLACEHOLDER_COLORS[hash % PLACEHOLDER_COLORS.length];
}

interface Props {
  photos?: string[];
  name: string;
  style: ImageStyle | ViewStyle;
  initialsSize?: number;
}

export default function CafePhoto({ photos, name, style, initialsSize }: Props) {
  const [failed, setFailed] = useState(false);
  const uri = photos && photos.length > 0 ? photos[0] : '';

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={style as ImageStyle}
        onError={() => setFailed(true)}
        cachePolicy="memory-disk"
        transition={200}
        contentFit="cover"
      />
    );
  }

  const initials = getInitials(name) || '?';
  const bgColor = pickColor(name);
  const fontSize = initialsSize ?? ((style as any).width ? Math.round((style as any).width * 0.3) : 20);

  return (
    <View
      style={[
        style as ViewStyle,
        { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' },
      ]}
    >
      <Text style={{ color: '#fff', fontSize, fontWeight: '800', letterSpacing: 1 }}>
        {initials}
      </Text>
    </View>
  );
}
