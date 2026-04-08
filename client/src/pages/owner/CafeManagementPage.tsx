import { useState, useEffect, type FormEvent } from 'react';
import { ownerApi } from '../../api/owner.api';
import type { Cafe } from '../../types';

export default function CafeManagementPage() {
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<'view' | 'create'>('view');

  // Form state
  const [form, setForm] = useState({
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
  });

  // Menu state
  const [menus, setMenus] = useState<{ category: string; itemName: string; price: string; description: string }[]>([]);

  useEffect(() => {
    ownerApi.getCafe().then((res) => {
      if (res.data) {
        setCafe(res.data);
        setForm({
          name: res.data.name || '',
          address: res.data.address || '',
          phone: res.data.phone || '',
          description: res.data.description || '',
          wifiAvailable: res.data.wifiAvailable || false,
          wifiSpeedMbps: res.data.wifiSpeedMbps?.toString() || '',
          hasMushola: res.data.hasMushola || false,
          priceRange: res.data.priceRange || '$$',
          latitude: res.data.latitude?.toString() || '',
          longitude: res.data.longitude?.toString() || '',
        });
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
    }).finally(() => setLoading(false));
  }, []);

  const set = (key: string, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
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
        setMessage('Cafe registered successfully!');
      } else {
        const res = await ownerApi.updateCafe(data);
        setCafe(res.data);
        setMessage('Cafe updated successfully!');
      }
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
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
      setMessage('Menu updated successfully!');
    } catch {
      setMessage('Failed to save menu');
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
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {mode === 'create' ? 'Register Your Cafe' : 'My Cafe'}
      </h1>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {message}
        </div>
      )}

      {/* Cafe info form */}
      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Cafe Name" value={form.name} onChange={(v) => set('name', v)} required />
          <Field label="Phone" value={form.phone} onChange={(v) => set('phone', v)} />
          <div className="md:col-span-2">
            <Field label="Address" value={form.address} onChange={(v) => set('address', v)} required />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description} onChange={(e) => set('description', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
            />
          </div>
          <Field label="Latitude" value={form.latitude} onChange={(v) => set('latitude', v)} />
          <Field label="Longitude" value={form.longitude} onChange={(v) => set('longitude', v)} />
        </div>

        <h2 className="font-semibold text-gray-800 mt-6 mb-4">Facilities</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox" checked={form.wifiAvailable}
              onChange={(e) => set('wifiAvailable', e.target.checked)}
              className="rounded border-gray-300 text-amber-600"
            />
            WiFi Available
          </label>
          {form.wifiAvailable && (
            <Field label="WiFi Speed (Mbps)" value={form.wifiSpeedMbps} onChange={(v) => set('wifiSpeedMbps', v)} />
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox" checked={form.hasMushola}
              onChange={(e) => set('hasMushola', e.target.checked)}
              className="rounded border-gray-300 text-amber-600"
            />
            Mushola
          </label>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
            <select
              value={form.priceRange} onChange={(e) => set('priceRange', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
            >
              <option value="$">$ (Budget)</option>
              <option value="$$">$$ (Moderate)</option>
              <option value="$$$">$$$ (Premium)</option>
            </select>
          </div>
        </div>

        <button
          type="submit" disabled={saving}
          className="mt-6 px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : mode === 'create' ? 'Register Cafe' : 'Update Info'}
        </button>
      </form>

      {/* Menu management (only show if cafe exists) */}
      {cafe && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Menu Items</h2>
            <button
              onClick={addMenuItem}
              className="text-sm text-amber-600 hover:underline"
            >
              + Add Item
            </button>
          </div>
          {menus.length === 0 ? (
            <p className="text-gray-400 text-sm">No menu items yet.</p>
          ) : (
            <div className="space-y-3">
              {menus.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-3">
                    <input
                      placeholder="Category"
                      value={item.category}
                      onChange={(e) => updateMenu(i, 'category', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none"
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      placeholder="Item Name"
                      value={item.itemName}
                      onChange={(e) => updateMenu(i, 'itemName', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      placeholder="Price"
                      type="number"
                      value={item.price}
                      onChange={(e) => updateMenu(i, 'price', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      placeholder="Note"
                      value={item.description}
                      onChange={(e) => updateMenu(i, 'description', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none"
                    />
                  </div>
                  <div className="col-span-1">
                    <button
                      onClick={() => removeMenuItem(i)}
                      className="text-red-400 hover:text-red-600 text-sm"
                    >
                      x
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {menus.length > 0 && (
            <button
              onClick={handleSaveMenus} disabled={saving}
              className="mt-4 px-5 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Menu'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
      />
    </div>
  );
}
