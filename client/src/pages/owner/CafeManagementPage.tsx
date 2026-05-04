import { useState, useEffect, type FormEvent } from 'react';
import { ownerApi } from '../../api/owner.api';
import type { Cafe } from '../../types';

type Mode = 'view' | 'edit' | 'create';

interface FormState {
  name: string;
  address: string;
  phone: string;
  description: string;
  wifiAvailable: boolean;
  wifiSpeedMbps: string;
  hasMushola: boolean;
  priceRange: string;
  latitude: string;
  longitude: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  address: '',
  phone: '',
  description: '',
  wifiAvailable: false,
  wifiSpeedMbps: '',
  hasMushola: false,
  priceRange: '$$',
  latitude: '',
  longitude: '',
};

// Live thousand-separator formatting for price inputs. State stores raw
// digits ("25000") so BE receives a clean number; display shows "25.000".
const formatRupiah = (digits: string) => (digits ? Number(digits).toLocaleString('id-ID') : '');
const parseRupiah = (formatted: string) => formatted.replace(/[^\d]/g, '');

function cafeToForm(cafe: Cafe): FormState {
  return {
    name: cafe.name || '',
    address: cafe.address || '',
    phone: cafe.phone || '',
    description: cafe.description || '',
    wifiAvailable: cafe.wifiAvailable || false,
    wifiSpeedMbps: cafe.wifiSpeedMbps?.toString() || '',
    hasMushola: cafe.hasMushola || false,
    priceRange: cafe.priceRange || '$$',
    latitude: cafe.latitude?.toString() || '',
    longitude: cafe.longitude?.toString() || '',
  };
}

export default function CafeManagementPage() {
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [mode, setMode] = useState<Mode>('view');

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Menu state
  const [menus, setMenus] = useState<
    { category: string; itemName: string; price: string; description: string }[]
  >([]);
  const [editingMenu, setEditingMenu] = useState(false);
  const [menuBackup, setMenuBackup] = useState<typeof menus>([]);

  useEffect(() => {
    ownerApi
      .getCafe()
      .then((res) => {
        if (res.data) {
          setCafe(res.data);
          setForm(cafeToForm(res.data));
          setMenus(
            (res.data.menus || []).map((m) => ({
              category: m.category,
              itemName: m.itemName,
              price: m.price.toString(),
              description: m.description || '',
            })),
          );
          setMode('view');
        } else {
          setMode('create');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof FormState, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const startEdit = () => {
    if (cafe) setForm(cafeToForm(cafe));
    setMode('edit');
    setMessage(null);
  };

  const cancelEdit = () => {
    if (cafe) setForm(cafeToForm(cafe));
    setMode('view');
    setMessage(null);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const data: any = { ...form };
      if (data.wifiSpeedMbps) data.wifiSpeedMbps = Number(data.wifiSpeedMbps);
      else delete data.wifiSpeedMbps;
      if (data.latitude) data.latitude = Number(data.latitude);
      else delete data.latitude;
      if (data.longitude) data.longitude = Number(data.longitude);
      else delete data.longitude;

      if (mode === 'create') {
        const res = await ownerApi.createCafe(data);
        setCafe(res.data);
        setMode('view');
        setMessage({ type: 'success', text: 'Cafe registered successfully!' });
      } else {
        const res = await ownerApi.updateCafe(data);
        setCafe(res.data);
        setMode('view');
        setMessage({ type: 'success', text: 'Cafe updated successfully!' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const startMenuEdit = () => {
    setMenuBackup(menus.map((m) => ({ ...m })));
    setEditingMenu(true);
    setMessage(null);
    // First-time add: drop user straight into a blank row instead of an
    // empty list with just a "+ Add Item" button (less hunting).
    if (menus.length === 0) {
      setMenus([{ category: 'Coffee', itemName: '', price: '', description: '' }]);
    }
  };

  const cancelMenuEdit = () => {
    setMenus(menuBackup);
    setEditingMenu(false);
    setMessage(null);
  };

  const handleSaveMenus = async () => {
    setSaving(true);
    try {
      await ownerApi.updateMenus(
        menus.map((m) => ({
          category: m.category,
          itemName: m.itemName,
          price: Number(m.price),
          description: m.description || undefined,
        })),
      );
      setEditingMenu(false);
      setMessage({ type: 'success', text: 'Menu updated successfully!' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save menu' });
    } finally {
      setSaving(false);
    }
  };

  const addMenuItem = () => {
    setMenus([...menus, { category: 'Coffee', itemName: '', price: '', description: '' }]);
  };

  const removeMenuItem = (index: number) => {
    setMenus(menus.filter((_, i) => i !== index));
  };

  const updateMenu = (index: number, key: string, value: string) => {
    setMenus(menus.map((m, i) => (i === index ? { ...m, [key]: value } : m)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#D48B3A] border-t-transparent" />
      </div>
    );
  }

  const editing = mode === 'edit' || mode === 'create';

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#1C1C1A]">
            {mode === 'create' ? 'Register Your Cafe' : 'My Cafe'}
          </h1>
          <p className="text-sm text-[#8A8880] mt-1">
            {mode === 'create'
              ? 'Fill in the basics — you can update photos and menu later.'
              : 'Update your cafe information and menu.'}
          </p>
        </div>
        {mode === 'view' && cafe && (
          <button
            type="button"
            onClick={startEdit}
            className="self-start sm:self-auto px-4 py-2 bg-[#1C1C1A] text-white rounded-xl font-bold text-sm hover:bg-black transition-colors"
          >
            ✏️ Edit Info
          </button>
        )}
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-xl text-sm border ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border-green-100'
              : 'bg-red-50 text-red-600 border-red-100'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ── Cafe info card ─────────────────────────────────── */}
      {!editing && cafe ? (
        <CafeSummary cafe={cafe} onEdit={startEdit} />
      ) : (
        <form
          onSubmit={handleSave}
          className="bg-white rounded-2xl shadow-sm border border-[#F0EDE8] p-4 sm:p-6 mb-5"
        >
          <SectionHeader>Basic Information</SectionHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Cafe Name" required>
              <TextInput
                value={form.name}
                onChange={(v) => set('name', v)}
                placeholder="e.g. Kopi Kenangan Sudirman"
                required
                minLength={2}
              />
            </Field>
            <Field label="Phone">
              <TextInput
                value={form.phone}
                onChange={(v) => set('phone', v.replace(/[^\d+\s\-()]/g, ''))}
                placeholder="+62 812 3456 7890"
                inputMode="tel"
                autoComplete="tel"
                maxLength={20}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Address" required>
                <TextInput
                  value={form.address}
                  onChange={(v) => set('address', v)}
                  placeholder="Full street address"
                  required
                  minLength={5}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Description">
                <textarea
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  rows={3}
                  placeholder="Tell customers what makes your cafe special…"
                  className="w-full px-4 py-3 bg-[#F0EDE8] rounded-xl text-[15px] text-[#1C1C1A] placeholder:text-[#8A8880] focus:bg-white focus:ring-2 focus:ring-[#D48B3A]/30 outline-none border-none resize-none transition-all"
                />
              </Field>
            </div>
            <Field label="Latitude" hint="-90 to 90">
              <TextInput
                value={form.latitude}
                onChange={(v) => set('latitude', v.replace(/[^\d.-]/g, ''))}
                placeholder="-6.9175"
                inputMode="decimal"
              />
            </Field>
            <Field label="Longitude" hint="-180 to 180">
              <TextInput
                value={form.longitude}
                onChange={(v) => set('longitude', v.replace(/[^\d.-]/g, ''))}
                placeholder="107.6191"
                inputMode="decimal"
              />
            </Field>
          </div>

          <SectionHeader className="mt-6">Facilities</SectionHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Toggle
              label="WiFi Available"
              checked={form.wifiAvailable}
              onChange={(v) => set('wifiAvailable', v)}
            />
            {form.wifiAvailable && (
              <Field label="WiFi Speed (Mbps)">
                <TextInput
                  value={form.wifiSpeedMbps}
                  onChange={(v) => set('wifiSpeedMbps', v.replace(/[^\d]/g, ''))}
                  placeholder="50"
                  inputMode="numeric"
                  maxLength={4}
                />
              </Field>
            )}
            <Toggle
              label="Mushola Available"
              checked={form.hasMushola}
              onChange={(v) => set('hasMushola', v)}
            />
            <Field label="Price Range">
              <select
                value={form.priceRange}
                onChange={(e) => set('priceRange', e.target.value)}
                className="w-full px-4 py-3 bg-[#F0EDE8] rounded-xl text-[15px] text-[#1C1C1A] focus:bg-white focus:ring-2 focus:ring-[#D48B3A]/30 outline-none border-none transition-all"
              >
                <option value="$">$ (Budget)</option>
                <option value="$$">$$ (Moderate)</option>
                <option value="$$$">$$$ (Premium)</option>
              </select>
            </Field>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
            {mode === 'edit' && (
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className="w-full sm:w-auto px-6 py-3 bg-[#F0EDE8] text-[#1C1C1A] rounded-xl font-bold text-sm hover:bg-[#E8E4DD] disabled:opacity-60 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto sm:ml-auto px-6 py-3 bg-[#1C1C1A] text-white rounded-xl font-bold text-sm hover:bg-black disabled:opacity-60 transition-colors"
            >
              {saving ? 'Saving…' : mode === 'create' ? 'Register Cafe' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

      {/* ── Menu management ─────────────────────────────────── */}
      {cafe && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#F0EDE8] p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <SectionHeader className="!mt-0 !mb-0">Menu Items</SectionHeader>
            {!editingMenu ? (
              <button
                type="button"
                onClick={startMenuEdit}
                className="px-3 py-1.5 bg-[#1C1C1A] text-white rounded-lg text-xs font-bold hover:bg-black transition-colors"
              >
                ✏️ {menus.length === 0 ? 'Add Menu' : 'Edit Menu'}
              </button>
            ) : (
              <button
                type="button"
                onClick={addMenuItem}
                className="text-sm font-semibold text-[#D48B3A] hover:underline"
              >
                + Add Item
              </button>
            )}
          </div>

          {/* View mode */}
          {!editingMenu && (
            menus.length === 0 ? (
              <p className="text-[#8A8880] text-sm py-3">
                No menu items yet. Click "Add Menu" to start.
              </p>
            ) : (
              <MenuList items={menus} />
            )
          )}

          {/* Edit mode */}
          {editingMenu && (
            <>
              {menus.length === 0 ? (
                <p className="text-[#8A8880] text-sm py-3">
                  No menu items yet. Click "+ Add Item" to start.
                </p>
              ) : (
                <div className="space-y-3">
                  {menus.map((item, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-[#F0EDE8] p-3 grid grid-cols-12 gap-2 items-end"
                    >
                      <div className="col-span-12 sm:col-span-3">
                        <SmallLabel>Category</SmallLabel>
                        <SmallInput
                          placeholder="Coffee"
                          value={item.category}
                          onChange={(v) => updateMenu(i, 'category', v)}
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-4">
                        <SmallLabel>Item Name</SmallLabel>
                        <SmallInput
                          placeholder="Es Kopi Susu"
                          value={item.itemName}
                          onChange={(v) => updateMenu(i, 'itemName', v)}
                        />
                      </div>
                      <div className="col-span-6 sm:col-span-2">
                        <SmallLabel>Price (Rp)</SmallLabel>
                        <SmallInput
                          placeholder="25.000"
                          value={formatRupiah(item.price)}
                          onChange={(v) => updateMenu(i, 'price', parseRupiah(v))}
                          inputMode="numeric"
                        />
                      </div>
                      <div className="col-span-6 sm:col-span-2">
                        <SmallLabel>Note</SmallLabel>
                        <SmallInput
                          placeholder="Optional"
                          value={item.description}
                          onChange={(v) => updateMenu(i, 'description', v)}
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-1 flex sm:justify-end">
                        <button
                          type="button"
                          onClick={() => removeMenuItem(i)}
                          className="w-full sm:w-auto px-3 py-2 text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label="Remove menu item"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-col-reverse sm:flex-row gap-3 mt-4">
                <button
                  type="button"
                  onClick={cancelMenuEdit}
                  disabled={saving}
                  className="w-full sm:w-auto px-6 py-3 bg-[#F0EDE8] text-[#1C1C1A] rounded-xl font-bold text-sm hover:bg-[#E8E4DD] disabled:opacity-60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveMenus}
                  disabled={saving}
                  className="w-full sm:w-auto sm:ml-auto px-6 py-3 bg-[#D48B3A] text-white rounded-xl font-bold text-sm hover:bg-[#b87528] disabled:opacity-60 transition-colors"
                >
                  {saving ? 'Saving…' : 'Save Menu'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Read-only summary card ──────────────────────────────────

function CafeSummary({ cafe, onEdit }: { cafe: Cafe; onEdit: () => void }) {
  const chips: string[] = [];
  if (cafe.priceRange) chips.push(`💰 ${cafe.priceRange}`);
  if (cafe.wifiAvailable) chips.push(`📶 WiFi${cafe.wifiSpeedMbps ? ` ${cafe.wifiSpeedMbps}Mbps` : ''}`);
  if (cafe.hasMushola) chips.push('🕌 Mushola');
  if (cafe.hasParking) chips.push('🅿️ Parking');
  if (cafe.latitude != null && cafe.longitude != null) {
    chips.push(`📍 ${Number(cafe.latitude).toFixed(4)}, ${Number(cafe.longitude).toFixed(4)}`);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#F0EDE8] p-4 sm:p-5 mb-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg sm:text-xl font-bold text-[#1C1C1A] truncate">{cafe.name}</h2>
          <p className="text-sm text-[#8A8880] mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
            <span className="inline-flex items-center gap-1 min-w-0">
              <span>📍</span>
              <span className="truncate">{cafe.address || '—'}</span>
            </span>
            {cafe.phone && (
              <span className="inline-flex items-center gap-1">
                <span>📞</span>
                <span>{cafe.phone}</span>
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 px-3 py-1.5 bg-[#1C1C1A] text-white rounded-lg text-xs font-bold hover:bg-black transition-colors"
        >
          ✏️ Edit
        </button>
      </div>

      {cafe.description && (
        <p className="text-sm text-[#1C1C1A] leading-relaxed mt-2">{cafe.description}</p>
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {chips.map((chip) => (
            <span
              key={chip}
              className="bg-[#FDF6EC] text-[#1C1C1A] text-[11px] font-semibold rounded-full px-2.5 py-1 border border-[#D48B3A]/20"
            >
              {chip}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Read-only menu list ─────────────────────────────────────

function MenuList({
  items,
}: {
  items: { category: string; itemName: string; price: string; description: string }[];
}) {
  // Group by category
  const grouped = items.reduce<Record<string, typeof items>>((acc, m) => {
    (acc[m.category] = acc[m.category] || []).push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, list]) => (
        <div key={category}>
          <p className="text-[11px] font-bold text-[#D48B3A] uppercase tracking-wider mb-2">
            {category}
          </p>
          <div className="divide-y divide-[#F0EDE8]">
            {list.map((m, i) => (
              <div key={i} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#1C1C1A]">{m.itemName}</p>
                  {m.description && (
                    <p className="text-xs text-[#8A8880] mt-0.5">{m.description}</p>
                  )}
                </div>
                <p className="shrink-0 text-sm font-bold text-[#1C1C1A]">
                  Rp {Number(m.price || 0).toLocaleString('id-ID')}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Reusable bits ────────────────────────────────────────────

function SectionHeader({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`text-[13px] font-bold text-[#8A8880] uppercase tracking-[0.08em] mb-3 ${className}`}
    >
      {children}
    </h2>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[13px] font-semibold text-[#1C1C1A] mb-1">
        {label} {required && <span className="text-red-500">*</span>}
        {hint && <span className="ml-2 text-[11px] font-normal text-[#8A8880]">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  required,
  minLength,
  maxLength,
  inputMode,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  inputMode?: 'text' | 'tel' | 'email' | 'numeric' | 'decimal' | 'search' | 'url';
  autoComplete?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      minLength={minLength}
      maxLength={maxLength}
      inputMode={inputMode}
      autoComplete={autoComplete}
      className="w-full px-4 py-3 bg-[#F0EDE8] rounded-xl text-[15px] text-[#1C1C1A] placeholder:text-[#8A8880] focus:bg-white focus:ring-2 focus:ring-[#D48B3A]/30 outline-none border-none transition-all"
    />
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 px-4 py-3 bg-[#F0EDE8] rounded-xl cursor-pointer hover:bg-[#E8E4DD] transition-colors">
      <span className="text-sm font-semibold text-[#1C1C1A]">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 accent-[#D48B3A] rounded"
      />
    </label>
  );
}

function SmallLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold text-[#8A8880] mb-1 uppercase tracking-wider">
      {children}
    </label>
  );
}

function SmallInput({
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: 'text' | 'tel' | 'email' | 'numeric' | 'decimal';
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      className="w-full px-3 py-2 text-sm bg-[#FAF9F6] rounded-lg text-[#1C1C1A] placeholder:text-[#8A8880] focus:bg-white focus:ring-2 focus:ring-[#D48B3A]/30 outline-none border border-[#F0EDE8] transition-all"
    />
  );
}
