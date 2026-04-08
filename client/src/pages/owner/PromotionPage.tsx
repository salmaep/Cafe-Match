import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { promotionsApi } from '../../api/promotions.api';
import { paymentsApi } from '../../api/payments.api';
import { openSnapPopup } from '../../utils/midtrans';
import type { AdvertisementPackage, Promotion, PromotionType } from '../../types/owner';

const TYPE_LABELS: Record<string, { name: string; description: string }> = {
  new_cafe: {
    name: 'New Cafe Highlight',
    description: 'Highlighted map pin to announce your cafe presence. Distinct color/size from regular pins.',
  },
  featured_promo: {
    name: 'Featured Promo',
    description: 'Appear in the "Featured Cafes" section with custom title, description, and photo.',
  },
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  pending_review: 'bg-yellow-50 text-yellow-700',
  pending_payment: 'bg-blue-50 text-blue-700',
  rejected: 'bg-red-50 text-red-700',
  expired: 'bg-gray-100 text-gray-500',
};

export default function PromotionPage() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<AdvertisementPackage[]>([]);
  const [myPromotions, setMyPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  // New promotion form
  const [selectedType, setSelectedType] = useState<PromotionType | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<number | null>(null);
  const [contentTitle, setContentTitle] = useState('');
  const [contentDescription, setContentDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([
      promotionsApi.getPackages(),
      promotionsApi.getMine(),
    ]).then(([pkgRes, promoRes]) => {
      setPackages(pkgRes.data);
      setMyPromotions(promoRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!selectedType || !selectedPkg) return;
    setCreating(true);
    try {
      const res = await promotionsApi.create({
        packageId: selectedPkg,
        type: selectedType,
        contentTitle: contentTitle || undefined,
        contentDescription: contentDescription || undefined,
      });

      // Immediately try to pay
      const payRes = await paymentsApi.createPayment(res.data.id);
      openSnapPopup(payRes.data.token, {
        onSuccess: () => navigate('/owner/payment/success'),
        onPending: () => navigate('/owner/payment/success'),
        onError: () => navigate('/owner/payment/failed'),
        onClose: () => {
          // Refresh promotions list
          promotionsApi.getMine().then((r) => setMyPromotions(r.data));
        },
      });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create promotion');
    } finally {
      setCreating(false);
    }
  };

  const handlePayExisting = async (promotionId: number) => {
    try {
      const payRes = await paymentsApi.createPayment(promotionId);
      openSnapPopup(payRes.data.token, {
        onSuccess: () => navigate('/owner/payment/success'),
        onPending: () => navigate('/owner/payment/success'),
        onError: () => navigate('/owner/payment/failed'),
      });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to initiate payment');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Promotion</h1>

      {/* Existing promotions */}
      {myPromotions.length > 0 && (
        <div className="mb-8">
          <h2 className="font-semibold text-gray-700 mb-3">Your Promotions</h2>
          <div className="space-y-3">
            {myPromotions.map((promo) => (
              <div
                key={promo.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[promo.status] || ''}`}>
                      {promo.status.replace('_', ' ')}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {TYPE_LABELS[promo.type]?.name || promo.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {promo.package?.name} — {promo.billingCycle}
                    {promo.expiresAt && ` — Expires: ${new Date(promo.expiresAt).toLocaleDateString()}`}
                  </p>
                  {promo.rejectionReason && (
                    <p className="text-xs text-red-500 mt-1">Reason: {promo.rejectionReason}</p>
                  )}
                </div>
                {promo.status === 'pending_payment' && (
                  <button
                    onClick={() => handlePayExisting(promo.id)}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700"
                  >
                    Pay Now
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New promotion */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Create New Promotion</h2>

        {/* Step 1: Choose type */}
        <p className="text-sm text-gray-500 mb-3">1. Choose promotion type</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {(['new_cafe', 'featured_promo'] as PromotionType[]).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`text-left p-4 rounded-xl border-2 transition-colors ${
                selectedType === type
                  ? 'border-amber-400 bg-amber-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <h3 className="font-medium text-gray-800">{TYPE_LABELS[type].name}</h3>
              <p className="text-xs text-gray-500 mt-1">{TYPE_LABELS[type].description}</p>
            </button>
          ))}
        </div>

        {/* Step 2: Choose package */}
        {selectedType && (
          <>
            <p className="text-sm text-gray-500 mb-3">2. Choose package</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPkg(pkg.id)}
                  className={`text-left p-4 rounded-xl border-2 transition-colors ${
                    selectedPkg === pkg.id
                      ? 'border-amber-400 bg-amber-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h3 className="font-medium text-gray-800">{pkg.name}</h3>
                  <p className="text-lg font-bold text-amber-700 mt-1">
                    Rp {Number(pkg.priceMonthly).toLocaleString()}
                    <span className="text-xs font-normal text-gray-400">/month</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{pkg.sessionFrequency}</p>
                  <ul className="mt-2 space-y-1">
                    {(pkg.benefits || []).map((b, i) => (
                      <li key={i} className="text-xs text-gray-500">- {b}</li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 3: Content (for featured_promo) */}
        {selectedType === 'featured_promo' && selectedPkg && (
          <>
            <p className="text-sm text-gray-500 mb-3">3. Promotion content</p>
            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={contentTitle}
                  onChange={(e) => setContentTitle(e.target.value)}
                  placeholder="e.g. Buy 1 Get 1 Latte every Friday"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={contentDescription}
                  onChange={(e) => setContentDescription(e.target.value)}
                  placeholder="Describe your promotion..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          </>
        )}

        {/* Submit */}
        {selectedType && selectedPkg && (
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
          >
            {creating ? 'Processing...' : 'Continue to Payment'}
          </button>
        )}
      </div>
    </div>
  );
}
