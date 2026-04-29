import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Cafe } from '../types';

const STORAGE_KEY = 'cm_shortlist';

interface ShortlistContextType {
  shortlist: Cafe[];
  addToShortlist: (c: Cafe) => void;
  removeFromShortlist: (id: number) => void;
  isInShortlist: (id: number) => boolean;
  clearShortlist: () => void;
}

const ShortlistContext = createContext<ShortlistContextType | null>(null);

export function ShortlistProvider({ children }: { children: ReactNode }) {
  const [shortlist, setShortlist] = useState<Cafe[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shortlist));
  }, [shortlist]);

  const addToShortlist = (c: Cafe) => {
    setShortlist((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]));
  };
  const removeFromShortlist = (id: number) => {
    setShortlist((prev) => prev.filter((c) => c.id !== id));
  };
  const isInShortlist = (id: number) => shortlist.some((c) => c.id === id);
  const clearShortlist = () => setShortlist([]);

  return (
    <ShortlistContext.Provider
      value={{ shortlist, addToShortlist, removeFromShortlist, isInShortlist, clearShortlist }}
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
