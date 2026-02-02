'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getCachedUser, setCachedUser, clearAuth } from '@/lib/auth';
import { getMe } from '@/lib/api';
import type { User } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  refreshUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const validateSession = async () => {
    const token = getToken();

    if (!token) {
      // No token, clear everything and redirect to login
      clearAuth();
      setUser(null);
      setIsLoading(false);
      router.push('/');
      return;
    }

    // Try cached user first for immediate UI
    const cached = getCachedUser();
    if (cached) {
      setUser(cached);
    }

    // Always validate with server (source of truth)
    const result = await getMe();

    if (result.ok && result.data) {
      // Token is valid, update user
      const validatedUser = result.data.user;
      setUser(validatedUser);
      setCachedUser(validatedUser);
      setIsLoading(false);
    } else {
      // Token is invalid or network error
      clearAuth();
      setUser(null);
      setIsLoading(false);
      router.push('/');
    }
  };

  useEffect(() => {
    validateSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshUser = async () => {
    await validateSession();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-sm text-gray-600">Validating session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
