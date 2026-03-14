'use client';

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileAppShell } from './MobileAppShell';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuthStore } from '@/lib/store/auth';
import type { Permission } from '@/lib/auth/rbac';

interface AppShellProps {
  children: React.ReactNode;
  requiredPermissions?: Permission[];
  requireAll?: boolean;
}

export function AppShell({ 
  children, 
  requiredPermissions,
  requireAll 
}: AppShellProps) {
  const user = useAuthStore((state) => state.user);

  // Для ассистентов используем мобильную версию
  if (user?.role === 'ASSISTANT') {
    return (
      <MobileAppShell 
        requiredPermissions={requiredPermissions}
        requireAll={requireAll}
      >
        {children}
      </MobileAppShell>
    );
  }

  // Для остальных ролей используем обычную версию
  return (
    <ProtectedRoute 
      requiredPermissions={requiredPermissions}
      requireAll={requireAll}
    >
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
