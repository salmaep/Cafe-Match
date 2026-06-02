import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Search, X, Clock, MapPin } from 'lucide-react-native';
import { mapText } from '@shared/i18n/keys';
import { usePreferences } from '../context/PreferencesContext';
import { useLocation } from '../context/LocationContext';
import { useAutocomplete } from '../queries/cafes/use-autocomplete';
import { useSearchHistory } from '../lib/use-search-history';
import { AutocompleteHit } from '../queries/cafes/types';
import { cleanAddress } from '../utils/address';
import { colors, spacing, radius } from '../theme';

const MIN_QUERY_LEN = 2;

function suggestionMeta(hit: AutocompleteHit): string {
  const locality = cleanAddress(hit.district || hit.city || '');
  const distanceKm =
    hit.distanceMeters != null
      ? `${(hit.distanceMeters / 1000).toFixed(1)} km`
      : null;
  return [locality, distanceKm].filter(Boolean).join('  ·  ');
}

export default function SearchScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { preferences } = usePreferences();
  const { latitude: userLat, longitude: userLng } = useLocation();

  // Bias autocomplete toward the user's chosen location (custom prefs win,
  // else live GPS) — same resolution as MapScreen's `center`.
  const lat = preferences?.location?.latitude ?? userLat;
  const lng = preferences?.location?.longitude ?? userLng;

  const [q, setQ] = useState('');
  const auto = useAutocomplete(q, { lat, lng });
  const { history, push, remove, clear } = useSearchHistory();

  const showSuggestions = q.trim().length >= MIN_QUERY_LEN;

  const submit = useCallback(
    (term: string) => {
      const clean = term.trim();
      if (!clean) return;
      push(clean);
      // replace so back from results returns to Explore, not an empty Search.
      navigation.replace('SearchResults', { q: clean });
    },
    [navigation, push],
  );

  const openCafe = useCallback(
    (hit: AutocompleteHit) => {
      // Mirror web: navigate dengan partial cafe (id + nama + lokasi),
      // CafeDetailScreen yang fetch full detail via useCafeDetail.
      const partial = {
        id: String(hit.id),
        name: hit.name,
        slug: hit.slug,
        city: hit.city,
        district: hit.district,
      };
      navigation.navigate('CafeDetail', { cafe: partial });
    },
    [navigation],
  );

  return (
    <View style={styles.container}>
      {/* Search header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={24} color={colors.primary} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Search
            size={16}
            color={colors.textSecondary}
            strokeWidth={2.2}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.input}
            placeholder={t(mapText.searchScreenPlaceholder)}
            placeholderTextColor={colors.textSecondary}
            value={q}
            onChangeText={setQ}
            onSubmitEditing={() => submit(q)}
            autoFocus
            returnKeyType="search"
          />
          {q.length > 0 && (
            <TouchableOpacity
              onPress={() => setQ('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color={colors.textSecondary} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Body: suggestions (q>=2) or recent (q empty) */}
      {showSuggestions ? (
        <View style={styles.body}>
          <Text style={styles.sectionHeader}>
            {t(mapText.suggestionsHeader)}
          </Text>
          {auto.loading && auto.suggestions.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : auto.suggestions.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyText}>{t(mapText.noSuggestions)}</Text>
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled">
              {auto.suggestions.map((hit) => {
                const meta = suggestionMeta(hit);
                return (
                  <TouchableOpacity
                    key={hit.id}
                    style={styles.row}
                    onPress={() => openCafe(hit)}
                    activeOpacity={0.7}
                  >
                    <MapPin
                      size={18}
                      color={colors.accent}
                      strokeWidth={2}
                      style={styles.rowIcon}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {hit.name}
                      </Text>
                      {!!meta && (
                        <Text style={styles.rowMeta} numberOfLines={1}>
                          {meta}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      ) : history.length > 0 ? (
        <View style={styles.body}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>{t(mapText.recentHeader)}</Text>
            <TouchableOpacity onPress={clear} hitSlop={8}>
              <Text style={styles.clearAll}>{t(mapText.clearAll)}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {history.map((term) => (
              <View key={term} style={styles.row}>
                <TouchableOpacity
                  style={styles.rowMain}
                  onPress={() => submit(term)}
                  activeOpacity={0.7}
                >
                  <Clock
                    size={16}
                    color={colors.textSecondary}
                    strokeWidth={2}
                    style={styles.rowIcon}
                  />
                  <Text style={styles.recentText} numberOfLines={1}>
                    {term}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => remove(term)} hitSlop={8}>
                  <X size={16} color={colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t(mapText.searchPrompt)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    width: 32,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  searchIcon: { marginRight: spacing.sm },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.primary,
    paddingVertical: spacing.sm + 4,
  },
  body: { flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  clearAll: { fontSize: 13, fontWeight: '700', color: colors.accent },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  rowIcon: { marginRight: spacing.sm },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.primary },
  rowMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  recentText: { fontSize: 15, color: colors.primary, flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
});
