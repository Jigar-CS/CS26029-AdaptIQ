'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';
import { UserRole } from '@clias/shared-types';

export interface UserSession {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  studentId?: string;
  facultyId?: string;
  studentDetails?: any;
}

interface AuthContextType {
  user: UserSession | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserSession>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
  updateUser: (updates: Partial<UserSession>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('clias_user');
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('clias_token');
    }
    return null;
  });

  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem('clias_token');
    const storedUser = localStorage.getItem('clias_user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('clias_token');
        localStorage.removeItem('clias_user');
        setToken(null);
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<UserSession> => {
    const res = await api.post('/auth/login', { email, password });
    const { accessToken, user: sessionUser } = res;

    localStorage.setItem('clias_token', accessToken);
    localStorage.setItem('clias_user', JSON.stringify(sessionUser));

    setToken(accessToken);
    setUser(sessionUser);

    return sessionUser;
  };

  const logout = () => {
    localStorage.removeItem('clias_token');
    localStorage.removeItem('clias_user');
    setToken(null);
    setUser(null);
    router.push('/auth/login');
  };

  const updateUser = (updates: Partial<UserSession>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      try {
        localStorage.setItem('clias_user', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const hasRole = (roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser, hasRole }}>
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
