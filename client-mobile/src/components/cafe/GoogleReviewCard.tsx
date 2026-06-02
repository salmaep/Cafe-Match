import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Star } from 'lucide-react-native';
import type { GoogleReview } from '../../queries/cafes/google-reviews';
import GoogleGIcon from './GoogleGIcon';

interface Props {
  review: GoogleReview;
}

function GoogleReviewCard({ review }: Props) {
  const initials = (review.guestName?.charAt(0) || '?').toUpperCase();
  const date = formatDate(review.scrapedAt);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        {review.guestAvatar ? (
          <Image
            source={{ uri: review.guestAvatar }}
            style={styles.avatar}
            cachePolicy="memory-disk"
            transition={0}
            contentFit="cover"
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        )}
        <View style={styles.headerBody}>
          <View style={styles.nameRow}>
            <Text style={styles.guestName} numberOfLines={1}>
              {review.guestName}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.stars}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={11}
                  color={i < review.rating ? '#FBBC05' : '#E8E4DD'}
                  fill={i < review.rating ? '#FBBC05' : '#E8E4DD'}
                  strokeWidth={0}
                />
              ))}
            </View>
            <View style={styles.googleBadge}>
              <GoogleGIcon size={9} />
              <Text style={styles.googleBadgeText}>Google Maps</Text>
            </View>
          </View>
          {!!date && <Text style={styles.date}>{date}</Text>}
        </View>
      </View>

      {!!review.comment && (
        <Text style={styles.comment} numberOfLines={4}>
          {review.comment}
        </Text>
      )}

      {!!review.photoUrl && (
        <Image
          source={{ uri: review.photoUrl }}
          style={styles.photo}
          cachePolicy="memory-disk"
          transition={0}
          contentFit="cover"
        />
      )}
    </View>
  );
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0EDE8',
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  headerBody: { flex: 1, minWidth: 0, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  guestName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1C1A',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  stars: { flexDirection: 'row', gap: 1 },
  googleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F4FF',
    borderWidth: 1,
    borderColor: '#C7D3F5',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  googleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4285F4',
  },
  date: { fontSize: 11, color: '#8A8880' },
  comment: {
    fontSize: 13,
    color: '#1C1C1A',
    lineHeight: 18,
  },
  photo: {
    marginTop: 8,
    width: '100%',
    height: 140,
    borderRadius: 8,
    backgroundColor: '#F0EDE8',
  },
});

export default React.memo(GoogleReviewCard);
