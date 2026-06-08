'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from './api';

interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  subscription?: {
    tier: string;
    credits: number;
    usedCredits: number;
  };
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
      return data;
    } catch (error) {
      setUser(null);
      return null;
    }
  }, []);

  const refreshAccessToken = useCallback(async () => {
    try {
      const { data } = await api.post('/auth/refresh');
      setAccessToken(data.accessToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
      return data.accessToken;
    } catch {
      setAccessToken(null);
      setUser(null);
      return null;
    }
  }, []);

  // Init on mount
  useEffect(() => {
    const init = async () => {
      const token = await refreshAccessToken();
      if (token) {
        await fetchUser();
      }
      setIsLoading(false);
    };
    init();
  }, [refreshAccessToken, fetchUser]);

  // Response interceptor for 401
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          const token = await refreshAccessToken();
          if (token) {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return api(originalRequest);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [refreshAccessToken]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
    setUser(data.user);
    
    // Wait a moment then refresh to ensure subscription is loaded
    setTimeout(() => fetchUser(), 100);
    
    router.push('/dashboard');
  };

  const register = async (email: string, password: string, name?: string) => {
    const { data } = await api.post('/auth/register', { email, password, name });
    setAccessToken(data.accessToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
    setUser(data.user);
    
    // Wait a moment then refresh to ensure subscription is loaded
    setTimeout(() => fetchUser(), 100);
    
    router.push('/dashboard');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Ignore logout errors
    }
    setAccessToken(null);
    setUser(null);
    router.push('/');
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider
      value={{ user, accessToken, isLoading, login, register, logout, refreshUser }}
    >
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
