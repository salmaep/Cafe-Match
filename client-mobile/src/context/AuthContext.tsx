import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import {
  loginApi,
  registerApi,
  fetchMe,
  isTwoFaChallenge,
  verify2faApi,
  resend2faApi,
  TwoFaChallenge,
} from '../services/api';

interface LoginOutcome {
  success: boolean;
  error?: string;
  twoFaChallenge?: TwoFaChallenge;
}

interface RegisterOutcome {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginOutcome>;
  register: (name: string, email: string, password: string) => Promise<RegisterOutcome>;
  loginWithToken: (token: string) => Promise<{ success: boolean; error?: string }>;
  verify2fa: (otpId: string, code: string) => Promise<{ success: boolean; error?: string }>;
  resend2fa: (otpId: string) => Promise<{ success: boolean; otpId?: string; expiresAt?: string; error?: string }>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  loginWithToken: async () => ({ success: false }),
  verify2fa: async () => ({ success: false }),
  resend2fa: async () => ({ success: false }),
  refresh: async () => {},
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

  const persistAuth = async (token: string, profile: User) => {
    await AsyncStorage.setItem('jwt_token', token);
    await AsyncStorage.setItem('user', JSON.stringify(profile));
    setUser(profile);
  };

  const login = async (email: string, password: string): Promise<LoginOutcome> => {
    try {
      const response = await loginApi(email, password);
      if (isTwoFaChallenge(response)) {
        return { success: false, twoFaChallenge: response };
      }
      await persistAuth(response.accessToken, response.user);
      return { success: true };
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        (err?.response
          ? 'Login failed. Please check your credentials.'
          : 'Cannot reach server. Check your connection.');
      return { success: false, error: message };
    }
  };

  const register = async (name: string, email: string, password: string): Promise<RegisterOutcome> => {
    try {
      await registerApi(name, email, password);
      return { success: true };
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        (err?.response
          ? 'Registration failed. Please try again.'
          : 'Cannot reach server. Check your connection.');
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

  const verify2fa = async (otpId: string, code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await verify2faApi(otpId, code);
      await persistAuth(response.accessToken, response.user);
      return { success: true };
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        (err?.response ? 'Kode OTP tidak valid.' : 'Cannot reach server.');
      return { success: false, error: message };
    }
  };

  const resend2fa = async (otpId: string) => {
    try {
      const response = await resend2faApi(otpId);
      return { success: true, otpId: response.otpId, expiresAt: response.expiresAt };
    } catch (err: any) {
      const message =
        err?.response?.data?.message || 'Gagal mengirim ulang OTP.';
      return { success: false, error: message };
    }
  };

  const refresh = async () => {
    try {
      const me = await fetchMe();
      await AsyncStorage.setItem('user', JSON.stringify(me));
      setUser(me);
    } catch {
      // ignore — keep stale user rather than logging out on transient errors
    }
  };

  const logout = async () => {
    setUser(null);
    // Wipe auth + any user-specific cached data
    const allKeys = await AsyncStorage.getAllKeys();
    const keysToRemove = [
      'user',
      'jwt_token',
      // Onboarding prefs + search history are per-user; clear on logout so the
      // next user starts fresh (wizard reshows). ProfileScreen also resets the
      // in-memory PreferencesContext state alongside this.
      'cm_preferences',
      'cm_wizard_completed',
      'cm_search_history',
    ];
    // Also drop any owner-cafe override caches tied to the previous session
    for (const k of allKeys) {
      if (k.startsWith('owner_cafe_override_')) keysToRemove.push(k);
    }
    await AsyncStorage.multiRemove(keysToRemove);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        loginWithToken,
        verify2fa,
        resend2fa,
        refresh,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
