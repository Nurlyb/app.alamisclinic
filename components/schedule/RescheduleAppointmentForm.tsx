'use client';

import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Loader2, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { appointmentsApi } from '@/api/appointments.api';
import { api } from '@/api/client';
import type { Appointment } from '@/types';
import { AppointmentStatus } from '@/types';
import toast from 'react-hot-toast';

// Временные слоты (каждые 30 минут с 8:00 до 20:00)
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8;
  const minute = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minute}`;
});

interface RescheduleAppointmentFormProps {
  appointment: Appointment;
  onSuccess?: () => void;
}

export function RescheduleAppointmentForm({ 
  appointment, 
  onSuccess 
}: RescheduleAppointmentFormProps) {
  const queryClient = useQueryClient();
  const [newDate, setNewDate] = useState(appointment.date);
  const [newTime, setNewTime] = useState(appointment.time);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  // Загрузка записей на выбранную дату для проверки занятости
  const { data: appointmentsOnDate = [] } = useQuery({
    queryKey: ['appointments', newDate],
    queryFn: async () => {
      const response = await api.get<{ data: Appointment[] }>(
        `/api/appointments?date=${newDate}`
      );
      return response.data || [];
    },
    enabled: !!newDate,
  });

  // Проверка, занят ли слот
  const isTimeSlotOccupied = (time: string) => {
    return appointmentsOnDate.some(
      (apt) =>
        apt.time === time &&
        apt.doctorId === appointment.doctorId &&
        apt.id !== appointment.id &&
        apt.status !== 'CANCELLED' &&
        apt.status !== 'NO_SHOW'
    );
  };

  // Перенос записи
  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      if (!reason.trim()) {
        throw new Error('Укажите причину переноса');
      }

      if (!newDate || !newTime) {
        throw new Error('Выберите дату и время');
      }

      // Проверка на прошедшее время
      const selectedDateTime = new Date(`${newDate}T${newTime}`);
      if (selectedDateTime < new Date()) {
        throw new Error('Нельзя перенести на прошедшее время');
      }

      // Проверка занятости слота
      if (isTimeSlotOccupied(newTime)) {
        throw new Error('Выбранное время уже занято');
      }

      const localDateTime = new Date(`${newDate}T${newTime}:00`);
      const newDatetime = localDateTime.toISOString();
      
      // Обновляем существующую запись с новой датой/временем
      return api.patch(`/api/appointments/${appointment.id}`, {
        datetime: newDatetime,
        status: AppointmentStatus.TRANSFERRED,
        comment: `${appointment.comment || ''}\n\nПеренесено с ${appointment.date} ${appointment.time} на ${newDate} ${newTime}. Причина: ${reason}`.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Запись успешно перенесена');
      onSuccess?.();
    },
    onError: (error: any) => {
      const errorMessage = error.message || error.response?.data?.error || 'Ошибка переноса';
      toast.error(errorMessage);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Причина переноса обязательна');
      return;
    }

    if (!newDate || !newTime) {
      setError('Выберите дату и время');
      return;
    }
    
    setError('');
    rescheduleMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Информация о текущей записи */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <p className="text-sm font-medium text-gray-900 mb-1">
          {appointment.patient.fullName}
        </p>
        <p className="text-sm text-gray-600">
          {appointment.doctor.name} • {appointment.service.name}
        </p>
        <p className="text-sm text-gray-600">
          Текущее время: {appointment.date} в {appointment.time}
        </p>
      </div>

      {/* Новая дата */}
      <div>
        <Label>Новая дата *</Label>
        <div className="flex items-center gap-2 mt-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <Input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            min={format(new Date(), 'yyyy-MM-dd')}
            required
          />
        </div>
      </div>

      {/* Новое время */}
      <div>
        <Label>Новое время *</Label>
        <Select value={newTime} onValueChange={setNewTime} required>
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Выберите время" />
          </SelectTrigger>
          <SelectContent>
            {TIME_SLOTS.map((time) => {
              const isOccupied = isTimeSlotOccupied(time);
              const slotDateTime = new Date(`${newDate}T${time}`);
              const isPast = slotDateTime < new Date();
              
              return (
                <SelectItem 
                  key={time} 
                  value={time}
                  disabled={isOccupied || isPast}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {time}
                    {isOccupied && <span className="text-xs text-red-600">(занято)</span>}
                    {isPast && <span className="text-xs text-gray-400">(прошло)</span>}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Причина переноса */}
      <div>
        <Label>Причина переноса *</Label>
        <Textarea
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setError('');
          }}
          placeholder="Укажите причину переноса записи..."
          className="mt-2"
          rows={3}
          required
        />
        {error && (
          <p className="text-sm text-red-600 mt-1">{error}</p>
        )}
      </div>

      {/* Кнопки */}
      <div className="flex gap-2">
        <Button
          type="submit"
          className="flex-1"
          disabled={rescheduleMutation.isPending}
        >
          {rescheduleMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Перенос...
            </>
          ) : (
            'Перенести запись'
          )}
        </Button>
      </div>

      <p className="text-xs text-gray-500 text-center">
        Запись будет перенесена на новое время с сохранением всех данных
      </p>
    </form>
  );
}
