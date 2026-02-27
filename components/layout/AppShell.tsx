'use client';

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
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
