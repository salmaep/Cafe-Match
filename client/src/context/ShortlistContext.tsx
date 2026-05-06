import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Cafe } from '../types';
import { useAuth } from './AuthContext';
import { shortlistsApi } from '../api/shortlists.api';

interface ShortlistContextType {
  shortlist: Cafe[];
  addToShortlist: (c: Cafe) => Promise<boolean>;
  removeFromShortlist: (id: number) => Promise<void>;
  isInShortlist: (id: number) => boolean;
  clearShortlist: () => Promise<void>;
  loading: boolean;
}

const ShortlistContext = createContext<ShortlistContextType | null>(null);

export function ShortlistProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [shortlist, setShortlist] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setShortlist([]);
      return;
    }
    setLoading(true);
    shortlistsApi
      .getAll()
      .then((res) => setShortlist(res.data.map((item) => item.cafe)))
      .catch(() => setShortlist([]))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  const requireAuth = useCallback((): boolean => {
    if (!user) {
      const next = window.location.pathname + window.location.search;
      navigate(`/login?redirect=${encodeURIComponent(next)}`);
      return false;
    }
    return true;
  }, [user, navigate]);

  const addToShortlist = useCallback(
    async (c: Cafe): Promise<boolean> => {
      if (!requireAuth()) return false;
      setShortlist((prev) => (prev.some((x) => x.id === c.id) ? prev : [c, ...prev]));
      try {
        await shortlistsApi.add(c.id);
        return true;
      } catch {
        setShortlist((prev) => prev.filter((x) => x.id !== c.id));
        return false;
      }
    },
    [requireAuth],
  );

  const removeFromShortlist = useCallback(
    async (id: number): Promise<void> => {
      if (!requireAuth()) return;
      const prev = shortlist;
      setShortlist((p) => p.filter((c) => c.id !== id));
      try {
        await shortlistsApi.remove(id);
      } catch {
        setShortlist(prev);
      }
    },
    [requireAuth, shortlist],
  );

  const isInShortlist = useCallback(
    (id: number) => shortlist.some((c) => c.id === id),
    [shortlist],
  );

  const clearShortlist = useCallback(async (): Promise<void> => {
    if (!requireAuth()) return;
    const prev = shortlist;
    setShortlist([]);
    try {
      await shortlistsApi.clear();
    } catch {
      setShortlist(prev);
    }
  }, [requireAuth, shortlist]);

  return (
    <ShortlistContext.Provider
      value={{
        shortlist,
        addToShortlist,
        removeFromShortlist,
        isInShortlist,
        clearShortlist,
        loading,
      }}
    >
      {children}
    </ShortlistContext.Provider>
  );
}

export function useShortlist() {
  const ctx = useContext(ShortlistContext);
  if (!ctx) throw new Error('useShortlist must be used within a ShortlistProvider');
  return ctx;
}
