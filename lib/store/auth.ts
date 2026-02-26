/**
 * Zustand store для аутентификации
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Role } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  updateToken: (accessToken: string) => void;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (user, accessToken, refreshToken) => {
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
        
        // Сохраняем токен в cookie для middleware
        if (typeof document !== 'undefined') {
          document.cookie = `accessToken=${accessToken}; path=/; max-age=900`; // 15 минут
        }
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
        
        // Удаляем cookie
        if (typeof document !== 'undefined') {
          document.cookie = 'accessToken=; path=/; max-age=0';
        }
      },

      updateToken: (accessToken) => {
        set({ accessToken });
        
        // Обновляем cookie
        if (typeof document !== 'undefined') {
          document.cookie = `accessToken=${accessToken}; path=/; max-age=900`;
        }
      },

      updateUser: (user) => {
        set({ user, isAuthenticated: true });
      },
    }),
    {
      name: 'auth-storage',
      // При восстановлении из localStorage проверяем наличие токенов
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken && state?.refreshToken && state?.user) {
          state.isAuthenticated = true;
        }
      },
    }
  )
);
