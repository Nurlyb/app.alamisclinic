'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  Calendar, 
  CheckCircle, 
  UserCheck, 
  CheckSquare, 
  XCircle, 
  UserX,
  ArrowRightLeft,
  Clock,
  Loader2
} from 'lucide-react';
import { api } from '@/api/client';

interface AppointmentStatsProps {
  date: Date;
  managerId?: string;
}

interface Stats {
  total: number;
  pending: number;
  confirmed: number;
  arrived: number;
  done: number;
  cancelled: number;
  noShow: number;
  transferred: number;
}

export function AppointmentStats({ date, managerId }: AppointmentStatsProps) {
  // Загрузка статистики
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['appointment-stats', format(date, 'yyyy-MM-dd'), managerId],
    queryFn: async () => {
      const params = new URLSearchParams({
        date: format(date, 'yyyy-MM-dd'),
      });
      if (managerId) {
        params.append('managerId', managerId);
      }
      const response = await api.get<{ data: Stats }>(
        `/api/appointments/stats?${params.toString()}`
      );
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="ml-2 text-sm text-gray-600">Загрузка статистики...</span>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const statItems = [
    {
      label: 'Всего записей',
      value: stats.total,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Ожидание',
      value: stats.pending,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      label: 'Подтверждено',
      value: stats.confirmed,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Прибыл',
      value: stats.arrived,
      icon: UserCheck,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
    },
    {
      label: 'Выполнено',
      value: stats.done,
      icon: CheckSquare,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      label: 'Отменено',
      value: stats.cancelled,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      label: 'Не пришел',
      value: stats.noShow,
      icon: UserX,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      label: 'Перенесено',
      value: stats.transferred,
      icon: ArrowRightLeft,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">
        📊 Статистика за {format(date, 'dd.MM.yyyy')}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={`${item.bgColor} rounded-lg p-3 transition-all hover:shadow-md`}
            >
              <div className="flex items-center justify-between mb-1">
                <Icon className={`w-4 h-4 ${item.color}`} />
                <span className={`text-xl font-bold ${item.color}`}>
                  {item.value}
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-tight">
                {item.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
