'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, authApi, User } from '@/lib/api';

const ORIGINAL_TOKEN_KEY = 'original_token';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isImpersonating: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  impersonate: (userId: string) => Promise<void>;
  exitImpersonation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      // Check if we're in impersonation mode
      if (typeof window !== 'undefined' && localStorage.getItem(ORIGINAL_TOKEN_KEY)) {
        setIsImpersonating(true);
      }
      authApi
        .me()
        .then(setUser)
        .catch(() => {
          api.setToken(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem(ORIGINAL_TOKEN_KEY);
          }
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    api.setToken(response.accessToken);
    setUser(response.user);
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    setIsImpersonating(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ORIGINAL_TOKEN_KEY);
    }
  };

  const impersonate = async (userId: string) => {
    // Save current token as original
    const currentToken = api.getToken();
    if (currentToken && typeof window !== 'undefined') {
      localStorage.setItem(ORIGINAL_TOKEN_KEY, currentToken);
    }

    const response = await authApi.impersonate(userId);
    api.setToken(response.accessToken);
    setUser(response.user);
    setIsImpersonating(true);
  };

  const exitImpersonation = async () => {
    if (typeof window !== 'undefined') {
      const originalToken = localStorage.getItem(ORIGINAL_TOKEN_KEY);
      if (originalToken) {
        api.setToken(originalToken);
        localStorage.removeItem(ORIGINAL_TOKEN_KEY);
        setIsImpersonating(false);
        // Reload original user
        const originalUser = await authApi.me();
        setUser(originalUser);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isImpersonating, login, logout, impersonate, exitImpersonation }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
