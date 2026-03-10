'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/api/client';
import toast from 'react-hot-toast';

const doctorServiceSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().optional(),
});

type DoctorServiceFormData = z.infer<typeof doctorServiceSchema>;

interface DoctorServiceFormProps {
  service?: any;
  onSuccess?: () => void;
}

export function DoctorServiceForm({ service, onSuccess }: DoctorServiceFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!service;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DoctorServiceFormData>({
    resolver: zodResolver(doctorServiceSchema),
    defaultValues: service
      ? {
          name: service.name,
          description: service.description || '',
        }
      : undefined,
  });

  const mutation = useMutation({
    mutationFn: async (data: DoctorServiceFormData) => {
      if (isEdit) {
        return api.put(`/api/doctor-services/${service.id}`, data);
      }
      return api.post('/api/doctor-services', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-services'] });
      toast.success(isEdit ? 'Услуга обновлена' : 'Услуга создана');
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Ошибка сохранения');
    },
  });

  const onSubmit = (data: DoctorServiceFormData) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label>Название операции</Label>
        <Input
          {...register('name')}
          placeholder="Например: Лапароскопия, Эндоскопия..."
          className="mt-2"
        />
        {errors.name && (
          <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label>Описание (необязательно)</Label>
        <Textarea
          {...register('description')}
          placeholder="Краткое описание операции..."
          className="mt-2 min-h-[100px]"
        />
        {errors.description && (
          <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
        )}
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
              Сохранение...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {isEdit ? 'Обновить' : 'Создать'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
