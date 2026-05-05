import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { loginApi, registerApi, fetchMe } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithToken: (token: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  loginWithToken: async () => ({ success: false }),
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, check for existing JWT and validate it
  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('jwt_token');
        if (token) {
          // Validate token with backend
          const me = await fetchMe();
          setUser(me);
        }
      } catch {
        // Token invalid or backend unreachable, try cached user
        const cached = await AsyncStorage.getItem('user');
        if (cached) {
          try { setUser(JSON.parse(cached)); } catch {}
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await loginApi(email, password);
      await AsyncStorage.setItem('jwt_token', response.accessToken);
      await AsyncStorage.setItem('user', JSON.stringify(response.user));
      setUser(response.user);
      return { success: true };
    } catch (err: any) {
      const message =
        err?.response?.data?.message || 'Login failed. Please check your credentials.';
      // Fallback: mock login if backend is unreachable (network error)
      if (!err?.response) {
        const mockUser: User = { id: '1', name: 'Coffee Lover', email, role: 'user' };
        setUser(mockUser);
        await AsyncStorage.setItem('user', JSON.stringify(mockUser));
        return { success: true };
      }
      return { success: false, error: message };
    }
  };

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const newUser = await registerApi(name, email, password);
      // Auto-login after register
      const loginResult = await login(email, password);
      return loginResult;
    } catch (err: any) {
      const message =
        err?.response?.data?.message || 'Registration failed. Please try again.';
      if (!err?.response) {
        const mockUser: User = { id: '1', name, email, role: 'user' };
        setUser(mockUser);
        await AsyncStorage.setItem('user', JSON.stringify(mockUser));
        return { success: true };
      }
      return { success: false, error: message };
    }
  };

  const loginWithToken = async (token: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await AsyncStorage.setItem('jwt_token', token);
      const me = await fetchMe();
      await AsyncStorage.setItem('user', JSON.stringify(me));
      setUser(me);
      return { success: true };
    } catch (err: any) {
      await AsyncStorage.removeItem('jwt_token');
      return { success: false, error: 'Token tidak valid.' };
    }
  };

  const logout = async () => {
    setUser(null);
    // Wipe auth + any user-specific cached data
    const allKeys = await AsyncStorage.getAllKeys();
    const keysToRemove = ['user', 'jwt_token'];
    // Also drop any owner-cafe override caches tied to the previous session
    for (const k of allKeys) {
      if (k.startsWith('owner_cafe_override_')) keysToRemove.push(k);
    }
    await AsyncStorage.multiRemove(keysToRemove);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
