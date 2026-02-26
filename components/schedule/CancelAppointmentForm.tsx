'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { appointmentsApi } from '@/api/appointments.api';
import type { Appointment } from '@/types';
import { AppointmentStatus } from '@/types';
import toast from 'react-hot-toast';

interface CancelAppointmentFormProps {
  appointment: Appointment;
  onSuccess?: () => void;
}

export function CancelAppointmentForm({ 
  appointment, 
  onSuccess 
}: CancelAppointmentFormProps) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  // Отмена записи
  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!reason.trim()) {
        throw new Error('Укажите причину отмены');
      }
      
      return appointmentsApi.update(appointment.id, {
        status: AppointmentStatus.CANCELLED,
        comment: `${appointment.comment || ''}\n\nПричина отмены: ${reason}`.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Запись отменена');
      onSuccess?.();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'Ошибка отмены';
      toast.error(errorMessage);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Причина отмены обязательна');
      return;
    }
    
    setError('');
    cancelMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Информация о записи */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <p className="text-sm font-medium text-gray-900 mb-1">
          {appointment.patient.fullName}
        </p>
        <p className="text-sm text-gray-600">
          {appointment.doctor.name} • {appointment.service.name}
        </p>
        <p className="text-sm text-gray-600">
          {appointment.date} в {appointment.time}
        </p>
      </div>

      {/* Причина отмены */}
      <div>
        <Label>Причина отмены/переноса *</Label>
        <Textarea
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setError('');
          }}
          placeholder="Укажите причину отмены или переноса записи..."
          className="mt-2"
          rows={4}
        />
        {error && (
          <p className="text-sm text-red-600 mt-1">{error}</p>
        )}
      </div>

      {/* Кнопки */}
      <div className="flex gap-2">
        <Button
          type="submit"
          variant="outline"
          className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
          disabled={cancelMutation.isPending}
        >
          {cancelMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Отмена...
            </>
          ) : (
            'Отменить запись'
          )}
        </Button>
      </div>

      <p className="text-xs text-gray-500 text-center">
        После отмены запись будет помечена как отменённая
      </p>
    </form>
  );
}
