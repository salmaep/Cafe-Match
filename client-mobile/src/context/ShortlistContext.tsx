import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Cafe } from '../types';

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

export function ShortlistProvider({ children }: { children: ReactNode }) {
  const [shortlist, setShortlist] = useState<Cafe[]>([]);

  useEffect(() => {
    AsyncStorage.getItem('shortlist').then((data) => {
      if (data) setShortlist(JSON.parse(data));
    });
  }, []);

  const persist = (list: Cafe[]) => {
    AsyncStorage.setItem('shortlist', JSON.stringify(list));
  };

  const addToShortlist = (cafe: Cafe) => {
    setShortlist((prev) => {
      if (prev.find((c) => c.id === cafe.id)) return prev;
      const next = [...prev, cafe];
      persist(next);
      return next;
    });
  };

  const removeFromShortlist = (cafeId: string) => {
    setShortlist((prev) => {
      const next = prev.filter((c) => c.id !== cafeId);
      persist(next);
      return next;
    });
  };

  const isInShortlist = (cafeId: string) => shortlist.some((c) => c.id === cafeId);

  const clearShortlist = async () => {
    setShortlist([]);
    await AsyncStorage.removeItem('shortlist');
  };

  return (
    <ShortlistContext.Provider value={{ shortlist, addToShortlist, removeFromShortlist, isInShortlist, clearShortlist }}>
      {children}
    </ShortlistContext.Provider>
  );
}
