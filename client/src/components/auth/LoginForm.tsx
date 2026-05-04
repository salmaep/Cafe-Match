import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { wizardCompleted } = usePreferences();
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
      navigate(wizardCompleted ? '/' : '/wizard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen md:min-h-[calc(100vh-4rem)] bg-[#FAF9F6] flex items-end md:items-center justify-center px-4 md:px-6 pb-6 md:pb-12 pt-6">
      <div className="w-full max-w-md bg-white md:rounded-2xl rounded-t-3xl shadow-[0_-12px_32px_rgba(0,0,0,0.06)] md:shadow-xl p-6 md:p-8">
        {/* Drag handle — mobile bottom-sheet feel */}
        <div className="md:hidden mx-auto w-10 h-1 rounded-full bg-[#D6CFC2] mb-5" />

        <h1 className="text-2xl font-bold text-[#1C1C1A]">Welcome Back</h1>
        <p className="text-[15px] text-[#8A8880] mt-1 mb-5">
          Login to save your favorites
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2.5">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            autoComplete="email"
            className="w-full px-4 py-3 bg-[#F0EDE8] rounded-xl text-[15px] text-[#1C1C1A] placeholder:text-[#8A8880] focus:bg-white focus:ring-2 focus:ring-[#D48B3A]/30 outline-none border-none transition-all"
          />
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
            className="w-full py-3 bg-[#1C1C1A] text-white rounded-xl font-bold text-base hover:bg-black disabled:opacity-60 transition-colors mt-2"
          >
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>

        <div className="text-center text-sm text-[#8A8880] mt-4">
          Don't have an account?{' '}
          <Link to="/register" className="text-[#D48B3A] font-semibold hover:underline">
            Register
          </Link>
        </div>

        <Link
          to="/"
          className="block text-center text-sm text-[#8A8880] mt-3 hover:text-[#1C1C1A] transition-colors"
        >
          Maybe later
        </Link>

        {/* Owner divider + entry */}
        <div className="flex items-center gap-3 mt-6 mb-3">
          <div className="flex-1 h-px bg-[#F0EDE8]" />
          <span className="text-xs text-[#8A8880]">or</span>
          <div className="flex-1 h-px bg-[#F0EDE8]" />
        </div>
        <Link
          to="/owner/login"
          className="block w-full text-center py-3 rounded-xl border-[1.5px] border-[#D48B3A]/60 bg-[#D48B3A]/[0.04] text-[#D48B3A] font-semibold text-sm hover:bg-[#D48B3A]/10 transition-colors"
        >
          ☕  Are you a cafe owner?  Login here
        </Link>
      </div>
    </div>
  );
}
