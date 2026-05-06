import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { friendsApi, type Friend, type FriendRequest } from '../api/friends.api';

type Tab = 'friends' | 'requests' | 'add';

export default function FriendsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([friendsApi.list(), friendsApi.pendingRequests()])
      .then(([f, r]) => {
        setFriends(f.data ?? []);
        setRequests(r.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  const sendRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setSending(true);
    setMsg(null);
    try {
      await friendsApi.sendRequest(code.trim().toUpperCase());
      setMsg({ type: 'ok', text: 'Permintaan pertemanan terkirim!' });
      setCode('');
    } catch (err: any) {
      setMsg({ type: 'err', text: err?.response?.data?.message || 'Gagal mengirim permintaan' });
    } finally {
      setSending(false);
    }
  };

  const accept = async (id: number) => {
    try {
      await friendsApi.accept(id);
      load();
    } catch {}
  };

  const reject = async (id: number) => {
    try {
      await friendsApi.reject(id);
      setRequests((p) => p.filter((r) => r.id !== id));
    } catch {}
  };

  const myCode = (user as any)?.friendCode || '—';
  const copyCode = async () => {
    if (!myCode || myCode === '—') return;
    try {
      await navigator.clipboard.writeText(myCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] px-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center border border-[#F0EDE8]">
          <p className="text-[#8A8880] mb-4">Login dulu untuk akses fitur Teman</p>
          <Link
            to="/login"
            className="inline-block px-6 py-2.5 bg-[#1C1C1A] text-white rounded-xl font-bold"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-16">
      <div className="bg-white border-b border-[#F0EDE8]">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <h1 className="text-2xl font-extrabold text-[#1C1C1A]">Teman</h1>
          <p className="text-sm text-[#8A8880] mt-1">Connect dengan teman, share cafe favorit</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-5">
        {/* My friend code */}
        <div className="bg-gradient-to-br from-[#FB923C] to-[#EA580C] rounded-2xl p-5 mb-5 text-white shadow-md">
          <p className="text-xs font-bold tracking-wider uppercase opacity-90">Kode Pertemananmu</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-3xl font-extrabold tracking-wider tabular-nums">{myCode}</span>
            <button
              type="button"
              onClick={copyCode}
              disabled={myCode === '—'}
              className="ml-auto px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-bold hover:bg-white/30 transition-colors disabled:opacity-40"
            >
              {copied ? '✓ Disalin' : '📋 Salin'}
            </button>
          </div>
          <p className="mt-2 text-xs text-white/90">Bagikan kode ini ke teman untuk add friend</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <TabBtn active={tab === 'friends'} onClick={() => setTab('friends')}>
            Teman ({friends.length})
          </TabBtn>
          <TabBtn active={tab === 'requests'} onClick={() => setTab('requests')}>
            Permintaan ({requests.length})
          </TabBtn>
          <TabBtn active={tab === 'add'} onClick={() => setTab('add')}>
            + Tambah
          </TabBtn>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#D48B3A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === 'friends' ? (
          <div className="space-y-2">
            {friends.length === 0 ? (
              <Empty
                icon="👥"
                title="Belum ada teman"
                subtitle="Tambahkan teman lewat kode pertemanan"
              />
            ) : (
              friends.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 bg-white rounded-2xl p-3 border border-[#F0EDE8]"
                >
                  <div className="w-12 h-12 rounded-full bg-[#D48B3A] text-white font-extrabold flex items-center justify-center">
                    {f.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#1C1C1A] truncate">{f.name}</p>
                    <p className="text-xs text-[#8A8880] truncate">🎫 {f.friendCode}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : tab === 'requests' ? (
          <div className="space-y-2">
            {requests.length === 0 ? (
              <Empty icon="📭" title="Tidak ada permintaan masuk" subtitle="—" />
            ) : (
              requests.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 bg-white rounded-2xl p-3 border border-[#F0EDE8]"
                >
                  <div className="w-12 h-12 rounded-full bg-[#D48B3A] text-white font-extrabold flex items-center justify-center">
                    {r.fromUser?.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#1C1C1A] truncate">{r.fromUser?.name}</p>
                    <p className="text-xs text-[#8A8880] truncate">🎫 {r.fromUser?.friendCode}</p>
                  </div>
                  <button
                    onClick={() => accept(r.id)}
                    className="px-3 py-1.5 rounded-full bg-[#1C1C1A] text-white text-xs font-bold"
                  >
                    Terima
                  </button>
                  <button
                    onClick={() => reject(r.id)}
                    className="px-3 py-1.5 rounded-full bg-[#F0EDE8] text-[#8A8880] text-xs font-bold"
                  >
                    Tolak
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          // Add tab
          <div className="bg-white rounded-2xl p-5 border border-[#F0EDE8]">
            <h3 className="font-extrabold text-[#1C1C1A] mb-3">Tambah Teman</h3>
            <p className="text-xs text-[#8A8880] mb-3">
              Masukkan kode pertemanan teman Anda (8 karakter)
            </p>
            <form onSubmit={sendRequest} className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                placeholder="ABCD1234"
                className="flex-1 px-4 py-3 bg-[#F0EDE8] rounded-xl text-[15px] font-bold tracking-widest focus:bg-white focus:ring-2 focus:ring-[#D48B3A]/30 outline-none border-none"
              />
              <button
                type="submit"
                disabled={sending || !code.trim()}
                className="px-5 py-3 bg-[#1C1C1A] text-white rounded-xl font-bold disabled:opacity-50"
              >
                {sending ? '...' : 'Kirim'}
              </button>
            </form>
            {msg && (
              <p
                className={`mt-3 text-sm font-semibold ${
                  msg.type === 'ok' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {msg.text}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2 rounded-full text-xs font-bold transition-colors ${
        active ? 'bg-[#1C1C1A] text-white' : 'bg-white text-[#1C1C1A] border border-[#E8E4DD]'
      }`}
    >
      {children}
    </button>
  );
}

function Empty({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-5xl mb-3">{icon}</span>
      <p className="font-bold text-[#1C1C1A]">{title}</p>
      <p className="text-sm text-[#8A8880] mt-1">{subtitle}</p>
    </div>
  );
}
