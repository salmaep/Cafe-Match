import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Star,
  Check,
  CheckCircle,
  X,
  Camera,
  Trash2,
} from 'lucide-react-native';
import { LucideIcon } from '../../utils/lucideIcon';
import api from '../../services/api';
import { colors, spacing, radius } from '../../theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PackageOption {
  id: number;
  name: string;
  price: number;
  priceAnnual: number;
  slots: number | string;
  recommended: boolean;
  benefits: string[];
}

interface Props {
  visible: boolean;
  onClose: () => void;
  ownerCafe?: { id: number; name: string; facilities?: any[] };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PACKAGES: PackageOption[] = [
  {
    id: 1,
    name: 'Pemula',
    price: 99000,
    priceAnnual: 89000,
    slots: 50,
    recommended: false,
    benefits: ['Pin highlight di map', 'Badge kartu cafe', '50 slot views/bulan'],
  },
  {
    id: 2,
    name: 'Pro',
    price: 199000,
    priceAnnual: 169000,
    slots: 150,
    recommended: true,
    benefits: [
      'Semua fitur Pemula',
      'Kartu featured di Discover',
      'Banner promo di kartu cafe',
      '150 slot views/bulan',
    ],
  },
  {
    id: 3,
    name: 'Premium',
    price: 349000,
    priceAnnual: 299000,
    slots: 'Unlimited',
    recommended: false,
    benefits: [
      'Semua fitur Pro',
      'Posisi teratas di search',
      'Support prioritas',
      'Views unlimited',
    ],
  },
];

const FACILITY_OPTIONS: { key: string; label: string; lucideName: string }[] = [
  { key: 'wifi', label: 'WiFi', lucideName: 'wifi' },
  { key: 'power_outlet', label: 'Stop Kontak', lucideName: 'zap' },
  { key: 'parking', label: 'Parkir', lucideName: 'squareparking' },
  { key: 'mushola', label: 'Mushola', lucideName: 'building2' },
  { key: 'quiet_atmosphere', label: 'Tenang', lucideName: 'volumex' },
  { key: 'large_tables', label: 'Meja Besar', lucideName: 'table2' },
  { key: 'outdoor_area', label: 'Outdoor', lucideName: 'trees' },
  { key: 'kid_friendly', label: 'Ramah Anak', lucideName: 'baby' },
];

const formatRupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CreatePromotionScreen({ visible, onClose, ownerCafe }: Props) {
  const insets = useSafeAreaInsets();

  // Wizard state
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedType, setSelectedType] = useState<'new_cafe' | 'featured_promo' | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageOption | null>(null);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [contentTitle, setContentTitle] = useState('');
  const [contentDescription, setContentDescription] = useState('');
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [promoPhotoUri, setPromoPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Reset all state when modal closes
  const handleClose = () => {
    setStep(1);
    setSelectedType(null);
    setSelectedPackage(null);
    setBilling('monthly');
    setContentTitle('');
    setContentDescription('');
    setSelectedFacilities([]);
    setPromoPhotoUri(null);
    setSubmitting(false);
    setSubmitted(false);
    onClose();
  };

  const goNext = () => setStep((s) => Math.min(s + 1, 4) as 1 | 2 | 3 | 4);
  const goBack = () => setStep((s) => Math.max(s - 1, 1) as 1 | 2 | 3 | 4);

  const toggleFacility = (key: string) => {
    setSelectedFacilities((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Butuh Izin', 'Izinin akses ke galeri foto kamu dulu ya.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPromoPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post('/api/v1/promotions', {
        cafeId: ownerCafe?.id,
        type: selectedType,
        packageId: selectedPackage?.id,
        billing,
        contentTitle: selectedType === 'featured_promo' ? contentTitle : null,
        contentDescription: selectedType === 'featured_promo' ? contentDescription : null,
        facilities: selectedType === 'featured_promo' ? selectedFacilities : [],
        promoPhotoUri: selectedType === 'featured_promo' ? promoPhotoUri : null,
      });
    } catch {
      // Silently show submitted state even on error
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  };

  const currentPrice =
    selectedPackage
      ? billing === 'annual'
        ? selectedPackage.priceAnnual
        : selectedPackage.price
      : 0;

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const renderStepDots = () => (
    <View style={styles.stepDots}>
      {[1, 2, 3, 4].map((n) => (
        <View
          key={n}
          style={[
            styles.dot,
            n === step
              ? styles.dotActive
              : n < step
              ? styles.dotDone
              : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Pilih Tipe Promosi</Text>
      <Text style={styles.stepSubtitle}>Step 1 dari 4</Text>

      <TouchableOpacity
        style={[
          styles.typeCard,
          selectedType === 'new_cafe' && styles.typeCardSelected,
        ]}
        onPress={() => setSelectedType('new_cafe')}
        activeOpacity={0.8}
      >
        <View style={styles.typeCardIconWrap}>
          <Sparkles size={28} color={colors.accent} strokeWidth={2} />
        </View>
        <View style={styles.typeCardBody}>
          <Text style={styles.typeCardName}>Sorotan Cafe Baru</Text>
          <Text style={styles.typeCardDesc}>
            Tampilin kartu border coral di deck swipe. Cocok buat cafe baru ({"<"} 6 bulan).
          </Text>
        </View>
        <View style={[styles.radioCircle, selectedType === 'new_cafe' && styles.radioCircleActive]}>
          {selectedType === 'new_cafe' && <View style={styles.radioInner} />}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.typeCard,
          selectedType === 'featured_promo' && styles.typeCardSelected,
        ]}
        onPress={() => setSelectedType('featured_promo')}
        activeOpacity={0.8}
      >
        <View style={styles.typeCardIconWrap}>
          <Star size={28} color="#F59E0B" fill="#F59E0B" strokeWidth={0} />
        </View>
        <View style={styles.typeCardBody}>
          <Text style={styles.typeCardName}>Promo Unggulan</Text>
          <Text style={styles.typeCardDesc}>
            Tampilin promosi kamu dengan banner custom + konten promo di feed discover.
          </Text>
        </View>
        <View style={[styles.radioCircle, selectedType === 'featured_promo' && styles.radioCircleActive]}>
          {selectedType === 'featured_promo' && <View style={styles.radioInner} />}
        </View>
      </TouchableOpacity>

      <View style={styles.navRow}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={[styles.nextBtn, !selectedType && styles.nextBtnDisabled]}
          onPress={goNext}
          disabled={!selectedType}
        >
          <View style={styles.navBtnRow}>
            <Text style={[styles.nextBtnText, !selectedType && styles.nextBtnTextDisabled]}>
              Lanjut
            </Text>
            <ArrowRight size={14} color={!selectedType ? colors.textSecondary : colors.white} strokeWidth={2.2} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Pilih Paket</Text>
      <Text style={styles.stepSubtitle}>Step 2 dari 4</Text>

      {/* Billing toggle */}
      <View style={styles.billingToggle}>
        <TouchableOpacity
          style={[styles.billingBtn, billing === 'monthly' && styles.billingBtnActive]}
          onPress={() => setBilling('monthly')}
        >
          <Text style={[styles.billingBtnText, billing === 'monthly' && styles.billingBtnTextActive]}>
            Bulanan
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.billingBtn, billing === 'annual' && styles.billingBtnActive]}
          onPress={() => setBilling('annual')}
        >
          <Text style={[styles.billingBtnText, billing === 'annual' && styles.billingBtnTextActive]}>
            Tahunan
          </Text>
          <View style={styles.saveBadge}>
            <Text style={styles.saveBadgeText}>Hemat ~15%</Text>
          </View>
        </TouchableOpacity>
      </View>

      {PACKAGES.map((pkg) => {
        const price = billing === 'annual' ? pkg.priceAnnual : pkg.price;
        const isSelected = selectedPackage?.id === pkg.id;
        return (
          <TouchableOpacity
            key={pkg.id}
            style={[styles.packageCard, isSelected && styles.packageCardSelected]}
            onPress={() => setSelectedPackage(pkg)}
            activeOpacity={0.8}
          >
            {pkg.recommended && (
              <View style={styles.recommendedBadge}>
                <Star size={11} color="#F59E0B" fill="#F59E0B" strokeWidth={0} />
                <Text style={styles.recommendedBadgeText}>Rekomendasi</Text>
              </View>
            )}
            <View style={styles.packageCardHeader}>
              <Text style={styles.packageName}>{pkg.name}</Text>
              <View>
                <Text style={styles.packagePrice}>
                  {formatRupiah(price)}
                  <Text style={styles.packagePricePer}>
                    /{billing === 'annual' ? 'thn' : 'bln'}
                  </Text>
                </Text>
              </View>
            </View>
            {pkg.benefits.map((b, i) => (
              <View key={i} style={styles.benefitRow}>
                <Check size={12} color={colors.accent} strokeWidth={2.5} />
                <Text style={styles.benefitText}>{b}</Text>
              </View>
            ))}
          </TouchableOpacity>
        );
      })}

      <View style={styles.navRow}>
        <TouchableOpacity style={[styles.backBtn, styles.navBtnRow]} onPress={goBack}>
          <ArrowLeft size={14} color={colors.primary} strokeWidth={2.2} />
          <Text style={styles.backBtnText}>Kembali</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextBtn, !selectedPackage && styles.nextBtnDisabled]}
          onPress={goNext}
          disabled={!selectedPackage}
        >
          <View style={styles.navBtnRow}>
            <Text style={[styles.nextBtnText, !selectedPackage && styles.nextBtnTextDisabled]}>
              Lanjut
            </Text>
            <ArrowRight size={14} color={!selectedPackage ? colors.textSecondary : colors.white} strokeWidth={2.2} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Tambah Konten</Text>
      <Text style={styles.stepSubtitle}>Step 3 dari 4</Text>

      {selectedType === 'new_cafe' ? (
        <View>
          {/* Mock preview card */}
          <View style={styles.newCafePreview}>
            <View style={styles.newCafeCard}>
              <View style={styles.newCafeBadge}>
                <Text style={styles.newCafeBadgeText}>NEW</Text>
              </View>
              <Text style={styles.newCafeName}>{ownerCafe?.name || 'Cafe Kamu'}</Text>
              <Text style={styles.newCafeTagline}>Baru terdaftar di Geser</Text>
            </View>
          </View>
          <Text style={styles.previewCaption}>
            Cafe kamu bakal muncul dengan highlight coral di feed discovery.
          </Text>
        </View>
      ) : (
        <View>
          <Text style={styles.fieldLabel}>Judul Promosi</Text>
          <TextInput
            style={styles.textInput}
            placeholder="contoh: Buy 1 Get 1 Tiap Rabu"
            placeholderTextColor={colors.textSecondary}
            value={contentTitle}
            onChangeText={setContentTitle}
          />

          <Text style={styles.fieldLabel}>Deskripsi</Text>
          <TextInput
            style={[styles.textInput, styles.textInputMulti]}
            placeholder="Jelasin promosi kamu..."
            placeholderTextColor={colors.textSecondary}
            value={contentDescription}
            onChangeText={setContentDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Facility chips */}
          {ownerCafe?.facilities && ownerCafe.facilities.length > 0 && (
            <View>
              <Text style={styles.fieldLabel}>Sorot Fasilitas</Text>
              <View style={styles.chipsContainer}>
                {FACILITY_OPTIONS.filter((f) =>
                  ownerCafe.facilities!.some(
                    (cf: any) =>
                      cf === f.key ||
                      cf?.key === f.key ||
                      cf?.name === f.key ||
                      cf?.type === f.key
                  )
                ).map((f) => {
                  const active = selectedFacilities.includes(f.key);
                  return (
                    <TouchableOpacity
                      key={f.key}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggleFacility(f.key)}
                    >
                      <LucideIcon
                        name={f.lucideName}
                        size={13}
                        color={active ? colors.white : colors.primary}
                        strokeWidth={2}
                      />
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Photo upload */}
          <Text style={styles.fieldLabel}>Foto Promo (opsional)</Text>
          {promoPhotoUri ? (
            <View style={styles.photoPreviewContainer}>
              <Image source={{ uri: promoPhotoUri }} style={styles.photoPreview} />
              <TouchableOpacity
                style={[styles.removePhotoBtn, styles.removePhotoBtnRow]}
                onPress={() => setPromoPhotoUri(null)}
              >
                <Trash2 size={12} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={styles.removePhotoBtnText}>Hapus</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.uploadBtn, styles.uploadBtnRow]} onPress={pickImage}>
              <Camera size={18} color={colors.accent} strokeWidth={2.2} />
              <Text style={styles.uploadBtnText}>Upload Foto</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.navRow}>
        <TouchableOpacity style={[styles.backBtn, styles.navBtnRow]} onPress={goBack}>
          <ArrowLeft size={14} color={colors.primary} strokeWidth={2.2} />
          <Text style={styles.backBtnText}>Kembali</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextBtn} onPress={goNext}>
          <View style={styles.navBtnRow}>
            <Text style={styles.nextBtnText}>Lanjut</Text>
            <ArrowRight size={14} color={colors.white} strokeWidth={2.2} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep4 = () => {
    if (submitted) {
      return (
        <View style={[styles.stepContainer, styles.successContainer]}>
          <CheckCircle size={64} color="#10B981" strokeWidth={2} style={styles.successIconLead} />
          <Text style={styles.successTitle}>Terkirim!</Text>
          <Text style={styles.successMsg}>
            Promosi kamu lagi nunggu direview admin. Nanti dikabarin kalau udah disetujui ya.
          </Text>
          <TouchableOpacity style={styles.doneBtn} onPress={handleClose}>
            <Text style={styles.doneBtnText}>Selesai</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Review & Kirim</Text>
        <Text style={styles.stepSubtitle}>Step 4 dari 4</Text>

        <View style={styles.summaryCard}>
          {/* Type */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tipe Promosi</Text>
            <View style={styles.summaryValueRow}>
              {selectedType === 'new_cafe' ? (
                <Sparkles size={14} color={colors.accent} strokeWidth={2} />
              ) : (
                <Star size={14} color="#F59E0B" fill="#F59E0B" strokeWidth={0} />
              )}
              <Text style={styles.summaryValue}>
                {selectedType === 'new_cafe' ? 'Sorotan Cafe Baru' : 'Promo Unggulan'}
              </Text>
            </View>
          </View>

          <View style={styles.summarySeparator} />

          {/* Package */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Paket</Text>
            <Text style={styles.summaryValue}>{selectedPackage?.name}</Text>
          </View>

          <View style={styles.summarySeparator} />

          {/* Billing */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tagihan</Text>
            <Text style={styles.summaryValue}>
              {billing === 'monthly' ? 'Bulanan' : 'Tahunan'}
            </Text>
          </View>

          {/* Content preview (featured_promo only) */}
          {selectedType === 'featured_promo' && contentTitle ? (
            <>
              <View style={styles.summarySeparator} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Judul Promo</Text>
                <Text style={[styles.summaryValue, { flex: 1, textAlign: 'right' }]} numberOfLines={2}>
                  {contentTitle}
                </Text>
              </View>
            </>
          ) : null}

          {selectedType === 'featured_promo' && contentDescription ? (
            <>
              <View style={styles.summarySeparator} />
              <View style={styles.summaryColRow}>
                <Text style={styles.summaryLabel}>Deskripsi</Text>
                <Text style={styles.summaryDescText} numberOfLines={3}>
                  {contentDescription}
                </Text>
              </View>
            </>
          ) : null}

          <View style={[styles.summarySeparator, { marginTop: spacing.sm }]} />

          {/* Total */}
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatRupiah(currentPrice)}</Text>
          </View>
        </View>

        <View style={styles.approvalNote}>
          <Text style={styles.approvalNoteText}>
            Pembayaran ditarik SETELAH disetujui admin (biasanya 1-2 hari kerja)
          </Text>
        </View>

        <View style={styles.navRow}>
          <TouchableOpacity style={[styles.backBtn, styles.navBtnRow]} onPress={goBack} disabled={submitting}>
            <ArrowLeft size={14} color={colors.primary} strokeWidth={2.2} />
            <Text style={styles.backBtnText}>Kembali</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.submitBtnText}>Kirim buat Review</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderStep = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
    }
  };

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[styles.modalRoot, { paddingTop: insets.top }]}>
        {/* Top bar */}
        <View style={styles.topBar}>
          {renderStepDots()}
          {!submitted && (
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <X size={18} color={colors.textSecondary} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderStep()}
          <View style={{ height: insets.bottom + spacing.lg }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    right: spacing.lg,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Step dots
  stepDots: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 24,
    borderRadius: 5,
  },
  dotDone: {
    backgroundColor: colors.accent + '60',
  },
  dotInactive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.textSecondary + '40',
  },

  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing.lg },

  // Step container
  stepContainer: { paddingBottom: spacing.lg },
  stepTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  stepSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },

  // Step 1 — Type cards
  typeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  typeCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '08',
  },
  typeCardIconWrap: { marginRight: spacing.md, marginTop: 2 },
  typeCardBody: { flex: 1, marginRight: spacing.sm },
  typeCardName: { fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  typeCardDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.textSecondary + '60',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  radioCircleActive: { borderColor: colors.accent },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: colors.accent,
  },

  // Step 2 — Billing toggle
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    padding: 4,
    marginBottom: spacing.lg,
  },
  billingBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    gap: spacing.xs,
  },
  billingBtnActive: { backgroundColor: colors.white, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  billingBtnText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  billingBtnTextActive: { color: colors.primary },
  saveBadge: {
    backgroundColor: colors.success + '20',
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  saveBadgeText: { fontSize: 10, fontWeight: '700', color: colors.success },

  // Step 2 — Package cards
  packageCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  packageCardSelected: { borderColor: colors.accent },
  recommendedBadge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    top: 0,
    right: 0,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderBottomLeftRadius: radius.sm,
  },
  recommendedBadgeText: { fontSize: 11, fontWeight: '700', color: colors.white },
  packageCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  packageName: { fontSize: 17, fontWeight: '800', color: colors.primary },
  packagePrice: { fontSize: 16, fontWeight: '700', color: colors.accent },
  packagePricePer: { fontSize: 12, fontWeight: '400', color: colors.textSecondary },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  benefitText: { fontSize: 13, color: colors.textSecondary },

  // Step 3 — New cafe preview
  newCafePreview: { alignItems: 'center', marginBottom: spacing.md },
  newCafeCard: {
    width: '85%',
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: '#E07060',
    backgroundColor: colors.white,
    padding: spacing.md,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#E07060',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  newCafeBadge: {
    backgroundColor: '#E07060',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginBottom: spacing.sm,
  },
  newCafeBadgeText: { fontSize: 11, fontWeight: '800', color: colors.white, letterSpacing: 1 },
  newCafeName: { fontSize: 18, fontWeight: '800', color: colors.primary, marginBottom: 4 },
  newCafeTagline: { fontSize: 13, color: colors.textSecondary },
  previewCaption: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.md,
  },

  // Step 3 — Form
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 14,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  textInputMulti: {
    height: 100,
    paddingTop: spacing.sm + 2,
  },

  // Chips
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.white,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '10',
  },
  chipText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: colors.accent, fontWeight: '700' },

  // Photo upload
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.accent + '60',
    borderStyle: 'dashed',
    paddingVertical: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  uploadBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  uploadBtnText: { fontSize: 14, fontWeight: '600', color: colors.accent },
  photoPreviewContainer: { marginBottom: spacing.md },
  photoPreview: {
    width: '100%',
    height: 160,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.xs,
  },
  removePhotoBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.error + '15',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  removePhotoBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  removePhotoBtnText: { fontSize: 13, fontWeight: '600', color: colors.white },

  // Step 4 — Summary card
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
  },
  summaryColRow: {
    paddingVertical: spacing.xs + 2,
  },
  summaryLabel: { fontSize: 13, color: colors.textSecondary },
  summaryValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: 14, fontWeight: '600', color: colors.primary },
  summaryDescText: { fontSize: 13, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
  summarySeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.surface,
    marginVertical: 2,
  },
  totalLabel: { fontSize: 15, fontWeight: '800', color: colors.primary },
  totalValue: { fontSize: 17, fontWeight: '800', color: colors.accent },

  // Approval note
  approvalNote: {
    backgroundColor: colors.accent + '12',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  approvalNoteText: { fontSize: 13, color: colors.primary, lineHeight: 18 },

  // Nav row
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  navBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backBtn: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.surface,
    backgroundColor: colors.white,
  },
  backBtnText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  nextBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  nextBtnDisabled: { backgroundColor: colors.surface },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
  nextBtnTextDisabled: { color: colors.textSecondary },
  submitBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },

  // Success screen
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl,
  },
  successIconLead: { marginBottom: spacing.lg },
  successTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  successMsg: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  doneBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
  },
  doneBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },
});
