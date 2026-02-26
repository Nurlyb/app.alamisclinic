'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/auth';
import { api } from '@/api/client';

interface AuthInitializerProps {
  children: React.ReactNode;
}

export function AuthInitializer({ children }: AuthInitializerProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const { accessToken, refreshToken, logout, updateUser } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      // Если есть токены, проверяем их валидность
      if (accessToken && refreshToken) {
        try {
          // Пытаемся получить данные текущего пользователя
          const response = await api.get('/api/auth/me');
          
          if (response.data?.data) {
            // Токен валиден, обновляем данные пользователя
            updateUser(response.data.data);
          } else {
            // Токен невалиден, разлогиниваем
            logout();
          }
        } catch (error) {
          // Ошибка при проверке токена, разлогиниваем
          console.error('Auth initialization error:', error);
          logout();
        }
      }
      
      setIsInitialized(true);
    };

    initAuth();
  }, []); // Запускаем только один раз при монтировании

  // Показываем загрузку пока инициализируемся
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
