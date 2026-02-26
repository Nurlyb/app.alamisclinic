'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth';
import { usePermissions } from '@/hooks/usePermissions';
import type { Permission } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: Permission[];
  requireAll?: boolean; // true = нужны все права, false = хотя бы одно
}

export function ProtectedRoute({
  children,
  requiredPermissions = [],
  requireAll = false,
}: ProtectedRouteProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { canAll, canAny } = usePermissions();

  useEffect(() => {
    // Если не авторизован - редирект на логин
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Если указаны требуемые права - проверяем
    if (requiredPermissions.length > 0) {
      const hasPermission = requireAll
        ? canAll(requiredPermissions)
        : canAny(requiredPermissions);

      if (!hasPermission) {
        router.push('/403'); // Страница "Доступ запрещён"
      }
    }
  }, [isAuthenticated, requiredPermissions, requireAll, canAll, canAny, router]);

  // Показываем loading пока проверяем
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
