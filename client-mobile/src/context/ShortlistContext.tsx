import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Cafe } from '../types';
import { useAuth } from './AuthContext';
import {
  useAddToShortlistMutation,
  useClearShortlistMutation,
  useRemoveFromShortlistMutation,
  useShortlistQuery,
} from '../queries/shortlists/use-shortlist';

interface ShortlistContextType {
  shortlist: Cafe[];
  addToShortlist: (cafe: Cafe) => void;
  removeFromShortlist: (cafeId: string) => void;
  isInShortlist: (cafeId: string) => boolean;
  clearShortlist: () => Promise<void>;
}

const ShortlistContext = createContext<ShortlistContextType>({
  shortlist: [],
  addToShortlist: () => {},
  removeFromShortlist: () => {},
  isInShortlist: () => false,
  clearShortlist: async () => {},
});

export const useShortlist = () => useContext(ShortlistContext);

const LOCAL_STORAGE_KEY = 'shortlist';

/**
 * Source of truth for the user's shortlist.
 *
 * - When logged in → reads/writes via the server API (`/shortlists` endpoints).
 *   Mutations are optimistic; the server is authoritative on refetch.
 * - When logged out → falls back to AsyncStorage so swiping/saving still works
 *   pre-login. The local list is *not* automatically synced to the server on
 *   login (that would require a merge UX); it just stays as guest history.
 */
export function ShortlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAuthenticated = !!user;

  // Server-backed state (TanStack Query) — only enabled when authenticated.
  const shortlistQuery = useShortlistQuery(isAuthenticated);
  const addMutation = useAddToShortlistMutation();
  const removeMutation = useRemoveFromShortlistMutation();
  const clearMutation = useClearShortlistMutation();

  // Local fallback state for unauthenticated users.
  const [localShortlist, setLocalShortlist] = useState<Cafe[]>([]);
  useEffect(() => {
    AsyncStorage.getItem(LOCAL_STORAGE_KEY).then((data) => {
      if (data) setLocalShortlist(JSON.parse(data));
    });
  }, []);

  const persistLocal = useCallback((list: Cafe[]) => {
    AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  }, []);

  const shortlist = isAuthenticated
    ? shortlistQuery.data ?? []
    : localShortlist;

  const addToShortlist = useCallback(
    (cafe: Cafe) => {
      if (isAuthenticated) {
        addMutation.mutate(cafe);
        return;
      }
      setLocalShortlist((prev) => {
        if (prev.find((c) => c.id === cafe.id)) return prev;
        const next = [...prev, cafe];
        persistLocal(next);
        return next;
      });
    },
    [isAuthenticated, addMutation, persistLocal],
  );

  const removeFromShortlist = useCallback(
    (cafeId: string) => {
      if (isAuthenticated) {
        removeMutation.mutate(cafeId);
        return;
      }
      setLocalShortlist((prev) => {
        const next = prev.filter((c) => c.id !== cafeId);
        persistLocal(next);
        return next;
      });
    },
    [isAuthenticated, removeMutation, persistLocal],
  );

  const isInShortlist = useCallback(
    (cafeId: string) => shortlist.some((c) => c.id === cafeId),
    [shortlist],
  );

  const clearShortlist = useCallback(async () => {
    if (isAuthenticated) {
      await clearMutation.mutateAsync();
    }
    setLocalShortlist([]);
    await AsyncStorage.removeItem(LOCAL_STORAGE_KEY);
  }, [isAuthenticated, clearMutation]);

  const value = useMemo(
    () => ({
      shortlist,
      addToShortlist,
      removeFromShortlist,
      isInShortlist,
      clearShortlist,
    }),
    [shortlist, addToShortlist, removeFromShortlist, isInShortlist, clearShortlist],
  );

  return (
    <ShortlistContext.Provider value={value}>
      {children}
    </ShortlistContext.Provider>
  );
}
