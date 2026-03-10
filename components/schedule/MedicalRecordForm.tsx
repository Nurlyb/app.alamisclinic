'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Loader2, Save, User, FileText, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiClient as api } from '@/lib/api/client';
import type { Appointment } from '@/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const medicalRecordSchema = z.object({
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  // Поля пациента
  fullName: z.string().min(1, 'ФИО обязательно'),
  phone: z.string().min(1, 'Телефон обязателен'),
});

type MedicalRecordFormData = z.infer<typeof medicalRecordSchema>;

interface MedicalRecordFormProps {
  appointment: Appointment;
  onSuccess?: () => void;
}

export function MedicalRecordForm({ appointment, onSuccess }: MedicalRecordFormProps) {
  const queryClient = useQueryClient();

  // Загрузка предыдущих медицинских записей пациента
  const { data: previousRecords = [] } = useQuery({
    queryKey: ['patient-medical-records', appointment.patientId],
    queryFn: async () => {
      const response: any = await api.get(
        `/api/medical-records?patientId=${appointment.patientId}`
      );
      return response.records || [];
    },
    refetchOnMount: 'always', // Всегда перезагружать при открытии
    staleTime: 0, // Данные сразу считаются устаревшими
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<MedicalRecordFormData>({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: {
      fullName: appointment.patient.fullName,
      phone: appointment.patient.phone,
      diagnosis: '',
      notes: '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: MedicalRecordFormData) => {
      // Сначала обновляем данные пациента
      await api.put(`/api/patients/${appointment.patientId}`, {
        fullName: data.fullName,
        phone: data.phone,
      });
      
      // Затем сохраняем медицинскую запись
      return api.post('/api/medical-records', {
        appointmentId: appointment.id,
        diagnosis: data.diagnosis,
        notes: data.notes,
      });
    },
    onSuccess: async () => {
      // Инвалидируем кеш
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['patient-operations'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
      
      // Принудительно перезагружаем историю диагнозов и ждем завершения
      await queryClient.refetchQueries({ 
        queryKey: ['patient-medical-records', appointment.patientId],
        type: 'active'
      });
      
      toast.success('Диагноз добавлен в историю');
      
      // Очищаем только поля диагноза и примечаний, оставляем данные пациента
      reset({
        fullName: appointment.patient.fullName,
        phone: appointment.patient.phone,
        diagnosis: '',
        notes: '',
      });
      
      // Вызываем callback если он передан (для закрытия модального окна и открытия карточки)
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Ошибка сохранения';
      toast.error(message);
    },
  });

  const onSubmit = (data: MedicalRecordFormData) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* История предыдущих диагнозов */}
      {previousRecords.length > 0 && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-gray-700" />
            <h3 className="font-bold text-gray-900">История диагнозов</h3>
            <span className="text-xs text-gray-600">({previousRecords.length})</span>
          </div>
          
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {previousRecords.map((record: any) => (
              <div
                key={record.id}
                className="bg-white rounded-lg border border-gray-200 p-3 text-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {format(new Date(record.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru })}
                    </span>
                  </div>
                </div>
                
                {record.diagnosis && (
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-700 mb-1">Диагноз:</p>
                    <p className="text-gray-900">{record.diagnosis}</p>
                  </div>
                )}
                
                {record.notes && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Примечания:</p>
                    <p className="text-gray-600">{record.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Карточка пациента */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 p-4 space-y-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg text-blue-900 flex items-center gap-2">
            <User className="w-5 h-5" />
            Карточка пациента
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* ФИО */}
          <div>
            <Label className="text-xs">ФИО *</Label>
            <Input
              {...register('fullName')}
              placeholder="Введите ФИО"
              className="mt-1"
            />
            {errors.fullName && (
              <p className="text-xs text-red-600 mt-1">{errors.fullName.message}</p>
            )}
          </div>

          {/* Телефон */}
          <div>
            <Label className="text-xs">Телефон *</Label>
            <Input
              {...register('phone')}
              placeholder="+7 700 123 45 67"
              className="mt-1"
            />
            {errors.phone && (
              <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Диагноз */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Новый диагноз</Label>
          {previousRecords.length > 0 && (
            <span className="text-xs text-blue-600">
              ✓ Будет добавлен к истории
            </span>
          )}
        </div>
        <Textarea
          {...register('diagnosis')}
          placeholder="Введите диагноз..."
          className="mt-2 min-h-[100px]"
        />
        {errors.diagnosis && (
          <p className="text-sm text-red-600 mt-1">{errors.diagnosis.message}</p>
        )}
      </div>

      {/* Примечания */}
      <div>
        <Label>Примечания / Рекомендации</Label>
        <Textarea
          {...register('notes')}
          placeholder="Введите примечания, рекомендации..."
          className="mt-2 min-h-[150px]"
        />
        {errors.notes && (
          <p className="text-sm text-red-600 mt-1">{errors.notes.message}</p>
        )}
      </div>

      {/* Кнопка сохранения */}
      <Button
        type="submit"
        className="w-full"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Сохранение...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Сохранить запись
          </>
        )}
      </Button>
    </form>
  );
}
