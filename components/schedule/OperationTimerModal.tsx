'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Square, Clock, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth';
import toast from 'react-hot-toast';

interface Operation {
  id: string;
  patientId: string;
  doctorId: string;
  serviceId: string;
  assistantId?: string;
  assistantTakenAt?: string;
  price: number;
  notes: string | null;
  status: string;
  scheduledDate: string | null;
  completedDate: string | null;
  startedAt: string | null;
  duration: number | null;
  patient: {
    id: string;
    fullName: string;
    phone: string;
  };
  service: {
    id: string;
    name: string;
  };
  assistant?: {
    id: string;
    name: string;
  };
}

interface OperationTimerModalProps {
  operation: Operation | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OperationTimerModal({ operation, isOpen, onClose }: OperationTimerModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Сброс состояния при открытии/закрытии модального окна
  useEffect(() => {
    if (!isOpen || !operation) {
      setIsRunning(false);
      setElapsedTime(0);
      setStartTime(null);
      return;
    }

    // Если операция уже запущена, восстанавливаем состояние
    if (operation.startedAt && operation.status === 'IN_PROGRESS') {
      const started = new Date(operation.startedAt);
      setStartTime(started);
      setIsRunning(true);
      setElapsedTime(Math.floor((Date.now() - started.getTime()) / 1000));
    }
  }, [isOpen, operation]);

  // Таймер
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, startTime]);

  // Мутация для запуска операции
  const startMutation = useMutation({
    mutationFn: async () => {
      return api.patch(`/api/doctor-service-assignments/${operation?.id}/start`);
    },
    onSuccess: () => {
      const now = new Date();
      setStartTime(now);
      setIsRunning(true);
      setElapsedTime(0);
      queryClient.invalidateQueries({ queryKey: ['operations-calendar'] });
      toast.success('Операция запущена');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Ошибка запуска операции');
    },
  });

  // Мутация для завершения операции
  const completeMutation = useMutation({
    mutationFn: async () => {
      return api.patch(`/api/doctor-service-assignments/${operation?.id}/complete`, {
        duration: elapsedTime,
      });
    },
    onSuccess: () => {
      setIsRunning(false);
      queryClient.invalidateQueries({ queryKey: ['operations-calendar'] });
      toast.success('Операция завершена');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Ошибка завершения операции');
    },
  });

  const handleStart = () => {
    startMutation.mutate();
  };

  const handleComplete = () => {
    completeMutation.mutate();
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!operation) return null;

  // Проверяем права на запуск операции
  const canStart = operation.status === 'PAID' && !isRunning && (
    // Доктор может запускать свои операции
    (user?.role === 'DOCTOR' && operation.doctorId === user?.id) ||
    // Ассистент может запускать операции только если взял их на работу
    (user?.role === 'ASSISTANT' && operation.assistantId === user?.id)
  );
  
  const canComplete = (operation.status === 'IN_PROGRESS' || isRunning) && (
    // Доктор может завершать свои операции
    (user?.role === 'DOCTOR' && operation.doctorId === user?.id) ||
    // Ассистент может завершать операции только если взял их на работу
    (user?.role === 'ASSISTANT' && operation.assistantId === user?.id)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Выполнение операции
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Информация об операции */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2">{operation.service.name}</h3>
            <div className="space-y-1 text-sm text-blue-800">
              <div>Пациент: {operation.patient.fullName}</div>
              <div>Телефон: {operation.patient.phone}</div>
              <div>Стоимость: {operation.price.toLocaleString()} ₸</div>
            </div>
          </div>

          {/* Статус операции */}
          <div className="flex items-center justify-center">
            <Badge className={`text-sm px-3 py-1 ${
              operation.status === 'PAID' ? 'bg-yellow-100 text-yellow-800' :
              operation.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
              operation.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {operation.status === 'PAID' ? 'Оплачено' :
               operation.status === 'IN_PROGRESS' ? 'Выполняется' :
               operation.status === 'COMPLETED' ? 'Завершено' :
               operation.status}
            </Badge>
          </div>

          {/* Таймер */}
          <div className="text-center">
            <div className="text-3xl font-mono font-bold text-gray-900 mb-2">
              {formatTime(elapsedTime)}
            </div>
            <div className="text-sm text-gray-600">
              {isRunning ? 'Операция выполняется' : 'Время выполнения'}
            </div>
          </div>

          {/* Кнопки управления */}
          <div className="flex gap-3">
            {canStart && (
              <Button
                onClick={handleStart}
                disabled={startMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Начать {operation.service.name}
              </Button>
            )}

            {/* Информационные сообщения */}
            {user?.role === 'ASSISTANT' && operation.status === 'PAID' && !operation.assistantId && (
              <div className="flex-1 text-center text-sm text-amber-600 py-3 bg-amber-50 rounded-lg border border-amber-200">
                ⚠️ Сначала возьмите операцию на работу в расписании
              </div>
            )}

            {user?.role === 'ASSISTANT' && operation.status === 'PAID' && operation.assistantId && operation.assistantId !== user?.id && (
              <div className="flex-1 text-center text-sm text-red-600 py-3 bg-red-50 rounded-lg border border-red-200">
                🚫 Операцию взял другой ассистент: {operation.assistant?.name}
              </div>
            )}

            {user?.role === 'RECEPTIONIST' && (operation.status === 'PAID' || operation.status === 'IN_PROGRESS') && (
              <div className="flex-1 text-center text-sm text-blue-600 py-3 bg-blue-50 rounded-lg border border-blue-200">
                ℹ️ Только доктор или ассистент может управлять операцией
              </div>
            )}

            {canComplete && (
              <Button
                onClick={handleComplete}
                disabled={completeMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Завершить операцию
              </Button>
            )}

            {operation.status === 'COMPLETED' && (
              <div className="flex-1 text-center py-2 text-green-600 font-medium">
                <CheckCircle className="w-5 h-5 mx-auto mb-1" />
                Операция завершена
                {operation.duration && (
                  <div className="text-sm text-gray-600">
                    Длительность: {formatTime(operation.duration)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Примечания */}
          {operation.notes && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-1">Примечания:</div>
              <div className="text-sm text-gray-600">{operation.notes}</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}