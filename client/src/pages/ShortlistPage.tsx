import { Link } from 'react-router-dom';
import { useShortlist } from '../context/ShortlistContext';
import { useAuth } from '../context/AuthContext';
import CafeCard from '../components/cafe/CafeCard';

export default function ShortlistPage() {
  const { shortlist, removeFromShortlist, clearShortlist, loading } = useShortlist();
  const { user, isLoading: authLoading } = useAuth();

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-center py-16 bg-white border border-[#F0EDE8] rounded-2xl">
          <span className="text-5xl mb-3 inline-block">⭐</span>
          <p className="text-[#1C1C1A] font-semibold">Login dulu untuk lihat Shortlist</p>
          <p className="text-sm text-[#8A8880] mt-1 mb-4">
            Shortlist kamu disimpan di akun, jadi bisa diakses dari mana aja.
          </p>
          <Link
            to="/login?redirect=%2Fshortlist"
            className="inline-block bg-[#D48B3A] text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#B97726] transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1C1A]">My Shortlist</h1>
          <p className="text-sm text-[#8A8880] mt-0.5">
            {shortlist.length} kafe disimpan untuk dikunjungi nanti
          </p>
        </div>
        {shortlist.length > 0 && (
          <button
            type="button"
            onClick={clearShortlist}
            className="text-sm font-semibold text-[#8A8880] hover:text-red-500 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {shortlist.length === 0 ? (
        <div className="text-center py-16 bg-white border border-[#F0EDE8] rounded-2xl">
          <span className="text-5xl mb-3 inline-block">⭐</span>
          <p className="text-[#1C1C1A] font-semibold">Shortlist kamu masih kosong</p>
          <p className="text-sm text-[#8A8880] mt-1 mb-4">
            Geser kanan kafe yg menarik buat menyimpannya di sini.
          </p>
          <Link
            to="/discover"
            className="inline-block bg-[#D48B3A] text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#B97726] transition-colors"
          >
            Mulai Discover →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {shortlist.map((c) => (
            <div key={c.id} className="relative group">
              <CafeCard cafe={c} />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeFromShortlist(c.id);
                }}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-red-500 hover:text-white text-[#8A8880] text-sm font-bold shadow flex items-center justify-center transition-colors z-10"
                title="Remove from shortlist"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
