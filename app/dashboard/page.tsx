'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  DollarSign, 
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Activity
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store/auth';
import { usePermissions } from '@/hooks/usePermissions';
import { api } from '@/api/client';
import type { DashboardAnalytics } from '@/types';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { can } = usePermissions();
  const router = useRouter();

  // Оператор сразу перенаправляется на расписание
  useEffect(() => {
    if (user?.role === 'OPERATOR') {
      router.push('/schedule');
    }
  }, [user, router]);

  // Загрузка аналитики - только если есть права и не оператор
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: async () => {
      const response = await api.get<{ data: DashboardAnalytics }>(
        '/api/analytics/dashboard'
      );
      return response.data;
    },
    enabled: can('view:analytics') && user?.role !== 'OPERATOR',
  });

  const stats = [
    {
      title: 'Записей сегодня',
      value: analytics?.today.appointments || 0,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      visible: can('view:schedule'),
    },
    {
      title: 'Пациентов сегодня',
      value: analytics?.today.patients || 0,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      visible: can('view:patients'),
    },
    {
      title: 'Выручка сегодня',
      value: `${(analytics?.today.revenue || 0).toLocaleString()} ₸`,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      visible: can('view:analytics'),
    },
    {
      title: 'Конверсия за месяц',
      value: `${(analytics?.month.conversionRate || 0).toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      visible: can('view:analytics'),
    },
  ];

  const quickActions = [
    {
      title: 'Расписание',
      description: 'Просмотр и управление записями',
      icon: Calendar,
      href: '/schedule',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      visible: can('view:schedule'),
    },
    {
      title: 'Пациенты',
      description: 'База данных пациентов',
      icon: Users,
      href: '/patients',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      visible: can('view:patients'),
    },
    {
      title: 'Касса',
      description: 'Платежи и возвраты',
      icon: DollarSign,
      href: '/payments',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      visible: can('view:payments'),
    },
    {
      title: 'Аналитика',
      description: 'Отчёты и статистика',
      icon: Activity,
      href: '/analytics',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      visible: can('view:analytics'),
    },
  ];

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Добро пожаловать, {user?.name}!
          </h1>
          <p className="text-gray-600 mt-1">
            {new Date().toLocaleDateString('ru-RU', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {/* Stats Grid */}
        {can('view:analytics') && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats
              .filter((stat) => stat.visible)
              .map((stat, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-sm p-6 border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {isLoading ? (
                      <div className="h-8 w-20 bg-gray-200 animate-pulse rounded" />
                    ) : (
                      stat.value
                    )}
                  </div>
                  <div className="text-sm text-gray-600">{stat.title}</div>
                </div>
              ))}
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Быстрые действия
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions
              .filter((action) => action.visible)
              .map((action, index) => (
                <Link key={index} href={action.href}>
                  <div
                    className={`${action.bgColor} rounded-lg p-6 cursor-pointer hover:shadow-md transition-all border border-transparent hover:border-gray-200`}
                  >
                    <action.icon className={`w-8 h-8 ${action.color} mb-3`} />
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </div>
                </Link>
              ))}
          </div>
        </div>

        {/* Top Doctors */}
        {can('view:analytics') && analytics?.topDoctors && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Топ врачей за месяц
            </h2>
            <div className="space-y-4">
              {analytics.topDoctors.slice(0, 5).map((doctor, index) => (
                <div
                  key={doctor.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                      <span className="text-lg font-bold text-blue-600">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {doctor.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {doctor.department.name}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {doctor.revenue.toLocaleString()} ₸
                    </div>
                    <div className="text-sm text-gray-600">
                      {doctor.patients} пациентов
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Services */}
        {can('view:analytics') && analytics?.topServices && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Популярные услуги за месяц
            </h2>
            <div className="space-y-4">
              {analytics.topServices.slice(0, 5).map((service, index) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                      <span className="text-lg font-bold text-green-600">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {service.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {service.price.toLocaleString()} ₸
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {service.revenue.toLocaleString()} ₸
                    </div>
                    <div className="text-sm text-gray-600">
                      {service.count} записей
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
