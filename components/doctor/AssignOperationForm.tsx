'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
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
import { api } from '@/api/client';
import toast from 'react-hot-toast';

// Временные слоты (каждые 30 минут с 8:00 до 20:00)
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8;
  const minute = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minute}`;
});

const assignOperationSchema = z.object({
  serviceId: z.string().min(1, 'Выберите услугу'),
  price: z.number().positive('Цена должна быть положительной'),
  notes: z.string().optional(),
  scheduledDate: z.string().min(1, 'Выберите дату'),
  scheduledTime: z.string().min(1, 'Выберите время'),
});

type AssignOperationFormData = z.infer<typeof assignOperationSchema>;

interface AssignOperationFormProps {
  patientId: string;
  patientName: string;
  onSuccess?: () => void;
}

export function AssignOperationForm({
  patientId,
  patientName,
  onSuccess,
}: AssignOperationFormProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<AssignOperationFormData>({
    resolver: zodResolver(assignOperationSchema),
    defaultValues: {
      price: 0,
      scheduledDate: '',
      scheduledTime: '',
    },
  });

  const selectedDate = watch('scheduledDate');
  const selectedTime = watch('scheduledTime');

  // Загрузка занятых слотов на выбранную дату
  const { data: bookedSlots = [] } = useQuery({
    queryKey: ['booked-slots', selectedDate],
    queryFn: async () => {
      if (!selectedDate) return [];
      const response = await api.get(
        `/api/doctor-service-assignments/calendar?date=${selectedDate}`
      ) as { data?: any[] };
      return response.data?.map((item: any) => item.time) || [];
    },
    enabled: !!selectedDate,
  });

  // Загрузка услуг докторов
  const { data: services = [] } = useQuery({
    queryKey: ['doctor-services'],
    queryFn: async () => {
      const response = await api.get('/api/doctor-services') as { data?: { services?: any[] } };
      return response.data?.services || [];
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: AssignOperationFormData) => {
      // Объединяем дату и время в один DateTime
      const scheduledDateTime = new Date(`${data.scheduledDate}T${data.scheduledTime}:00`);
      
      return api.post('/api/doctor-service-assignments', {
        patientId,
        serviceId: data.serviceId,
        price: data.price,
        notes: data.notes,
        scheduledDate: scheduledDateTime.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-service-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['patient-operations'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['operations-calendar'] }); // Добавлено для обновления календаря
      toast.success('Услуга назначена');
      // Очищаем форму для следующего назначения
      reset({
        serviceId: '',
        price: 0,
        scheduledDate: '',
        scheduledTime: '',
        notes: '',
      });
      // НЕ закрываем модальное окно - оставляем карточку открытой
      // onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Ошибка назначения');
    },
  });

  const onSubmit = (data: AssignOperationFormData) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-medium text-blue-900 mb-1">Пациент</h3>
        <p className="text-sm text-blue-800">{patientName}</p>
      </div>

      <div>
        <Label>Операция *</Label>
        <Select
          value={watch('serviceId')}
          onValueChange={(value) => setValue('serviceId', value)}
        >
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Выберите услугу" />
          </SelectTrigger>
          <SelectContent>
            {services.map((service: any) => (
              <SelectItem key={service.id} value={service.id}>
                {service.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.serviceId && (
          <p className="text-sm text-red-600 mt-1">{errors.serviceId.message}</p>
        )}
      </div>

      <div>
        <Label>Цена услуги (₸) *</Label>
        <Input
          type="number"
          {...register('price', { valueAsNumber: true })}
          placeholder="0"
          className="mt-2"
        />
        {errors.price && (
          <p className="text-sm text-red-600 mt-1">{errors.price.message}</p>
        )}
      </div>

      <div>
        <Label>Дата *</Label>
        <Input
          type="date"
          {...register('scheduledDate')}
          className="mt-2"
          min={new Date().toISOString().split('T')[0]}
        />
        {errors.scheduledDate && (
          <p className="text-sm text-red-600 mt-1">{errors.scheduledDate.message}</p>
        )}
      </div>

      <div>
        <Label>Время *</Label>
        <Select
          value={selectedTime}
          onValueChange={(value) => setValue('scheduledTime', value)}
          disabled={!selectedDate}
        >
          <SelectTrigger className="mt-2">
            <SelectValue placeholder={selectedDate ? "Выберите время" : "Сначала выберите дату"} />
          </SelectTrigger>
          <SelectContent>
            {TIME_SLOTS.map((time) => {
              const isBooked = bookedSlots.includes(time);
              const now = new Date();
              const slotDateTime = new Date(selectedDate);
              const [hours, minutes] = time.split(':');
              slotDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
              const isPast = slotDateTime < now;
              
              return (
                <SelectItem 
                  key={time} 
                  value={time}
                  disabled={isBooked || isPast}
                >
                  {time} {isBooked ? '(занято)' : isPast ? '(прошло)' : ''}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {errors.scheduledTime && (
          <p className="text-sm text-red-600 mt-1">{errors.scheduledTime.message}</p>
        )}
        {selectedDate && bookedSlots.length > 0 && (
          <p className="text-xs text-gray-600 mt-1">
            Занято слотов: {bookedSlots.length} из {TIME_SLOTS.length}
          </p>
        )}
      </div>

      <div>
        <Label>Примечания (необязательно)</Label>
        <Textarea
          {...register('notes')}
          placeholder="Дополнительная информация..."
          className="mt-2 min-h-[100px]"
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          type="submit"
          className="flex-1"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Назначение...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Назначить услугу
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
