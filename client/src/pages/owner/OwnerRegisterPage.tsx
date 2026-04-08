import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ownerApi } from '../../api/owner.api';

export default function OwnerRegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    cafeName: '',
    cafeAddress: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await ownerApi.registerOwner({
        name: form.name,
        email: form.email,
        password: form.password,
        cafeName: form.cafeName,
        cafeAddress: form.cafeAddress,
        phone: form.phone || undefined,
      });
      navigate('/owner/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg p-8 bg-white rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
          Owner Registration
        </h2>
        <p className="text-center text-sm text-gray-400 mb-6">
          Register your cafe on CafeMatch
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
              <input
                type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
                required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password" value={form.password} onChange={(e) => set('password', e.target.value)}
                required minLength={6} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password" value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)}
                required minLength={6}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none ${
                  form.confirmPassword && form.password !== form.confirmPassword ? 'border-red-400' : 'border-gray-300'
                }`}
              />
            </div>
          </div>

          <hr className="border-gray-200" />
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Cafe Information</p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cafe Name</label>
            <input
              type="text" value={form.cafeName} onChange={(e) => set('cafeName', e.target.value)}
              required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cafe Address</label>
            <input
              type="text" value={form.cafeAddress} onChange={(e) => set('cafeAddress', e.target.value)}
              required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
            <input
              type="text" value={form.phone} onChange={(e) => set('phone', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
          >
            {loading ? 'Registering...' : 'Register as Owner'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an owner account?{' '}
          <Link to="/owner/login" className="text-amber-600 hover:underline">Login</Link>
        </p>
        <p className="mt-2 text-center text-sm text-gray-400">
          <Link to="/" className="hover:underline">Back to CafeMatch</Link>
        </p>
      </div>
    </div>
  );
}
