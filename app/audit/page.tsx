'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/lib/api/client';
import { formatDateTime } from '@/lib/utils/date';

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  tableName: string;
  recordId: string;
  oldValue: any;
  newValue: any;
  ip: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    phone: string;
    role: string;
  };
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Создание',
  UPDATE: 'Обновление',
  DELETE: 'Удаление',
  LOGIN: 'Вход',
  LOGOUT: 'Выход',
  VIEW: 'Просмотр',
  APPROVE: 'Одобрение',
  REJECT: 'Отклонение',
  PAYMENT: 'Оплата',
  REFUND: 'Возврат',
};

const TABLE_LABELS: Record<string, string> = {
  users: 'Пользователи',
  patients: 'Пациенты',
  appointments: 'Записи',
  services: 'Услуги',
  departments: 'Отделения',
  payments: 'Оплаты',
  refunds: 'Возвраты',
  directions: 'Направления',
};

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    action: '',
    tableName: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });
      if (filters.action) params.append('action', filters.action);
      if (filters.tableName) params.append('tableName', filters.tableName);

      const response = await apiClient.get<{ data: { logs: AuditLog[]; pagination: any } }>(
        `/api/audit?${params}`
      );
      return response.data;
    },
  });

  const logs = data?.logs || [];
  const pagination = data?.pagination;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Журнал действий</h1>
            <p className="text-gray-600">История всех действий пользователей</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <div className="flex-1 grid grid-cols-2 gap-4">
            <Select
              value={filters.action}
              onValueChange={(value) => {
                setFilters({ ...filters, action: value });
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Все действия" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Все действия</SelectItem>
                {Object.entries(ACTION_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.tableName}
              onValueChange={(value) => {
                setFilters({ ...filters, tableName: value });
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Все таблицы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Все таблицы</SelectItem>
                {Object.entries(TABLE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Дата и время
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Пользователь
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Действие
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Таблица
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  IP адрес
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Загрузка...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Записей не найдено
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium">{log.user.name}</div>
                      <div className="text-xs text-gray-500">{log.user.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {TABLE_LABELS[log.tableName] || log.tableName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {log.ip || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="px-4 py-3 border-t flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Страница {pagination.page} из {pagination.pages} (всего: {pagination.total})
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Назад
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.pages}
              >
                Вперед
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
