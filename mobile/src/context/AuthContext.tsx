import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { authApi } from '../api/authApi';
import {
  saveAccessToken,
  getAccessToken,
  removeAccessToken,
  cacheUserData,
  getCachedUserData,
  removeCachedUserData,
} from '../utils/storage';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (fields: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const restoreSession = useCallback(async () => {
    try {
      const storedToken = await getAccessToken();
      const cachedUser = await getCachedUserData();

      if (storedToken) {
        setAccessToken(storedToken);
        if (cachedUser) setUser(cachedUser);

        try {
          const freshUser = await authApi.getMe();
          setUser(freshUser);
          await cacheUserData(freshUser);
        } catch (error) {
          console.warn('Failed to refresh user profile from server:', error);
          if (!cachedUser) {
            await removeAccessToken();
            setAccessToken(null);
          }
        }
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await authApi.login(email, password);
    setAccessToken(res.accessToken);
    setUser(res.user);

    await saveAccessToken(res.accessToken);
    await cacheUserData(res.user);

    return res.user;
  };

  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch {
      // Ignore API errors on logout
    } finally {
      setAccessToken(null);
      setUser(null);
      await removeAccessToken();
      await removeCachedUserData();
    }
  };

  const updateUser = (fields: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...fields };
      cacheUserData(updated);
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated: !!user && !!accessToken,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
