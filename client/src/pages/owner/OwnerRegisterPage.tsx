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
    if (!form.name || !form.email || !form.password || !form.cafeName || !form.cafeAddress) {
      setError('Please fill in all required fields');
      return;
    }
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

  const passwordMismatch =
    !!form.confirmPassword && form.password !== form.confirmPassword;

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex justify-center md:items-center px-4 md:px-6 py-6 md:py-12">
      <div className="w-full max-w-md md:max-w-lg md:bg-white md:rounded-2xl md:shadow-xl md:p-8 p-2">
        {/* Back */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex w-fit items-center gap-1.5 text-[#1C1C1A] font-medium text-[15px] mb-8 hover:text-[#D48B3A] transition-colors"
        >
          <span className="text-xl leading-none">←</span>
          <span>Back</span>
        </button>

        {/* Badge */}
        <span className="block w-fit bg-[#D48B3A]/20 border border-[#D48B3A]/40 text-[#D48B3A] text-xs font-bold tracking-wider uppercase rounded-full px-3 py-1 mb-2">
          Owner Portal
        </span>
        <h1 className="text-[28px] font-bold text-[#1C1C1A] leading-tight">
          Register Cafe
        </h1>
        <p className="text-[15px] text-[#8A8880] mt-1 mb-6">
          Create your owner account to start managing your cafe
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Owner Information */}
          <h3 className="text-[13px] font-bold text-[#8A8880] uppercase tracking-[0.08em] mb-2">
            Your Information
          </h3>
          <div className="space-y-1">
            <FieldLabel>Full Name *</FieldLabel>
            <Input
              value={form.name}
              onChange={(v) => set('name', v)}
              placeholder="Your full name"
              autoComplete="name"
              required
            />
            <FieldLabel>Email *</FieldLabel>
            <Input
              type="email"
              value={form.email}
              onChange={(v) => set('email', v)}
              placeholder="owner@mycafe.com"
              autoComplete="email"
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div>
                <FieldLabel>Password *</FieldLabel>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(v) => set('password', v)}
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>
              <div>
                <FieldLabel>Confirm Password *</FieldLabel>
                <Input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(v) => set('confirmPassword', v)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  invalid={passwordMismatch}
                />
                {passwordMismatch && (
                  <p className="text-xs text-red-500 mt-1 ml-1">
                    Passwords do not match
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Cafe Information */}
          <h3 className="text-[13px] font-bold text-[#8A8880] uppercase tracking-[0.08em] mt-6 mb-2">
            Cafe Information
          </h3>
          <div className="space-y-1">
            <FieldLabel>Cafe Name *</FieldLabel>
            <Input
              value={form.cafeName}
              onChange={(v) => set('cafeName', v)}
              placeholder="e.g. Kopi Kenangan Sudirman"
              required
            />
            <FieldLabel>Cafe Address *</FieldLabel>
            <textarea
              value={form.cafeAddress}
              onChange={(e) => set('cafeAddress', e.target.value)}
              placeholder="Full address of your cafe"
              rows={3}
              required
              className="w-full px-4 py-3 bg-[#F0EDE8] rounded-xl text-[15px] text-[#1C1C1A] placeholder:text-[#8A8880] focus:bg-white focus:ring-2 focus:ring-[#D48B3A]/30 outline-none border-none resize-none transition-all"
            />
            <FieldLabel>Phone Number</FieldLabel>
            <Input
              type="tel"
              value={form.phone}
              // Allow digits, spaces, hyphens, parentheses, and a leading "+"
              onChange={(v) => set('phone', v.replace(/[^\d+\s\-()]/g, ''))}
              placeholder="+62 812 3456 7890"
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-8 py-3 bg-[#1C1C1A] text-white rounded-xl font-bold text-base hover:bg-black disabled:opacity-60 transition-colors"
          >
            {loading ? 'Registering…' : 'Create Owner Account'}
          </button>
        </form>

        <div className="text-center text-sm text-[#8A8880] mt-5">
          Already have an owner account?{' '}
          <Link
            to="/owner/login"
            className="text-[#D48B3A] font-semibold hover:underline"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[13px] font-semibold text-[#1C1C1A] mt-2 mb-1">
      {children}
    </label>
  );
}

function Input({
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  minLength,
  maxLength,
  autoComplete,
  invalid,
  inputMode,
}: {
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  autoComplete?: string;
  invalid?: boolean;
  inputMode?: 'text' | 'tel' | 'email' | 'numeric' | 'decimal' | 'search' | 'url';
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      minLength={minLength}
      maxLength={maxLength}
      autoComplete={autoComplete}
      inputMode={inputMode}
      className={`w-full px-4 py-3 rounded-xl text-[15px] text-[#1C1C1A] placeholder:text-[#8A8880] outline-none transition-all ${
        invalid
          ? 'bg-red-50 ring-2 ring-red-300 focus:ring-red-400'
          : 'bg-[#F0EDE8] border-none focus:bg-white focus:ring-2 focus:ring-[#D48B3A]/30'
      }`}
    />
  );
}
