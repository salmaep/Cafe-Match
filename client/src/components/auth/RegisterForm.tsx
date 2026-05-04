import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, name);
      navigate('/login?next=wizard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const passwordMismatch = !!confirmPassword && password !== confirmPassword;

  return (
    <div className="min-h-screen md:min-h-[calc(100vh-4rem)] bg-[#FAF9F6] flex items-end md:items-center justify-center px-4 md:px-6 pb-6 md:pb-12 pt-6">
      <div className="w-full max-w-md bg-white md:rounded-2xl rounded-t-3xl shadow-[0_-12px_32px_rgba(0,0,0,0.06)] md:shadow-xl p-6 md:p-8">
        <div className="md:hidden mx-auto w-10 h-1 rounded-full bg-[#D6CFC2] mb-5" />

        <h1 className="text-2xl font-bold text-[#1C1C1A]">Create Account</h1>
        <p className="text-[15px] text-[#8A8880] mt-1 mb-5">
          Join CafeMatch to save your favorites
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2.5">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full Name"
            required
            autoComplete="name"
            className="w-full px-4 py-3 bg-[#F0EDE8] rounded-xl text-[15px] text-[#1C1C1A] placeholder:text-[#8A8880] focus:bg-white focus:ring-2 focus:ring-[#D48B3A]/30 outline-none border-none transition-all"
          />
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
            minLength={6}
            autoComplete="new-password"
            className="w-full px-4 py-3 bg-[#F0EDE8] rounded-xl text-[15px] text-[#1C1C1A] placeholder:text-[#8A8880] focus:bg-white focus:ring-2 focus:ring-[#D48B3A]/30 outline-none border-none transition-all"
          />
          <div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              required
              minLength={6}
              autoComplete="new-password"
              className={`w-full px-4 py-3 rounded-xl text-[15px] text-[#1C1C1A] placeholder:text-[#8A8880] outline-none transition-all ${
                passwordMismatch
                  ? 'bg-red-50 ring-2 ring-red-300 focus:ring-red-400'
                  : 'bg-[#F0EDE8] border-none focus:bg-white focus:ring-2 focus:ring-[#D48B3A]/30'
              }`}
            />
            {passwordMismatch && (
              <p className="text-xs text-red-500 mt-1.5 ml-1">
                Passwords do not match
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#1C1C1A] text-white rounded-xl font-bold text-base hover:bg-black disabled:opacity-60 transition-colors mt-2"
          >
            {loading ? 'Creating account…' : 'Register'}
          </button>
        </form>

        <div className="text-center text-sm text-[#8A8880] mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-[#D48B3A] font-semibold hover:underline">
            Login
          </Link>
        </div>

        <Link
          to="/"
          className="block text-center text-sm text-[#8A8880] mt-3 hover:text-[#1C1C1A] transition-colors"
        >
          Maybe later
        </Link>

        <div className="flex items-center gap-3 mt-6 mb-3">
          <div className="flex-1 h-px bg-[#F0EDE8]" />
          <span className="text-xs text-[#8A8880]">or</span>
          <div className="flex-1 h-px bg-[#F0EDE8]" />
        </div>
        <Link
          to="/owner/register"
          className="block w-full text-center py-3 rounded-xl border-[1.5px] border-[#D48B3A]/60 bg-[#D48B3A]/[0.04] text-[#D48B3A] font-semibold text-sm hover:bg-[#D48B3A]/10 transition-colors"
        >
          ☕  Register as a cafe owner
        </Link>
      </div>
    </div>
  );
}
