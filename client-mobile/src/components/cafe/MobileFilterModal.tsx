import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {
  fetchFilterCatalog,
  type FilterCatalogGroup,
} from '../../services/api';
import { BackendPurpose } from '../../types';
import PurposeChips from './PurposeChips';

interface Props {
  visible: boolean;
  onClose: () => void;
  // Purposes
  purposes: BackendPurpose[];
  activePurposeId: number | null;
  onPurposeSelect: (id: number | null) => void;
  // Facilities (string keys)
  facilities: string[];
  onFacilitiesChange: (next: string[]) => void;
  // Price
  priceRange: string;
  onPriceRangeChange: (next: string) => void;
  // Feature keys recommended by the active purpose — rendered with ⭐ when
  // not yet active to signal "auto-suggested for this vibe".
  autoSelectedKeys?: Set<string>;
}

const PRICE_OPTIONS: { key: string; label: string }[] = [
  { key: '$', label: '$' },
  { key: '$$', label: '$$' },
  { key: '$$$', label: '$$$' },
];

// Module-level cache so the catalog is fetched once.
let catalogCache: FilterCatalogGroup[] | null = null;
let catalogPromise: Promise<FilterCatalogGroup[]> | null = null;

async function loadCatalog(): Promise<FilterCatalogGroup[]> {
  if (catalogCache) return catalogCache;
  if (catalogPromise) return catalogPromise;
  catalogPromise = fetchFilterCatalog()
    .then((groups) => {
      catalogCache = groups;
      return groups;
    })
    .catch((err) => {
      catalogPromise = null;
      throw err;
    });
  return catalogPromise;
}

export default function MobileFilterModal({
  visible,
  onClose,
  purposes,
  activePurposeId,
  onPurposeSelect,
  facilities,
  onFacilitiesChange,
  priceRange,
  onPriceRangeChange,
  autoSelectedKeys,
}: Props) {
  const [groups, setGroups] = useState<FilterCatalogGroup[] | null>(catalogCache);

  useEffect(() => {
    if (catalogCache) return;
    loadCatalog().then(setGroups).catch(() => setGroups([]));
  }, []);

  const facilityGroups = useMemo(
    () => (groups ?? []).filter((g) => g.key !== 'price'),
    [groups],
  );

  const toggleFacility = (key: string) => {
    if (facilities.includes(key)) {
      onFacilitiesChange(facilities.filter((k) => k !== key));
    } else {
      onFacilitiesChange([...facilities, key]);
    }
  };

  const clearAll = () => {
    onPurposeSelect(null);
    onFacilitiesChange([]);
    onPriceRangeChange('');
  };

  const activeCount =
    facilities.length + (priceRange ? 1 : 0) + (activePurposeId != null ? 1 : 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Filter</Text>
              {activeCount > 0 && (
                <Text style={styles.subtitle}>
                  {activeCount} filter aktif
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={clearAll} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            {/* Purpose */}
            <Section title="TUJUAN">
              <PurposeChips
                purposes={purposes}
                activeId={activePurposeId}
                onSelect={onPurposeSelect}
                title={null}
              />
            </Section>

            {/* Price */}
            <Section title="HARGA">
              <View style={styles.chipWrap}>
                <FilterChip
                  label="Semua"
                  active={!priceRange}
                  onPress={() => onPriceRangeChange('')}
                />
                {PRICE_OPTIONS.map((opt) => (
                  <FilterChip
                    key={opt.key}
                    label={opt.label}
                    active={priceRange === opt.key}
                    onPress={() => onPriceRangeChange(opt.key)}
                  />
                ))}
              </View>
            </Section>

            {/* Facilities (server-driven groups) */}
            {facilityGroups.length === 0 && (
              <Text style={styles.loadingText}>
                {groups === null ? 'Memuat fasilitas…' : 'Tidak ada fasilitas.'}
              </Text>
            )}
            {facilityGroups.map((g) => (
              <Section key={g.key} title={g.label.toUpperCase()}>
                <View style={styles.chipWrap}>
                  {g.options.map((opt) => (
                    <FilterChip
                      key={opt.key}
                      label={opt.label}
                      icon={opt.icon}
                      count={opt.count}
                      active={facilities.includes(opt.key)}
                      autoSelected={autoSelectedKeys?.has(opt.key) ?? false}
                      onPress={() => toggleFacility(opt.key)}
                    />
                  ))}
                </View>
              </Section>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.applyBtn} onPress={onClose}>
              <Text style={styles.applyBtnText}>Terapkan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function FilterChip({
  label,
  icon,
  active,
  count,
  onPress,
  autoSelected = false,
}: {
  label: string;
  icon?: string;
  active: boolean;
  count?: number;
  onPress: () => void;
  autoSelected?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        active && styles.chipActive,
        !active && autoSelected && styles.chipAuto,
      ]}
    >
      {active ? (
        <View style={styles.chipCheck}>
          <Text style={styles.chipCheckText}>✓</Text>
        </View>
      ) : autoSelected ? (
        <Text style={styles.chipIcon}>⭐</Text>
      ) : icon ? (
        <Text style={styles.chipIcon}>{icon}</Text>
      ) : null}
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
        {label}
      </Text>
      {typeof count === 'number' && (
        <View style={[styles.chipCount, active && styles.chipCountActive]}>
          <Text
            style={[
              styles.chipCountText,
              active && styles.chipCountTextActive,
            ]}
          >
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '88%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE8',
    gap: 8,
  },
  title: { fontSize: 16, fontWeight: '800', color: '#1C1C1A' },
  subtitle: { fontSize: 11, color: '#8A8880', marginTop: 1 },
  clearBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  clearBtnText: { fontSize: 12, fontWeight: '700', color: '#D48B3A' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 18, color: '#8A8880' },

  body: { paddingHorizontal: 16, paddingVertical: 16, gap: 16 },

  section: { gap: 8 },
  sectionTitle: {
    fontSize: 11, fontWeight: '800',
    color: '#8A8880',
    letterSpacing: 1.2,
  },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E8E4DD',
    gap: 6,
  },
  chipActive: {
    backgroundColor: '#D48B3A',
    borderColor: '#D48B3A',
  },
  chipAuto: {
    backgroundColor: '#FDF6EC',
    borderColor: '#D48B3A',
  },
  chipCheck: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  chipCheckText: { fontSize: 9, fontWeight: '900', color: '#D48B3A' },
  chipIcon: { fontSize: 13 },
  chipLabel: { fontSize: 12, fontWeight: '700', color: '#1C1C1A' },
  chipLabelActive: { color: '#FFFFFF' },
  chipCount: {
    paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: 4,
  },
  chipCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  chipCountText: { fontSize: 9, fontWeight: '800', color: '#8A8880' },
  chipCountTextActive: { color: '#FFFFFF' },

  loadingText: { fontSize: 12, color: '#8A8880', textAlign: 'center', paddingVertical: 16 },

  footer: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#F0EDE8',
    backgroundColor: '#FFFFFF',
  },
  applyBtn: {
    backgroundColor: '#1C1C1A',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
