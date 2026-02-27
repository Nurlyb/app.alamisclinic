'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  ArrowRight, 
  User, 
  Stethoscope,
  Calendar,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { directionsApi } from '@/api/directions.api';
import type { Direction, DirectionStatus } from '@/types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function DirectionsPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<DirectionStatus | 'ALL'>('ALL');

  // Загрузка направлений
  const { data: directions = [], isLoading } = useQuery({
    queryKey: ['directions', statusFilter],
    queryFn: async () => {
      const response = await directionsApi.getAll({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      return response.data || [];
    },
  });

  // Обновление статуса
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: DirectionStatus }) =>
      directionsApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directions'] });
      toast.success('Статус обновлён');
    },
    onError: () => {
      toast.error('Ошибка обновления статуса');
    },
  });

  const getStatusColor = (status: DirectionStatus) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      SCHEDULED: 'bg-blue-100 text-blue-800 border-blue-300',
      COMPLETED: 'bg-green-100 text-green-800 border-green-300',
      CANCELLED: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[status] || colors.PENDING;
  };

  const getStatusText = (status: DirectionStatus) => {
    const texts = {
      PENDING: 'Ожидание',
      SCHEDULED: 'Запланировано',
      COMPLETED: 'Выполнено',
      CANCELLED: 'Отменено',
    };
    return texts[status] || status;
  };

  const getStatusIcon = (status: DirectionStatus) => {
    const icons = {
      PENDING: Clock,
      SCHEDULED: Calendar,
      COMPLETED: CheckCircle,
      CANCELLED: XCircle,
    };
    return icons[status] || Clock;
  };

  return (
    <AppShell requiredPermissions={['directions:view:all', 'directions:view:own']}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Направления</h1>
            <p className="text-gray-600 mt-1">
              Всего: {directions.length}
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Новое направление
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Статус:</label>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as DirectionStatus | 'ALL')}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Все</SelectItem>
                <SelectItem value="PENDING">Ожидание</SelectItem>
                <SelectItem value="SCHEDULED">Запланировано</SelectItem>
                <SelectItem value="COMPLETED">Выполнено</SelectItem>
                <SelectItem value="CANCELLED">Отменено</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Directions List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : directions.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <ArrowRight className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Направлений нет
              </h3>
              <p className="text-gray-600 mb-4">
                Создайте новое направление для пациента
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Создать направление
              </Button>
            </div>
          ) : (
            directions.map((direction) => {
              const StatusIcon = getStatusIcon(direction.status);
              
              return (
                <div
                  key={direction.id}
                  className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {direction.patient.fullName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {direction.patient.phone}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(direction.status)}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {getStatusText(direction.status)}
                    </Badge>
                  </div>

                  {/* Direction Flow */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1 p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">От врача</div>
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-sm">
                          {direction.fromDoctor.name}
                        </span>
                      </div>
                    </div>

                    <ArrowRight className="w-6 h-6 text-gray-400 flex-shrink-0" />

                    <div className="flex-1 p-3 bg-blue-50 rounded-lg">
                      <div className="text-xs text-blue-600 mb-1">К врачу</div>
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-blue-400" />
                        <span className="font-medium text-sm">
                          {direction.toDoctor.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Service */}
                  <div className="mb-4">
                    <div className="text-sm text-gray-600 mb-1">Услуга</div>
                    <div className="font-medium text-gray-900">
                      {direction.service.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {direction.service.price.toLocaleString()} ₸
                    </div>
                  </div>

                  {/* Comment */}
                  {direction.comment && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">Комментарий</div>
                      <p className="text-sm text-gray-900">{direction.comment}</p>
                    </div>
                  )}

                  {/* Date */}
                  <div className="text-xs text-gray-500 mb-4">
                    Создано: {format(new Date(direction.createdAt), 'd MMMM yyyy, HH:mm', { locale: ru })}
                  </div>

                  {/* Actions */}
                  {direction.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: direction.id,
                            status: 'SCHEDULED' as DirectionStatus,
                          })
                        }
                        disabled={updateStatusMutation.isPending}
                      >
                        Запланировать
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: direction.id,
                            status: 'CANCELLED' as DirectionStatus,
                          })
                        }
                        disabled={updateStatusMutation.isPending}
                      >
                        Отменить
                      </Button>
                    </div>
                  )}

                  {direction.status === 'SCHEDULED' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: direction.id,
                            status: 'COMPLETED' as DirectionStatus,
                          })
                        }
                        disabled={updateStatusMutation.isPending}
                      >
                        Завершить
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: direction.id,
                            status: 'CANCELLED' as DirectionStatus,
                          })
                        }
                        disabled={updateStatusMutation.isPending}
                      >
                        Отменить
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Direction Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новое направление</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center text-gray-600">
            Форма создания направления будет добавлена в следующем шаге
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
