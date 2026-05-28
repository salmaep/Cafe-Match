import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { filtersText, trendingText } from '@shared/i18n/keys';
import { BackendPurpose } from '../../types';
import { LucideIcon } from '../../utils/lucideIcon';

interface Props {
  purposes: BackendPurpose[];
  activeId: number | null;
  onSelect: (id: number | null) => void;
  /** When true, renders horizontal pill row inside a ScrollView (good for headers). */
  horizontal?: boolean;
  /** Heading text. Defaults to "Tujuan" — pass empty string to hide. */
  title?: string | null;
}

export default function PurposeChips({
  purposes,
  activeId,
  onSelect,
  horizontal,
  title,
}: Props) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t(filtersText.defaultPurposeTitle);
  const allLabel = t(trendingText.allFilter);
  const Pill = ({
    label,
    iconName,
    active,
    onPress,
  }: {
    label: string;
    iconName?: string | null;
    active: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.pill,
        active && (label === allLabel ? styles.pillActiveDark : styles.pillActive),
      ]}
    >
      {iconName ? (
        <LucideIcon
          name={iconName}
          size={12}
          color={active ? '#FFFFFF' : '#1C1C1A'}
          strokeWidth={2}
        />
      ) : null}
      <Text style={[styles.pillText, active && styles.pillTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (horizontal) {
    return (
      <View>
        {!!resolvedTitle && <Text style={styles.title}>{resolvedTitle}</Text>}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Pill
            label={allLabel}
            active={activeId === null}
            onPress={() => onSelect(null)}
          />
          {purposes.map((p) => (
            <Pill
              key={p.id}
              label={p.name}
              iconName={p.icon}
              active={activeId === p.id}
              onPress={() => onSelect(activeId === p.id ? null : p.id)}
            />
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View>
      {!!resolvedTitle && <Text style={styles.title}>{resolvedTitle}</Text>}
      <View style={styles.wrap}>
        <Pill
          label={allLabel}
          active={activeId === null}
          onPress={() => onSelect(null)}
        />
        {purposes.map((p) => (
          <Pill
            key={p.id}
            label={p.name}
            iconName={p.icon}
            active={activeId === p.id}
            onPress={() => onSelect(activeId === p.id ? null : p.id)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A8880',
    letterSpacing: 1.2,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  scrollContent: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E8E4DD',
    backgroundColor: '#FFFFFF',
  },
  pillActive: {
    backgroundColor: '#D48B3A',
    borderColor: '#D48B3A',
  },
  pillActiveDark: {
    backgroundColor: '#1C1C1A',
    borderColor: '#1C1C1A',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1C1A',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
});
