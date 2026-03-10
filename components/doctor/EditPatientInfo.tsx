'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/api/client';
import toast from 'react-hot-toast';
import { Loader2, Save } from 'lucide-react';

const patientInfoSchema = z.object({
  fullName: z.string().min(1, 'ФИО обязательно'),
  phone: z.string().min(1, 'Телефон обязателен'),
  iin: z.string().optional(),
  dob: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', '']).optional(),
  address: z.string().optional(),
});

type PatientInfoFormData = z.infer<typeof patientInfoSchema>;

interface EditPatientInfoProps {
  patient: any;
  onSuccess?: () => void;
}

export function EditPatientInfo({ patient, onSuccess }: EditPatientInfoProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PatientInfoFormData>({
    resolver: zodResolver(patientInfoSchema),
    defaultValues: {
      fullName: patient.fullName || '',
      phone: patient.phone || '',
      iin: patient.iin || '',
      dob: patient.dob ? new Date(patient.dob).toISOString().split('T')[0] : '',
      gender: patient.gender || '',
      address: patient.address || '',
    },
  });

  const gender = watch('gender');

  const mutation = useMutation({
    mutationFn: async (data: PatientInfoFormData) => {
      return api.put(`/api/patients/${patient.id}`, {
        ...data,
        dob: data.dob ? new Date(data.dob).toISOString() : null,
        gender: data.gender || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['patient-from-url'] });
      toast.success('Данные пациента обновлены');
      setIsEditing(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Ошибка обновления';
      toast.error(message);
    },
  });

  const onSubmit = (data: PatientInfoFormData) => {
    mutation.mutate(data);
  };

  if (!isEditing) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg space-y-2">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-medium text-gray-900">Информация о пациенте</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
          >
            Редактировать
          </Button>
        </div>
        
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">ФИО:</span>
          <span className="font-medium">{patient.fullName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Телефон:</span>
          <span className="font-medium">{patient.phone}</span>
        </div>
        {patient.iin && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">ИИН:</span>
            <span className="font-medium">{patient.iin}</span>
          </div>
        )}
        {patient.dob && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Дата рождения:</span>
            <span className="font-medium">
              {new Date(patient.dob).toLocaleDateString('ru-RU')}
            </span>
          </div>
        )}
        {patient.gender && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Пол:</span>
            <span className="font-medium">
              {patient.gender === 'MALE' ? 'Мужской' : 'Женский'}
            </span>
          </div>
        )}
        {patient.address && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Адрес:</span>
            <span className="font-medium">{patient.address}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-4 bg-gray-50 rounded-lg space-y-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium text-gray-900">Редактирование данных</h3>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setIsEditing(false)}
        >
          Отмена
        </Button>
      </div>

      <div>
        <Label>ФИО *</Label>
        <Input {...register('fullName')} className="mt-1" />
        {errors.fullName && (
          <p className="text-xs text-red-600 mt-1">{errors.fullName.message}</p>
        )}
      </div>

      <div>
        <Label>Телефон *</Label>
        <Input {...register('phone')} className="mt-1" />
        {errors.phone && (
          <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>
        )}
      </div>

      <div>
        <Label>ИИН</Label>
        <Input {...register('iin')} placeholder="12 цифр" maxLength={12} className="mt-1" />
      </div>

      <div>
        <Label>Дата рождения</Label>
        <Input type="date" {...register('dob')} className="mt-1" />
      </div>

      <div>
        <Label>Пол</Label>
        <Select
          value={gender || ''}
          onValueChange={(value) => setValue('gender', value as 'MALE' | 'FEMALE' | '')}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Выберите пол" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Не указан</SelectItem>
            <SelectItem value="MALE">Мужской</SelectItem>
            <SelectItem value="FEMALE">Женский</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Адрес</Label>
        <Input {...register('address')} className="mt-1" />
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
            Сохранить изменения
          </>
        )}
      </Button>
    </form>
  );
}
