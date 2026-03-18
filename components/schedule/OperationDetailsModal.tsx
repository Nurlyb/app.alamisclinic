'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Calendar, 
  Clock, 
  DollarSign, 
  FileText, 
  UserCheck,
  Play,
  Pause,
  Square
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface OperationDetailsModalProps {
  operation: any;
  isOpen: boolean;
  onClose: () => void;
}

export function OperationDetailsModal({
  operation,
  isOpen,
  onClose,
}: OperationDetailsModalProps) {
  if (!operation) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-yellow-100 text-yellow-800';
      case 'PAID':
        return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS':
        return 'bg-green-100 text-green-800';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'Запланировано';
      case 'PAID':
        return 'Оплачено';
      case 'IN_PROGRESS':
        return 'В процессе';
      case 'COMPLETED':
        return 'Завершено';
      case 'CANCELLED':
        return 'Отменено';
      default:
        return status;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Детали операции
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Статус операции */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{operation.service?.name}</h3>
            <Badge className={getStatusColor(operation.status)}>
              {getStatusText(operation.status)}
            </Badge>
          </div>

          <Separator />

          {/* Информация о пациенте */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Пациент
            </h4>
            <div className="pl-6 space-y-1">
              <p className="font-medium">{operation.patient?.fullName}</p>
              <p className="text-sm text-muted-foreground">{operation.patient?.phone}</p>
            </div>
          </div>

          <Separator />

          {/* Время и дата */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Дата и время
              </h4>
              <div className="pl-6">
                {operation.scheduledDate && (
                  <p className="text-sm">
                    {format(new Date(operation.scheduledDate), 'dd.MM.yyyy HH:mm', { locale: ru })}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Стоимость
              </h4>
              <div className="pl-6">
                <p className="text-sm font-medium">
                  {Number(operation.price).toLocaleString()} ₸
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Ассистент */}
          {operation.assistant && (
            <>
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Ассистент
                </h4>
                <div className="pl-6">
                  <p className="text-sm">{operation.assistant.name}</p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Временные метки */}
          {(operation.startedAt || operation.completedDate) && (
            <>
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Временные метки
                </h4>
                <div className="pl-6 space-y-2">
                  {operation.startedAt && (
                    <div className="flex items-center gap-2">
                      <Play className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        Начато: {format(new Date(operation.startedAt), 'dd.MM.yyyy HH:mm', { locale: ru })}
                      </span>
                    </div>
                  )}
                  {operation.completedDate && (
                    <div className="flex items-center gap-2">
                      <Square className="h-4 w-4 text-gray-600" />
                      <span className="text-sm">
                        Завершено: {format(new Date(operation.completedDate), 'dd.MM.yyyy HH:mm', { locale: ru })}
                      </span>
                    </div>
                  )}
                  {operation.duration && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">
                        Длительность: {operation.duration} мин
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Примечания */}
          {operation.notes && (
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Примечания
              </h4>
              <div className="pl-6">
                <p className="text-sm text-muted-foreground">{operation.notes}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}