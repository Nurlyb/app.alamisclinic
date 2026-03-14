'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, Calendar, Users, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuthStore } from '@/lib/store/auth';
import { authApi } from '@/api/auth.api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import type { Permission } from '@/lib/auth/rbac';

interface MobileAppShellProps {
  children: React.ReactNode;
  requiredPermissions?: Permission[];
  requireAll?: boolean;
}

export function MobileAppShell({ 
  children, 
  requiredPermissions,
  requireAll 
}: MobileAppShellProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    try {
      await authApi.logout();
      logout();
      router.push('/login');
      toast.success('Вы вышли из системы');
    } catch (error) {
      console.error('Logout error:', error);
      logout();
      router.push('/login');
    }
  };

  const menuItems = [
    {
      label: 'Расписание',
      href: '/schedule',
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      label: 'Мои пациенты',
      href: '/doctor-patients',
      icon: <Users className="w-5 h-5" />,
    },
  ];

  const userInitials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <ProtectedRoute 
      requiredPermissions={requiredPermissions}
      requireAll={requireAll}
    >
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Mobile Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Меню</h2>
                  </div>

                  {/* Navigation */}
                  <nav className="flex-1 p-4 space-y-2">
                    {menuItems.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                      
                      return (
                        <button
                          key={item.href}
                          onClick={() => {
                            router.push(item.href);
                            setIsMenuOpen(false);
                          }}
                          className={cn(
                            'w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors text-left',
                            isActive
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-700 hover:bg-gray-50'
                          )}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </nav>

                  {/* User info and logout */}
                  <div className="p-4 border-t border-gray-200 space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-700 font-semibold text-sm">
                          {userInitials}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user?.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Ассистент
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      size="sm"
                      className="w-full text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Выйти
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            
            <h1 className="text-lg font-semibold text-gray-900">
              {pathname === '/schedule' ? 'Расписание' : 
               pathname === '/doctor-patients' ? 'Мои пациенты' : 'Alamis Clinic'}
            </h1>
          </div>

          {/* User avatar */}
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-700 font-semibold text-xs">
              {userInitials}
            </span>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}