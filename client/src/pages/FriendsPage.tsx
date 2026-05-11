import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  friendsApi,
  type Friend,
  type FriendRequest,
  type FriendPreview,
} from '../api/friends.api';
import {
  getHiddenFriends,
  hideFriend,
  unhideFriend,
} from '../utils/hiddenFriends';

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
  const [preview, setPreview] = useState<FriendPreview | null>(null);
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'notfound'>('idle');
  const [copied, setCopied] = useState(false);
  const [hidden, setHidden] = useState<Set<number>>(() => getHiddenFriends());

  const toggleHidden = (friendId: number) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) {
        next.delete(friendId);
        unhideFriend(friendId);
      } else {
        next.add(friendId);
        hideFriend(friendId);
      }
      return next;
    });
  };

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

  // Debounced lookup so the user sees the friend's name + avatar before
  // confirming the request. Only fires when 8 valid chars have been typed
  // (matches the friend-code format).
  useEffect(() => {
    if (code.length < 8) {
      setPreview(null);
      setLookupState('idle');
      return;
    }
    setLookupState('loading');
    setPreview(null);
    const timer = setTimeout(() => {
      friendsApi
        .lookup(code)
        .then((res) => {
          if (res.data) {
            setPreview(res.data);
            setLookupState('idle');
          } else {
            setPreview(null);
            setLookupState('notfound');
          }
        })
        .catch(() => {
          setPreview(null);
          setLookupState('notfound');
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [code]);

  const sendRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setSending(true);
    setMsg(null);
    try {
      await friendsApi.sendRequest(code.trim().toUpperCase());
      setMsg({ type: 'ok', text: 'Permintaan pertemanan terkirim!' });
      setCode('');
      setPreview(null);
      setLookupState('idle');
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
              friends.map((f) => {
                const isHidden = hidden.has(f.id);
                return (
                  <div
                    key={f.id}
                    className={`flex items-center gap-3 bg-white rounded-2xl p-3 border transition-colors ${
                      isHidden
                        ? 'border-[#E0DCD3] opacity-60'
                        : 'border-[#F0EDE8]'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-full font-extrabold flex items-center justify-center ${
                        isHidden
                          ? 'bg-[#9CA3AF] text-white'
                          : 'bg-[#D48B3A] text-white'
                      }`}
                    >
                      {f.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#1C1C1A] truncate flex items-center gap-2">
                        <span className="truncate">{f.name}</span>
                        {isHidden && (
                          <span className="text-[10px] font-bold text-[#8A8880] bg-[#F0EDE8] px-1.5 py-0.5 rounded-full shrink-0">
                            Disembunyikan
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-[#8A8880] truncate">🎫 {f.friendCode}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleHidden(f.id)}
                      title={
                        isHidden
                          ? 'Tampilkan kembali di profil'
                          : 'Sembunyikan dari profil saya'
                      }
                      className="px-3 py-1.5 rounded-full text-xs font-bold border border-[#E8E4DD] text-[#5C5A52] hover:border-[#D48B3A] hover:text-[#D48B3A] transition-colors"
                    >
                      {isHidden ? '👁 Tampilkan' : '🚫 Sembunyikan'}
                    </button>
                  </div>
                );
              })
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
            <form onSubmit={sendRequest} className="flex flex-col gap-3">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                placeholder="ABCD1234"
                className="w-full px-4 py-3 bg-[#F0EDE8] rounded-xl text-[15px] font-bold tracking-widest focus:bg-white focus:ring-2 focus:ring-[#D48B3A]/30 outline-none border-none"
              />

              {/* Preview card — shows the resolved name + avatar so the user
                  confirms the right person before sending the request. */}
              {lookupState === 'loading' && (
                <div className="flex items-center gap-3 p-3 bg-[#FAF9F6] border border-[#F0EDE8] rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-[#F0EDE8] animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-24 bg-[#F0EDE8] rounded animate-pulse" />
                    <div className="h-2.5 w-16 bg-[#F0EDE8] rounded animate-pulse" />
                  </div>
                </div>
              )}
              {lookupState === 'notfound' && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  Kode tidak ditemukan
                </p>
              )}
              {preview && (
                <div className="flex items-center gap-3 p-3 bg-[#FDF6EC] border border-[#D48B3A]/30 rounded-xl">
                  {preview.avatarUrl ? (
                    <img
                      src={preview.avatarUrl}
                      alt={preview.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#D48B3A] text-white font-bold flex items-center justify-center">
                      {preview.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[#1C1C1A] truncate">
                      {preview.name}
                    </div>
                    <div className="text-xs text-[#8A8880]">
                      Kirim permintaan pertemanan?
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={sending || !preview}
                className="w-full px-5 py-3 bg-[#1C1C1A] text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Mengirim…' : 'Kirim Permintaan'}
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
