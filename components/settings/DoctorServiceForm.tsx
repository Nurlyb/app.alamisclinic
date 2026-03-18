'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { api } from '@/lib/api/client';
import { departmentsApi } from '@/api/departments.api';
import type { Department } from '@/types';
import toast from 'react-hot-toast';

const doctorServiceSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().optional(),
  departmentIds: z.array(z.string()).min(1, 'Выберите хотя бы одно отделение'),
});

type DoctorServiceFormData = z.infer<typeof doctorServiceSchema>;

interface DoctorServiceFormProps {
  service?: any;
  onSuccess?: () => void;
}

export function DoctorServiceForm({ service, onSuccess }: DoctorServiceFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!service;

  // Загрузка отделений
  const { data: departments = [], isLoading: departmentsLoading } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await departmentsApi.getAll();
      return response.data || [];
    },
  });

  // Загрузка связанных отделений для редактирования
  const { data: serviceDepartments = [] } = useQuery({
    queryKey: ['doctor-service-departments', service?.id],
    queryFn: async () => {
      if (!service?.id) return [];
      const response = await api.get(`/api/doctor-services/${service.id}/departments`);
      return response.data?.departments || [];
    },
    enabled: isEdit && !!service?.id,
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<DoctorServiceFormData>({
    resolver: zodResolver(doctorServiceSchema),
    defaultValues: {
      name: '',
      description: '',
      departmentIds: [],
    },
  });

  // Обновляем форму при изменении данных
  React.useEffect(() => {
    if (service && serviceDepartments.length >= 0) {
      reset({
        name: service.name,
        description: service.description || '',
        departmentIds: serviceDepartments.map((dept: any) => dept.id),
      });
    }
  }, [service, serviceDepartments, reset]);

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

  if (departmentsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

      <div>
        <Label>Отделения</Label>
        <p className="text-sm text-gray-600 mt-1 mb-3">
          Выберите отделения, в которых может применяться эта услуга
        </p>
        <Controller
          name="departmentIds"
          control={control}
          render={({ field }) => (
            <div className="space-y-3 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
              {departments.filter(dept => dept.isActive).map((department) => (
                <div key={department.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={`dept-${department.id}`}
                    checked={field.value.includes(department.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        field.onChange([...field.value, department.id]);
                      } else {
                        field.onChange(field.value.filter(id => id !== department.id));
                      }
                    }}
                  />
                  <Label
                    htmlFor={`dept-${department.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {department.name}
                  </Label>
                </div>
              ))}
            </div>
          )}
        />
        {errors.departmentIds && (
          <p className="text-sm text-red-600 mt-1">{errors.departmentIds.message}</p>
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
