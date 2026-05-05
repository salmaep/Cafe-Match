import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { authApi } from '../api/auth.api';

export interface PendingTwoFa {
  otpId: string;
  expiresAt: string;
  phoneHint?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<PendingTwoFa | null>;
  loginWithToken: (token: string) => Promise<void>;
  verify2fa: (otpId: string, code: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      authApi
        .getMe()
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string): Promise<PendingTwoFa | null> => {
    const res = await authApi.login({ email, password });
    if ('twoFaRequired' in res.data) {
      return {
        otpId: res.data.otpId,
        expiresAt: res.data.expiresAt,
        phoneHint: res.data.phoneHint,
      };
    }
    localStorage.setItem('token', res.data.accessToken);
    setToken(res.data.accessToken);
    setUser(res.data.user);
    return null;
  };

  const verify2fa = async (otpId: string, code: string) => {
    const res = await authApi.verify2fa({ otpId, code });
    localStorage.setItem('token', res.data.accessToken);
    setToken(res.data.accessToken);
    setUser(res.data.user);
  };

  const loginWithToken = async (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    const me = await authApi.getMe();
    setUser(me.data);
  };

  const register = async (email: string, password: string, name: string) => {
    await authApi.register({ email, password, name });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, loginWithToken, verify2fa, register, logout, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
