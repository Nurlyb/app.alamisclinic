'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/api/client';
import type { Appointment } from '@/types';
import toast from 'react-hot-toast';

const medicalRecordSchema = z.object({
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
});

type MedicalRecordFormData = z.infer<typeof medicalRecordSchema>;

interface MedicalRecordFormProps {
  appointment: Appointment;
  onSuccess?: () => void;
}

export function MedicalRecordForm({ appointment, onSuccess }: MedicalRecordFormProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MedicalRecordFormData>({
    resolver: zodResolver(medicalRecordSchema),
  });

  const mutation = useMutation({
    mutationFn: async (data: MedicalRecordFormData) => {
      return api.post('/api/medical-records', {
        appointmentId: appointment.id,
        ...data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Медицинская запись сохранена');
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Ошибка сохранения');
    },
  });

  const onSubmit = (data: MedicalRecordFormData) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-medium text-blue-900 mb-2">Пациент</h3>
        <p className="text-sm text-blue-800">{appointment.patient.fullName}</p>
        <p className="text-xs text-blue-600">{appointment.patient.phone}</p>
      </div>

      <div>
        <Label>Диагноз</Label>
        <Textarea
          {...register('diagnosis')}
          placeholder="Введите диагноз..."
          className="mt-2 min-h-[100px]"
        />
        {errors.diagnosis && (
          <p className="text-sm text-red-600 mt-1">{errors.diagnosis.message}</p>
        )}
      </div>

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
