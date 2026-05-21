import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { commonText, filtersText } from '@shared/i18n/keys';
import {
  fetchFilterCatalog,
  type FilterCatalogGroup,
} from '../../services/api';
import { BackendPurpose } from '../../types';
import PurposeChips from './PurposeChips';
import { facilityIconFor } from '../../utils/facilities';

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
  const { t } = useTranslation();
  const [groups, setGroups] = useState<FilterCatalogGroup[] | null>(catalogCache);
  // Mirror web mobile modal: groups collapsible, default `amenity` open.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    amenity: true,
  });

  useEffect(() => {
    if (catalogCache) return;
    loadCatalog().then(setGroups).catch(() => setGroups([]));
  }, []);

  const facilityGroups = useMemo(
    () =>
      (groups ?? []).filter(
        (g) => g && g.key !== 'price' && Array.isArray(g.options) && g.options.length > 0,
      ),
    [groups],
  );

  const facilitySet = useMemo(() => new Set(facilities), [facilities]);

  const toggleFacility = (key: string) => {
    if (facilitySet.has(key)) {
      onFacilitiesChange(facilities.filter((k) => k !== key));
    } else {
      onFacilitiesChange([...facilities, key]);
    }
  };

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
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
              <Text style={styles.title}>{t(filtersText.modalTitle)}</Text>
              {activeCount > 0 && (
                <Text style={styles.subtitle}>
                  {t(filtersText.activeCount, { count: activeCount })}
                </Text>
              )}
            </View>
            {activeCount > 0 && (
              <TouchableOpacity onPress={clearAll} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>{t(commonText.reset)}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Tujuan */}
            <View style={styles.flatSection}>
              <Text style={styles.smallSectionTitle}>{t(filtersText.purposeSection)}</Text>
              <PurposeChips
                purposes={purposes}
                activeId={activePurposeId}
                onSelect={onPurposeSelect}
                title={null}
              />
            </View>

            {/* Harga — click active to clear (no "Semua" chip) */}
            <View style={styles.flatSection}>
              <Text style={styles.smallSectionTitle}>{t(filtersText.priceSection)}</Text>
              <View style={styles.chipWrap}>
                {PRICE_OPTIONS.map((opt) => {
                  const active = priceRange === opt.key;
                  return (
                    <FilterChip
                      key={opt.key}
                      label={opt.label}
                      active={active}
                      onPress={() => onPriceRangeChange(active ? '' : opt.key)}
                    />
                  );
                })}
              </View>
            </View>

            {/* Facility groups — collapsible */}
            {groups === null && (
              <Text style={styles.loadingText}>{t(filtersText.loadingFilters)}</Text>
            )}
            {groups !== null && facilityGroups.length === 0 && (
              <Text style={styles.loadingText}>{t(filtersText.noFilters)}</Text>
            )}
            {facilityGroups.map((g) => {
              const isOpen = openGroups[g.key] ?? false;
              const selectedInGroup = g.options.filter(
                (o) => o?.key && facilitySet.has(o.key),
              ).length;
              return (
                <View key={g.key} style={styles.groupBlock}>
                  <TouchableOpacity
                    style={styles.groupHeader}
                    onPress={() => toggleGroup(g.key)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.groupTitleRow}>
                      <Text style={styles.groupLabel}>
                        {g.label ?? g.key ?? ''}
                      </Text>
                      {selectedInGroup > 0 && (
                        <View style={styles.groupCountBadge}>
                          <Text style={styles.groupCountBadgeText}>
                            {selectedInGroup}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.chevron, isOpen && styles.chevronOpen]}>
                      ▼
                    </Text>
                  </TouchableOpacity>
                  {isOpen && (
                    <View style={[styles.chipWrap, styles.groupChipWrap]}>
                      {g.options
                        .filter((opt) => opt && opt.key)
                        .map((opt) => (
                          <FilterChip
                            key={opt.key}
                            label={opt.label ?? opt.key}
                            icon={facilityIconFor(opt.key)}
                            count={opt.count}
                            active={facilitySet.has(opt.key)}
                            autoSelected={autoSelectedKeys?.has(opt.key) ?? false}
                            onPress={() => toggleFacility(opt.key)}
                          />
                        ))}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.applyBtn} onPress={onClose}>
              <Text style={styles.applyBtnText}>
                Terapkan{activeCount > 0 ? ` (${activeCount})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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

  flatSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE8',
    gap: 8,
  },
  smallSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A8880',
    letterSpacing: 1.2,
  },

  // Collapsible facility group
  groupBlock: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE8',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1A',
  },
  groupCountBadge: {
    backgroundColor: '#D48B3A',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 18,
    alignItems: 'center',
  },
  groupCountBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  chevron: {
    fontSize: 12,
    color: '#8A8880',
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  groupChipWrap: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 2,
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

  loadingText: { fontSize: 12, color: '#8A8880', textAlign: 'center', paddingVertical: 24 },

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
