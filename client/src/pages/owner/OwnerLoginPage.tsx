import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';


export default function OwnerLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      navigate('/owner/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex justify-center md:items-center px-4 md:px-6 py-6 md:py-12">
      <div className="w-full max-w-md md:bg-white md:rounded-2xl md:shadow-xl md:p-8 p-2">
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
          Owner Login
        </h1>
        <p className="text-[15px] text-[#8A8880] mt-1 mb-8">
          Access your cafe management dashboard
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-1">
          <label className="block text-[13px] font-semibold text-[#1C1C1A] mt-2 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="owner@mycafe.com"
            required
            autoComplete="email"
            className="w-full px-4 py-3 bg-[#F0EDE8] rounded-xl text-[15px] text-[#1C1C1A] placeholder:text-[#8A8880] focus:bg-white focus:ring-2 focus:ring-[#D48B3A]/30 outline-none border-none transition-all"
          />

          <label className="block text-[13px] font-semibold text-[#1C1C1A] mt-3 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            autoComplete="current-password"
            className="w-full px-4 py-3 bg-[#F0EDE8] rounded-xl text-[15px] text-[#1C1C1A] placeholder:text-[#8A8880] focus:bg-white focus:ring-2 focus:ring-[#D48B3A]/30 outline-none border-none transition-all"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-3 bg-[#1C1C1A] text-white rounded-xl font-bold text-base hover:bg-black disabled:opacity-60 transition-colors"
          >
            {loading ? 'Signing in…' : 'Login as Owner'}
          </button>
        </form>

        <div className="text-center text-sm text-[#8A8880] mt-5">
          Don't have an owner account?{' '}
          <Link
            to="/owner/register"
            className="text-[#D48B3A] font-semibold hover:underline"
          >
            Register Cafe
          </Link>
        </div>

        <div className="h-px bg-[#F0EDE8] my-5" />

        <Link
          to="/login"
          className="block text-center text-sm text-[#8A8880] hover:text-[#1C1C1A] transition-colors"
        >
          Customer? Login here →
        </Link>
      </div>
    </div>
  );
}
