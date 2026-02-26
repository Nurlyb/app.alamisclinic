'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  Calendar, 
  Users, 
  ArrowRightLeft, 
  CreditCard, 
  DollarSign, 
  BarChart3, 
  Settings, 
  FileText,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/auth';
import { usePermissions } from '@/hooks/usePermissions';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  permission?: string;
  badge?: number;
}

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const { can } = usePermissions();

  // Навигация по ролям
  const getNavItems = (): NavItem[] => {
    const items: NavItem[] = [];

    // Для оператора показываем только расписание
    if (user?.role === 'OPERATOR') {
      items.push({
        label: 'Расписание',
        href: '/schedule',
        icon: <Calendar className="w-5 h-5" />,
      });
      return items;
    }

    // Расписание - для всех остальных
    if (can('view:schedule')) {
      items.push({
        label: 'Расписание',
        href: '/schedule',
        icon: <Calendar className="w-5 h-5" />,
      });
    }

    // Направления - для операторов и врачей
    if (can('view:directions')) {
      items.push({
        label: 'Направления',
        href: '/directions',
        icon: <ArrowRightLeft className="w-5 h-5" />,
        badge: 0, // TODO: получать из API
      });
    }

    // Пациенты
    if (can('view:patients')) {
      items.push({
        label: 'Пациенты',
        href: '/patients',
        icon: <Users className="w-5 h-5" />,
      });
    }

    // Касса/Платежи
    if (can('view:payments')) {
      items.push({
        label: user?.role === 'RECEPTIONIST' ? 'Касса' : 'Платежи',
        href: '/payments',
        icon: <CreditCard className="w-5 h-5" />,
      });
    }

    // Зарплата - для врачей и владельца
    if (can('view:salary')) {
      items.push({
        label: user?.role === 'DOCTOR' ? 'Моя зарплата' : 'Зарплаты',
        href: '/salary',
        icon: <DollarSign className="w-5 h-5" />,
      });
    }

    // Аналитика - только для владельца и менеджера
    if (can('view:analytics')) {
      items.push({
        label: 'Аналитика',
        href: '/analytics',
        icon: <BarChart3 className="w-5 h-5" />,
      });
    }

    // Настройки - только для владельца
    if (can('manage:users') || can('manage:services')) {
      items.push({
        label: 'Настройки',
        href: '/settings',
        icon: <Settings className="w-5 h-5" />,
      });
    }

    // Журнал действий - только для владельца
    if (can('view:audit_log')) {
      items.push({
        label: 'Журнал действий',
        href: '/audit',
        icon: <FileText className="w-5 h-5" />,
      });
    }

    return items;
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center justify-center">
          <Image
            src="/alamis_logo.png"
            alt="Alamis Clinic"
            width={140}
            height={50}
            className="object-contain"
            priority
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              <div className="flex items-center space-x-3">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-700 font-semibold text-sm">
              {user?.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name}
            </p>
            <p className="text-xs text-gray-500">
              {user?.role}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
