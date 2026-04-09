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
import Toast from '../../components/Toast';

const { width } = Dimensions.get('window');

const FACILITY_KEYS = [
  { key: 'wifi', label: 'WiFi', icon: '📶' },
  { key: 'power_outlet', label: 'Power Outlet', icon: '🔌' },
  { key: 'mushola', label: 'Mushola', icon: '🕌' },
  { key: 'parking', label: 'Parking', icon: '🅿️' },
  { key: 'kid_friendly', label: 'Kid-Friendly', icon: '👶' },
  { key: 'quiet_atmosphere', label: 'Quiet Atmosphere', icon: '🤫' },
  { key: 'large_tables', label: 'Large Tables', icon: '🪑' },
  { key: 'outdoor_area', label: 'Outdoor Area', icon: '🌿' },
];

const PRICE_OPTIONS = ['$', '$$', '$$$'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
  facilities: [
    { facilityKey: 'wifi', facilityValue: '50 Mbps' },
    { facilityKey: 'power_outlet', facilityValue: null },
    { facilityKey: 'parking', facilityValue: null },
    { facilityKey: 'quiet_atmosphere', facilityValue: null },
  ],
  menus: [
    { id: 1, category: 'Coffee', itemName: 'Americano', price: 28000, isAvailable: true },
    { id: 2, category: 'Coffee', itemName: 'Latte', price: 35000, isAvailable: true },
    { id: 3, category: 'Coffee', itemName: 'Cold Brew', price: 38000, isAvailable: true },
    { id: 4, category: 'Non-Coffee', itemName: 'Matcha Latte', price: 40000, isAvailable: true },
    { id: 5, category: 'Snacks', itemName: 'Croissant', price: 25000, isAvailable: true },
    { id: 6, category: 'Snacks', itemName: 'Banana Bread', price: 22000, isAvailable: false },
  ],
  wifiAvailable: true,
  wifiSpeedMbps: 50,
  hasMushola: false,
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
  const [wifiAvailable, setWifiAvailable] = useState(false);
  const [wifiSpeed, setWifiSpeed] = useState('');
  const [hasMushola, setHasMushola] = useState(false);
  const [hasParking, setHasParking] = useState(false);
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
    setWifiAvailable(!!data.wifiAvailable);
    setWifiSpeed(data.wifiSpeedMbps ? String(data.wifiSpeedMbps) : '');
    setHasMushola(!!data.hasMushola);
    setPriceRange(data.priceRange || '$$');
    setPhotos(data.photos || []);
    setMenus(data.menus || []);
    const facSet = new Set<string>((data.facilities || []).map((f: any) => f.facilityKey));
    if (data.wifiAvailable) facSet.add('wifi');
    if (data.hasMushola) facSet.add('mushola');
    const parkingFac = (data.facilities || []).find((f: any) => f.facilityKey === 'parking');
    if (parkingFac) facSet.add('parking');
    setHasParking(facSet.has('parking'));
    setActiveFacilities(facSet);
  };

  const handleSave = async () => {
    if (!name.trim() || !address.trim()) {
      Alert.alert('Error', 'Name and address are required');
      return;
    }
    setSaving(true);

    const facilitiesPayload = Array.from(activeFacilities).map((key) => ({
      facilityKey: key,
      facilityValue: key === 'wifi' && wifiSpeed ? wifiSpeed + ' Mbps' : null,
    }));

    const payload = {
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim() || undefined,
      description: description.trim() || undefined,
      wifiAvailable,
      wifiSpeedMbps: wifiAvailable && wifiSpeed ? Number(wifiSpeed) : undefined,
      hasMushola,
      priceRange,
      facilities: facilitiesPayload,
    };

    const applyLocalUpdate = () => {
      // Merge payload into local cafe state so the read-only view re-renders
      const updated = { ...cafe, ...payload, facilities: facilitiesPayload };
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
      showToast('Cafe updated successfully');
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
      showToast('Changes saved locally');
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
    Alert.alert('Delete Photo', 'Remove this photo from your cafe?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
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
      Alert.alert('Error', 'Category, name, and price are required');
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
        ? (editingMenuId ? 'Menu item updated' : 'Menu item added')
        : 'Menu saved locally',
    );
  };

  const handleDeleteMenu = (itemId: number) => {
    Alert.alert('Delete Item', 'Remove this menu item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          let ok = false;
          try {
            await api.delete(`/menus/${itemId}`);
            ok = true;
          } catch {}
          setMenus((prev) => prev.filter((m) => m.id !== itemId));
          showToast(ok ? 'Menu item removed' : 'Removed locally');
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
        <Text style={styles.emptyText}>No cafe registered yet</Text>
        <Text style={styles.emptyHint}>Contact support to link your account</Text>
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
          <Text style={styles.editHeaderTitle}>My Cafe</Text>
          {editMode ? (
            <View style={styles.editActions}>
              <TouchableOpacity
                onPress={() => { populateFields(cafe); setEditMode(false); }}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color={colors.white} />
                  : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditMode(true)} style={styles.editBtn}>
              <Text style={styles.editBtnText}>✏️  Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
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
                  Alert.alert('Photo Options', '', [
                    { text: 'Set as Primary', onPress: () => handleSetPrimary(photo.id) },
                    { text: 'Delete', style: 'destructive', onPress: () => handleDeletePhoto(photo.id) },
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                }}
                activeOpacity={editMode ? 0.7 : 1}
              >
                <Image source={{ uri: photo.url }} style={styles.photo} />
                {photo.isPrimary && (
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>★ Primary</Text>
                  </View>
                )}
                {editMode && (
                  <View style={styles.photoEditHint}>
                    <Text style={styles.photoEditHintText}>Hold to edit</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
            {editMode && (
              <TouchableOpacity style={styles.addPhotoBtn} onPress={handleAddPhoto}>
                <Text style={styles.addPhotoBtnIcon}>+</Text>
                <Text style={styles.addPhotoBtnText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Info</Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={[styles.fieldInput, !editMode && styles.fieldInputReadonly]}
              value={name}
              onChangeText={setName}
              editable={editMode}
              placeholder="Cafe name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Address</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldTextArea, !editMode && styles.fieldInputReadonly]}
              value={address}
              onChangeText={setAddress}
              editable={editMode}
              multiline
              numberOfLines={2}
              placeholder="Full address"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Phone</Text>
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
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldTextArea, !editMode && styles.fieldInputReadonly]}
              value={description}
              onChangeText={setDescription}
              editable={editMode}
              multiline
              numberOfLines={3}
              placeholder="Describe your cafe..."
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>

        {/* Price Range */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Range</Text>
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
          <Text style={styles.sectionTitle}>Facilities</Text>
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
          {/* WiFi speed input */}
          {activeFacilities.has('wifi') && (
            <View style={[styles.fieldGroup, { marginTop: spacing.sm }]}>
              <Text style={styles.fieldLabel}>WiFi Speed (Mbps)</Text>
              <TextInput
                style={[styles.fieldInput, !editMode && styles.fieldInputReadonly]}
                value={wifiSpeed}
                onChangeText={setWifiSpeed}
                editable={editMode}
                keyboardType="numeric"
                placeholder="e.g. 50"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          )}
        </View>

        {/* Menu */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Menu</Text>
            {editMode && (
              <TouchableOpacity style={styles.addMenuBtn} onPress={openAddMenu}>
                <Text style={styles.addMenuBtnText}>+ Add Item</Text>
              </TouchableOpacity>
            )}
          </View>

          {menus.length === 0 ? (
            <Text style={styles.emptySection}>No menu items yet</Text>
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
                          <Text style={styles.unavailableText}>Unavailable</Text>
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
                          <Text style={styles.menuActionEdit}>✏️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteMenu(item.id)}
                          style={styles.menuActionBtn}
                        >
                          <Text style={styles.menuActionDelete}>🗑️</Text>
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
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{cafe.bookmarksCount || 0}</Text>
            <Text style={styles.statLabel}>Bookmarks</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.accent }]}>{priceRange}</Text>
            <Text style={styles.statLabel}>Price Range</Text>
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
              {editingMenuId ? 'Edit Menu Item' : 'Add Menu Item'}
            </Text>
            <TouchableOpacity onPress={() => setMenuModalVisible(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalLabel}>Category</Text>
            <TextInput
              style={styles.modalInput}
              value={editingMenu.category}
              onChangeText={(t) => setEditingMenu((p) => ({ ...p, category: t }))}
              placeholder="e.g. Coffee, Snacks, Food"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="words"
            />

            <Text style={styles.modalLabel}>Item Name</Text>
            <TextInput
              style={styles.modalInput}
              value={editingMenu.itemName}
              onChangeText={(t) => setEditingMenu((p) => ({ ...p, itemName: t }))}
              placeholder="e.g. Latte, Croissant"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="words"
            />

            <Text style={styles.modalLabel}>Price (Rp)</Text>
            <TextInput
              style={styles.modalInput}
              value={editingMenu.price}
              onChangeText={(t) => setEditingMenu((p) => ({ ...p, price: t.replace(/[^0-9]/g, '') }))}
              placeholder="e.g. 35000"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />

            <Text style={styles.modalLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={editingMenu.description}
              onChangeText={(t) => setEditingMenu((p) => ({ ...p, description: t }))}
              placeholder="Short description..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalToggleRow}>
              <Text style={styles.modalLabel}>Available</Text>
              <Switch
                value={editingMenu.isAvailable}
                onValueChange={(v) => setEditingMenu((p) => ({ ...p, isAvailable: v }))}
                trackColor={{ false: colors.surface, true: colors.success + '60' }}
                thumbColor={editingMenu.isAvailable ? colors.success : colors.textSecondary}
              />
            </View>

            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveMenu}>
              <Text style={styles.modalSaveBtnText}>
                {editingMenuId ? 'Update Item' : 'Add Item'}
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
  menuActionEdit: { fontSize: 16 },
  menuActionDelete: { fontSize: 16 },

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
  modalCloseText: { fontSize: 18, color: colors.textSecondary },
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
