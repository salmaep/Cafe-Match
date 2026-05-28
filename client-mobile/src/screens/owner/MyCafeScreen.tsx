import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
  FlatList,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchOwnerCafe } from '../../services/api';
import api from '../../services/api';
import { colors, spacing, radius } from '../../theme';
import { Pencil, Star, MapPin, Trash2, X } from 'lucide-react-native';
import Toast from '../../components/Toast';

const { width } = Dimensions.get('window');

const FACILITY_KEYS = [
  { key: 'wifi', label: 'WiFi', icon: '📶' },
  { key: 'power_outlet', label: 'Stop Kontak', icon: '🔌' },
  { key: 'mushola', label: 'Mushola', icon: '🕌' },
  { key: 'parking', label: 'Parkir', icon: '🅿️' },
  { key: 'kid_friendly', label: 'Ramah Anak', icon: '👶' },
  { key: 'quiet_atmosphere', label: 'Suasana Tenang', icon: '🤫' },
  { key: 'large_tables', label: 'Meja Besar', icon: '🪑' },
  { key: 'outdoor_area', label: 'Area Outdoor', icon: '🌿' },
];

const PRICE_OPTIONS = ['$', '$$', '$$$'];
const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

const MOCK_OWNER_CAFE = {
  id: 1,
  name: 'My Coffee House',
  address: 'Jl. Sudirman No. 12, Jakarta Pusat',
  phone: '+62 812 3456 7890',
  description: 'A cozy coffee house in the heart of Jakarta with specialty brews and comfortable seating.',
  photos: [
    { id: 1, url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800', displayOrder: 0, isPrimary: true },
    { id: 2, url: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=800', displayOrder: 1, isPrimary: false },
    { id: 3, url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800', displayOrder: 2, isPrimary: false },
  ],
  features: [
    { name: 'wifi', category: 'amenity' },
    { name: 'power_outlet', category: 'amenity' },
    { name: 'parking', category: 'amenity' },
    { name: 'quiet_atmosphere', category: 'ambience' },
  ],
  menus: [
    { id: 1, category: 'Coffee', itemName: 'Americano', price: 28000, isAvailable: true },
    { id: 2, category: 'Coffee', itemName: 'Latte', price: 35000, isAvailable: true },
    { id: 3, category: 'Coffee', itemName: 'Cold Brew', price: 38000, isAvailable: true },
    { id: 4, category: 'Non-Coffee', itemName: 'Matcha Latte', price: 40000, isAvailable: true },
    { id: 5, category: 'Snacks', itemName: 'Croissant', price: 25000, isAvailable: true },
    { id: 6, category: 'Snacks', itemName: 'Banana Bread', price: 22000, isAvailable: false },
  ],
  priceRange: '$$',
  favoritesCount: 156,
  bookmarksCount: 89,
};

interface MenuItemForm {
  id?: number;
  category: string;
  itemName: string;
  price: string;
  description: string;
  isAvailable: boolean;
}

export default function MyCafeScreen() {
  const [cafe, setCafe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Editable fields
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [priceRange, setPriceRange] = useState<string>('$$');
  const [activeFacilities, setActiveFacilities] = useState<Set<string>>(new Set());
  const [photos, setPhotos] = useState<any[]>([]);
  const [menus, setMenus] = useState<any[]>([]);

  // Menu modal
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuItemForm>({
    category: '', itemName: '', price: '', description: '', isAvailable: true,
  });
  const [editingMenuId, setEditingMenuId] = useState<number | null>(null);

  // Toast
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
  };

  useEffect(() => {
    loadCafe();
  }, []);

  const loadCafe = async () => {
    let base: any = null;
    try {
      base = await fetchOwnerCafe();
    } catch {
      base = MOCK_OWNER_CAFE;
    }
    // Merge with any local AsyncStorage override
    try {
      const overrideRaw = await AsyncStorage.getItem(`owner_cafe_override_${base?.id ?? 'default'}`);
      if (overrideRaw) {
        const override = JSON.parse(overrideRaw);
        base = { ...base, ...override };
      }
    } catch {
      // ignore
    }
    setCafe(base);
    populateFields(base);
    setLoading(false);
  };

  const populateFields = (data: any) => {
    setName(data.name || '');
    setAddress(data.address || '');
    setPhone(data.phone || '');
    setDescription(data.description || '');
    setLatitude(data.latitude != null ? String(data.latitude) : '');
    setLongitude(data.longitude != null ? String(data.longitude) : '');
    setPriceRange(data.priceRange || '$$');
    setPhotos(data.photos || []);
    setMenus(data.menus || []);
    // Build feature set from cafe.features (rich) or feature names array.
    const facSet = new Set<string>(
      (data.features ?? data.facilities ?? []).map((f: any) =>
        typeof f === 'string' ? f : f?.name ?? f?.facilityKey,
      ).filter(Boolean),
    );
    setActiveFacilities(facSet);
  };

  const handleSave = async () => {
    if (!name.trim() || !address.trim()) {
      Alert.alert('Error', 'Nama sama alamat wajib diisi');
      return;
    }
    setSaving(true);

    const featuresPayload = Array.from(activeFacilities).map((name) => ({ name }));

    // Parse + validate coordinates (optional — only sent if both filled)
    const latNum = latitude.trim() ? Number(latitude) : null;
    const lngNum = longitude.trim() ? Number(longitude) : null;
    if (latNum !== null && (isNaN(latNum) || latNum < -90 || latNum > 90)) {
      Alert.alert('Error', 'Latitude harus antara -90 dan 90');
      setSaving(false);
      return;
    }
    if (lngNum !== null && (isNaN(lngNum) || lngNum < -180 || lngNum > 180)) {
      Alert.alert('Error', 'Longitude harus antara -180 dan 180');
      setSaving(false);
      return;
    }

    const payload: any = {
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim() || undefined,
      description: description.trim() || undefined,
      priceRange,
      features: featuresPayload,
    };
    if (latNum !== null && lngNum !== null) {
      payload.latitude = latNum;
      payload.longitude = lngNum;
    }

    const applyLocalUpdate = () => {
      // Merge payload into local cafe state so the read-only view re-renders
      const updated = { ...cafe, ...payload, features: featuresPayload };
      setCafe(updated);
      setEditMode(false);
    };

    // Try PATCH /cafes/:id first (preferred), fall back to /owner/cafe
    let saved = false;
    try {
      if (cafe?.id) {
        await api.patch(`/cafes/${cafe.id}`, payload);
      } else {
        await api.patch(`/owner/cafe`, payload);
      }
      saved = true;
    } catch {
      try {
        await api.patch(`/owner/cafe`, payload);
        saved = true;
      } catch {
        // Fall through to local save
      }
    }

    if (saved) {
      applyLocalUpdate();
      showToast('Cafe berhasil diupdate');
    } else {
      // Save locally as override
      try {
        await AsyncStorage.setItem(
          `owner_cafe_override_${cafe?.id ?? 'default'}`,
          JSON.stringify(payload),
        );
      } catch {
        // ignore
      }
      applyLocalUpdate();
      showToast('Perubahan disimpan lokal');
    }

    setSaving(false);
  };

  const toggleFacility = (key: string) => {
    setActiveFacilities((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleAddPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      try {
        const formData = new FormData();
        formData.append('photo', { uri, name: 'photo.jpg', type: 'image/jpeg' } as any);
        formData.append('cafeId', String(cafe?.id));
        const { data } = await api.post('/photos', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setPhotos((prev) => [...prev, data]);
      } catch {
        // Add locally as preview even if upload fails
        setPhotos((prev) => [
          ...prev,
          { id: Date.now(), url: uri, displayOrder: prev.length, isPrimary: false },
        ]);
      }
    }
  };

  const handleDeletePhoto = (photoId: number) => {
    Alert.alert('Hapus Foto', 'Hapus foto ini dari cafe kamu?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/photos/${photoId}`);
          } catch {}
          setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        },
      },
    ]);
  };

  const handleSetPrimary = async (photoId: number) => {
    try {
      await api.patch(`/photos/${photoId}/set-primary`, {});
    } catch {}
    setPhotos((prev) =>
      prev.map((p) => ({ ...p, isPrimary: p.id === photoId })),
    );
  };

  // Menu CRUD
  const openAddMenu = () => {
    setEditingMenu({ category: '', itemName: '', price: '', description: '', isAvailable: true });
    setEditingMenuId(null);
    setMenuModalVisible(true);
  };

  const openEditMenu = (item: any) => {
    setEditingMenu({
      id: item.id,
      category: item.category,
      itemName: item.itemName,
      price: String(item.price),
      description: item.description || '',
      isAvailable: item.isAvailable !== false,
    });
    setEditingMenuId(item.id);
    setMenuModalVisible(true);
  };

  const handleSaveMenu = async () => {
    if (!editingMenu.category.trim() || !editingMenu.itemName.trim() || !editingMenu.price) {
      Alert.alert('Error', 'Kategori, nama, sama harga wajib diisi');
      return;
    }
    const payload = {
      category: editingMenu.category.trim(),
      itemName: editingMenu.itemName.trim(),
      price: Number(editingMenu.price),
      description: editingMenu.description.trim() || undefined,
      isAvailable: editingMenu.isAvailable,
      cafeId: cafe?.id,
    };
    let saved = false;
    try {
      if (editingMenuId) {
        await api.patch(`/menus/${editingMenuId}`, payload);
        setMenus((prev) =>
          prev.map((m) => (m.id === editingMenuId ? { ...m, ...payload, id: editingMenuId } : m)),
        );
      } else {
        const { data } = await api.post('/menus', payload);
        setMenus((prev) => [...prev, data]);
      }
      saved = true;
    } catch {
      const tempId = Date.now();
      if (editingMenuId) {
        setMenus((prev) =>
          prev.map((m) => (m.id === editingMenuId ? { ...m, ...payload } : m)),
        );
      } else {
        setMenus((prev) => [...prev, { ...payload, id: tempId }]);
      }
    }
    setMenuModalVisible(false);
    showToast(
      saved
        ? (editingMenuId ? 'Menu berhasil diupdate' : 'Menu berhasil ditambah')
        : 'Menu disimpan lokal',
    );
  };

  const handleDeleteMenu = (itemId: number) => {
    Alert.alert('Hapus Menu', 'Hapus menu ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          let ok = false;
          try {
            await api.delete(`/menus/${itemId}`);
            ok = true;
          } catch {}
          setMenus((prev) => prev.filter((m) => m.id !== itemId));
          showToast(ok ? 'Menu berhasil dihapus' : 'Dihapus lokal');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!cafe) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyText}>Belum ada cafe terdaftar</Text>
        <Text style={styles.emptyHint}>Hubungi support buat hubungin akun kamu</Text>
      </View>
    );
  }

  const formatPrice = (price: number) => 'Rp ' + Number(price).toLocaleString('id-ID');

  // Group menu by category
  const menuMap = new Map<string, any[]>();
  for (const item of menus) {
    const list = menuMap.get(item.category) || [];
    list.push(item);
    menuMap.set(item.category, list);
  }

  const sortedPhotos = [...photos].sort((a: any, b: any) => a.displayOrder - b.displayOrder);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Edit/Save Header */}
        <View style={styles.editHeader}>
          <Text style={styles.editHeaderTitle}>Cafe Aku</Text>
          {editMode ? (
            <View style={styles.editActions}>
              <TouchableOpacity
                onPress={() => { populateFields(cafe); setEditMode(false); }}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color={colors.white} />
                  : <Text style={styles.saveBtnText}>Simpan</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditMode(true)} style={[styles.editBtn, styles.editBtnRow]}>
              <Pencil size={14} color={colors.primary} strokeWidth={2.2} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Foto</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoStrip}
          >
            {sortedPhotos.map((photo: any) => (
              <TouchableOpacity
                key={photo.id}
                style={styles.photoWrapper}
                onLongPress={() => {
                  if (!editMode) return;
                  Alert.alert('Opsi Foto', '', [
                    { text: 'Jadiin Utama', onPress: () => handleSetPrimary(photo.id) },
                    { text: 'Hapus', style: 'destructive', onPress: () => handleDeletePhoto(photo.id) },
                    { text: 'Batal', style: 'cancel' },
                  ]);
                }}
                activeOpacity={editMode ? 0.7 : 1}
              >
                <Image source={{ uri: photo.url }} style={styles.photo} />
                {photo.isPrimary && (
                  <View style={[styles.primaryBadge, styles.primaryBadgeRow]}>
                    <Star size={10} color={colors.white} fill={colors.white} strokeWidth={0} />
                    <Text style={styles.primaryBadgeText}>Utama</Text>
                  </View>
                )}
                {editMode && (
                  <View style={styles.photoEditHint}>
                    <Text style={styles.photoEditHintText}>Tahan buat edit</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
            {editMode && (
              <TouchableOpacity style={styles.addPhotoBtn} onPress={handleAddPhoto}>
                <Text style={styles.addPhotoBtnIcon}>+</Text>
                <Text style={styles.addPhotoBtnText}>Tambah Foto</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Info Dasar</Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Nama</Text>
            <TextInput
              style={[styles.fieldInput, !editMode && styles.fieldInputReadonly]}
              value={name}
              onChangeText={setName}
              editable={editMode}
              placeholder="Nama cafe"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Alamat</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldTextArea, !editMode && styles.fieldInputReadonly]}
              value={address}
              onChangeText={setAddress}
              editable={editMode}
              multiline
              numberOfLines={2}
              placeholder="Alamat lengkap"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Telepon</Text>
            <TextInput
              style={[styles.fieldInput, !editMode && styles.fieldInputReadonly]}
              value={phone}
              onChangeText={setPhone}
              editable={editMode}
              keyboardType="phone-pad"
              placeholder="+62 812 ..."
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Deskripsi</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldTextArea, !editMode && styles.fieldInputReadonly]}
              value={description}
              onChangeText={setDescription}
              editable={editMode}
              multiline
              numberOfLines={3}
              placeholder="Jelasin cafe kamu..."
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Coordinates — required for map pin placement */}
          <Text style={[styles.fieldLabel, { marginTop: spacing.md, marginBottom: spacing.xs }]}>
            📍 Koordinat Lokasi
          </Text>
          <Text style={styles.coordHint}>
            Dibutuhin biar cafe kamu muncul di peta. Tap "Pakai lokasi sekarang" buat isi otomatis.
          </Text>
          <View style={styles.coordRow}>
            <View style={styles.coordField}>
              <Text style={styles.fieldLabel}>Latitude</Text>
              <TextInput
                style={[styles.fieldInput, !editMode && styles.fieldInputReadonly]}
                value={latitude}
                onChangeText={setLatitude}
                editable={editMode}
                keyboardType="numeric"
                placeholder="-6.9175"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.coordField}>
              <Text style={styles.fieldLabel}>Longitude</Text>
              <TextInput
                style={[styles.fieldInput, !editMode && styles.fieldInputReadonly]}
                value={longitude}
                onChangeText={setLongitude}
                editable={editMode}
                keyboardType="numeric"
                placeholder="107.6191"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>
          {editMode && (
            <TouchableOpacity
              style={styles.useLocationBtn}
              onPress={async () => {
                try {
                  const Location = await import('expo-location');
                  const { status } = await Location.requestForegroundPermissionsAsync();
                  if (status !== 'granted') {
                    Alert.alert('Izin Ditolak', 'Lokasi dibutuhin buat fitur ini');
                    return;
                  }
                  const loc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                  });
                  setLatitude(String(loc.coords.latitude));
                  setLongitude(String(loc.coords.longitude));
                  showToast('Lokasi sekarang udah terisi');
                } catch (err: any) {
                  Alert.alert('Error', 'Gagal ambil lokasi: ' + (err?.message || 'unknown'));
                }
              }}
            >
              <View style={styles.useLocationBtnRow}>
                <MapPin size={13} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={styles.useLocationBtnText}>Pakai lokasi sekarang</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Price Range */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Range Harga</Text>
          <View style={styles.priceRow}>
            {PRICE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.priceSeg,
                  priceRange === opt && styles.priceSegActive,
                  !editMode && styles.priceSegDisabled,
                ]}
                onPress={() => editMode && setPriceRange(opt)}
                disabled={!editMode}
              >
                <Text style={[styles.priceSegText, priceRange === opt && styles.priceSegTextActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Facilities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fasilitas</Text>
          <View style={styles.facilitiesGrid}>
            {FACILITY_KEYS.map(({ key, label, icon }) => {
              const isActive = activeFacilities.has(key);
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.facilityChip,
                    isActive && styles.facilityChipActive,
                    !editMode && styles.facilityChipDisabled,
                  ]}
                  onPress={() => editMode && toggleFacility(key)}
                  disabled={!editMode}
                >
                  <Text style={styles.facilityIcon}>{icon}</Text>
                  <Text style={[styles.facilityLabel, isActive && styles.facilityLabelActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Menu */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Menu</Text>
            {editMode && (
              <TouchableOpacity style={styles.addMenuBtn} onPress={openAddMenu}>
                <Text style={styles.addMenuBtnText}>+ Tambah Menu</Text>
              </TouchableOpacity>
            )}
          </View>

          {menus.length === 0 ? (
            <Text style={styles.emptySection}>Belum ada menu</Text>
          ) : (
            Array.from(menuMap.entries()).map(([category, items]) => (
              <View key={category} style={styles.menuCategory}>
                <Text style={styles.menuCategoryTitle}>{category}</Text>
                {items.map((item: any) => (
                  <View key={item.id} style={styles.menuItem}>
                    <View style={styles.menuItemLeft}>
                      <Text style={[styles.menuItemName, !item.isAvailable && styles.unavailableName]}>
                        {item.itemName}
                      </Text>
                      {!item.isAvailable && (
                        <View style={styles.unavailablePill}>
                          <Text style={styles.unavailableText}>Tidak Tersedia</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.menuItemPrice, !item.isAvailable && styles.unavailablePrice]}>
                      {formatPrice(item.price)}
                    </Text>
                    {editMode && (
                      <View style={styles.menuActions}>
                        <TouchableOpacity
                          onPress={() => openEditMenu(item)}
                          style={styles.menuActionBtn}
                        >
                          <Pencil size={14} color={colors.primary} strokeWidth={2} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteMenu(item.id)}
                          style={styles.menuActionBtn}
                        >
                          <Trash2 size={14} color="#E94B4B" strokeWidth={2} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ))
          )}
        </View>

        {/* Quick stats (read-only) */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{cafe.favoritesCount || 0}</Text>
            <Text style={styles.statLabel}>Favorit</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{cafe.bookmarksCount || 0}</Text>
            <Text style={styles.statLabel}>Disimpan</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.accent }]}>{priceRange}</Text>
            <Text style={styles.statLabel}>Range Harga</Text>
          </View>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>

      {/* Menu Item Modal */}
      <Modal
        visible={menuModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setMenuModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingMenuId ? 'Edit Menu' : 'Tambah Menu'}
            </Text>
            <TouchableOpacity onPress={() => setMenuModalVisible(false)} style={styles.modalClose}>
              <X size={18} color={colors.textSecondary} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalLabel}>Kategori</Text>
            <TextInput
              style={styles.modalInput}
              value={editingMenu.category}
              onChangeText={(t) => setEditingMenu((p) => ({ ...p, category: t }))}
              placeholder="contoh: Kopi, Snack, Makanan"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="words"
            />

            <Text style={styles.modalLabel}>Nama Menu</Text>
            <TextInput
              style={styles.modalInput}
              value={editingMenu.itemName}
              onChangeText={(t) => setEditingMenu((p) => ({ ...p, itemName: t }))}
              placeholder="contoh: Latte, Croissant"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="words"
            />

            <Text style={styles.modalLabel}>Harga (Rp)</Text>
            <TextInput
              style={styles.modalInput}
              value={editingMenu.price}
              onChangeText={(t) => setEditingMenu((p) => ({ ...p, price: t.replace(/[^0-9]/g, '') }))}
              placeholder="contoh: 35000"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />

            <Text style={styles.modalLabel}>Deskripsi (opsional)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={editingMenu.description}
              onChangeText={(t) => setEditingMenu((p) => ({ ...p, description: t }))}
              placeholder="Deskripsi singkat..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalToggleRow}>
              <Text style={styles.modalLabel}>Tersedia</Text>
              <Switch
                value={editingMenu.isAvailable}
                onValueChange={(v) => setEditingMenu((p) => ({ ...p, isAvailable: v }))}
                trackColor={{ false: colors.surface, true: colors.success + '60' }}
                thumbColor={editingMenu.isAvailable ? colors.success : colors.textSecondary}
              />
            </View>

            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveMenu}>
              <Text style={styles.modalSaveBtnText}>
                {editingMenuId ? 'Update Menu' : 'Tambah Menu'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Toast
        message={toastMsg}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.primary, textAlign: 'center' },
  emptyHint: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
  emptySection: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs },

  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface,
  },
  editHeaderTitle: { fontSize: 17, fontWeight: '700', color: colors.primary },
  editBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  editBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  editActions: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },

  section: {
    backgroundColor: colors.white,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  addMenuBtn: {
    backgroundColor: colors.accent + '18',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.accent + '40',
  },
  addMenuBtnText: { fontSize: 13, fontWeight: '600', color: colors.accent },

  // Photo strip
  photoStrip: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  photoWrapper: {
    position: 'relative',
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  photo: { width: 140, height: 100, resizeMode: 'cover', borderRadius: radius.md },
  primaryBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  primaryBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  primaryBadgeText: { fontSize: 10, fontWeight: '700', color: colors.white },
  photoEditHint: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  photoEditHintText: { fontSize: 9, color: colors.white },
  addPhotoBtn: {
    width: 100,
    height: 100,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.accent + '60',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.accent + '06',
  },
  addPhotoBtnIcon: { fontSize: 24, color: colors.accent },
  addPhotoBtnText: { fontSize: 11, color: colors.accent, fontWeight: '600', marginTop: 2 },

  // Fields
  fieldGroup: { marginBottom: spacing.sm },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
    color: colors.primary,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  fieldInputReadonly: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    paddingHorizontal: 0,
  },
  fieldTextArea: { minHeight: 72, textAlignVertical: 'top' },

  // Coordinates
  coordHint: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 15,
  },
  coordRow: { flexDirection: 'row', gap: spacing.sm },
  coordField: { flex: 1 },
  useLocationBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  useLocationBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  useLocationBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Price range
  priceRow: { flexDirection: 'row', gap: spacing.sm },
  priceSeg: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  priceSegActive: {
    backgroundColor: colors.accent + '18',
    borderColor: colors.accent,
  },
  priceSegDisabled: { opacity: 0.6 },
  priceSegText: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
  priceSegTextActive: { color: colors.accent },

  // Facilities
  facilitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  facilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    gap: 5,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  facilityChipActive: {
    backgroundColor: colors.accent + '18',
    borderColor: colors.accent + '40',
  },
  facilityChipDisabled: { opacity: 0.75 },
  facilityIcon: { fontSize: 15 },
  facilityLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  facilityLabelActive: { color: colors.accent, fontWeight: '600' },

  // Menu
  menuCategory: { marginBottom: spacing.md },
  menuCategoryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface,
  },
  menuItemLeft: { flex: 1, marginRight: spacing.sm },
  menuItemName: { fontSize: 14, color: colors.primary },
  unavailableName: { color: colors.textSecondary },
  unavailablePill: {
    backgroundColor: colors.error + '15',
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 1,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  unavailableText: { fontSize: 10, color: colors.error, fontWeight: '600' },
  menuItemPrice: { fontSize: 14, color: colors.accent, fontWeight: '700' },
  unavailablePrice: { color: colors.textSecondary + '80' },
  menuActions: { flexDirection: 'row', gap: spacing.xs, marginLeft: spacing.sm },
  menuActionBtn: { padding: 4 },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: colors.surface, alignSelf: 'center' },

  // Menu Modal
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.primary },
  modalClose: { padding: spacing.xs },
  modalBody: { padding: spacing.lg },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 6,
    marginTop: spacing.md,
  },
  modalInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.primary,
  },
  modalTextArea: { minHeight: 80, textAlignVertical: 'top' },
  modalToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  modalSaveBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  modalSaveBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
