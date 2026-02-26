'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Search } from 'lucide-react';
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
import { departmentsApi } from '@/api/departments.api';
import { usersApi } from '@/api/users.api';
import { servicesApi } from '@/api/services.api';
import { patientsApi } from '@/api/patients.api';
import { appointmentsApi } from '@/api/appointments.api';
import type { Appointment } from '@/types';
import toast from 'react-hot-toast';

const appointmentSchema = z.object({
  patientId: z.string().optional(),
  // Поля для нового пациента
  newPatientName: z.string().optional(),
  newPatientPhone: z.string().optional(),
  newPatientIin: z.string().optional(),
  newPatientDateOfBirth: z.string().optional(),
  newPatientGender: z.string().optional(),
  newPatientSource: z.string().optional(),
  
  departmentId: z.string().min(1, 'Выберите отделение'),
  doctorId: z.string().min(1, 'Выберите врача'),
  serviceId: z.string().min(1, 'Выберите услугу'),
  date: z.string().min(1, 'Укажите дату'),
  time: z.string().min(1, 'Укажите время'),
  prepayment: z.number().min(0).optional(),
  comment: z.string().optional(),
}).refine((data) => {
  // Либо выбран существующий пациент, либо заполнены минимальные поля нового
  const hasExistingPatient = !!data.patientId;
  const hasNewPatientData = !!(
    data.newPatientName && 
    data.newPatientPhone && 
    data.newPatientSource
  );
  return hasExistingPatient || hasNewPatientData;
}, {
  message: 'Заполните ФИО, телефон и источник пациента',
  path: ['newPatientName'],
}).refine((data) => {
  // Проверка, что дата и время не в прошлом
  const appointmentDateTime = new Date(`${data.date}T${data.time}:00`);
  const now = new Date();
  return appointmentDateTime >= now;
}, {
  message: 'Нельзя создать запись на прошедшее время',
  path: ['time'],
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface AppointmentFormProps {
  onSuccess?: () => void;
  defaultDate?: string;
  defaultTime?: string;
  defaultDepartmentId?: string;
  defaultDoctorId?: string;
  appointment?: Appointment; // Для режима редактирования
}

export function AppointmentForm({ 
  onSuccess, 
  defaultDate,
  defaultTime,
  defaultDepartmentId,
  defaultDoctorId,
  appointment // Для режима редактирования
}: AppointmentFormProps) {
  const queryClient = useQueryClient();
  const [patientSearch, setPatientSearch] = useState(appointment?.patient.fullName || '');
  const [isNewPatient, setIsNewPatient] = useState(!appointment); // Если редактируем, то не новый пациент
  const isEditMode = !!appointment;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: appointment?.patient.id || '',
      date: defaultDate || new Date().toISOString().split('T')[0],
      time: defaultTime || '09:00',
      prepayment: appointment?.prepayment || 0,
      departmentId: defaultDepartmentId || '',
      doctorId: defaultDoctorId || '',
      serviceId: appointment?.service.id || '',
      comment: appointment?.comment || '',
      newPatientGender: '',
      newPatientSource: '',
    },
  });

  const departmentId = watch('departmentId');
  const serviceId = watch('serviceId');

  // Загрузка отделений
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await departmentsApi.getAll();
      return response.data || [];
    },
  });

  // Загрузка докторов по отделению
  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors', departmentId],
    queryFn: async () => {
      if (!departmentId) return [];
      const response = await usersApi.getDoctors(departmentId);
      return response.data || [];
    },
    enabled: !!departmentId,
  });

  // Загрузка услуг по отделению
  const { data: services = [] } = useQuery({
    queryKey: ['services', departmentId],
    queryFn: async () => {
      if (!departmentId) return [];
      const response = await servicesApi.getAll({ departmentId, isActive: true });
      return response.data || [];
    },
    enabled: !!departmentId,
  });

  // Поиск пациентов
  const { data: patients = [], isLoading: isSearching } = useQuery({
    queryKey: ['patients', patientSearch],
    queryFn: async () => {
      if (patientSearch.length < 2) return [];
      const response = await patientsApi.search(patientSearch);
      return response.data || [];
    },
    enabled: patientSearch.length >= 2,
  });

  // Создание/обновление записи
  const createMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      let patientId = data.patientId;

      // Если создаём нового пациента (только при создании записи)
      if (!isEditMode && isNewPatient && data.newPatientName && data.newPatientPhone && data.newPatientSource) {
        const patientData: any = {
          fullName: data.newPatientName,
          phone: data.newPatientPhone,
          source: data.newPatientSource,
        };

        // Добавляем опциональные поля только если они заполнены
        if (data.newPatientIin) {
          patientData.iin = data.newPatientIin;
        }

        if (data.newPatientDateOfBirth) {
          const dobDate = new Date(data.newPatientDateOfBirth);
          dobDate.setHours(12, 0, 0, 0);
          patientData.dob = dobDate.toISOString();
        }

        if (data.newPatientGender) {
          patientData.gender = data.newPatientGender;
        }

        console.log('Создание нового пациента:', patientData);

        const patientResponse = await patientsApi.create(patientData);
        
        console.log('Пациент создан:', patientResponse.data);
        patientId = patientResponse.data?.id;
      }

      if (!patientId) {
        throw new Error('Не удалось определить пациента');
      }

      // Преобразуем date + time в datetime (ISO 8601)
      const localDateTime = new Date(`${data.date}T${data.time}:00`);
      const datetime = localDateTime.toISOString();
      
      // Если редактируем - обновляем, иначе создаём
      if (isEditMode && appointment) {
        console.log('Обновление записи:', appointment.id);
        const response = await appointmentsApi.update(appointment.id, {
          // Можно обновить только некоторые поля
          prepayment: data.prepayment || 0,
          comment: data.comment,
        });
        console.log('Запись обновлена:', response.data);
        return response;
      } else {
        console.log('Создание записи:', {
          patientId,
          doctorId: data.doctorId,
          serviceId: data.serviceId,
          departmentId: data.departmentId,
          datetime,
          prepayment: data.prepayment || 0,
          comment: data.comment,
        });

        const response = await appointmentsApi.create({
          patientId,
          doctorId: data.doctorId,
          serviceId: data.serviceId,
          departmentId: data.departmentId,
          datetime,
          prepayment: data.prepayment || 0,
          comment: data.comment,
        });

        console.log('Запись создана:', response.data);
        return response;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast.success(isEditMode ? 'Запись успешно обновлена' : 'Запись успешно создана');
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error('Ошибка:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Ошибка';
      toast.error(errorMessage);
    },
  });

  const onSubmit = (data: AppointmentFormData) => {
    createMutation.mutate(data);
  };

  // Удаление записи
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!appointment) throw new Error('Нет записи для удаления');
      return appointmentsApi.delete(appointment.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Запись успешно удалена');
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error('Ошибка удаления:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Ошибка удаления';
      toast.error(errorMessage);
    },
  });

  const handleDelete = () => {
    if (confirm('Вы уверены, что хотите удалить эту запись?')) {
      deleteMutation.mutate();
    }
  };

  // Автоматическая установка цены услуги как предоплаты
  useEffect(() => {
    if (serviceId && services.length > 0) {
      const service = services.find((s) => s.id === serviceId);
      if (service) {
        setValue('prepayment', service.price);
      }
    }
  }, [serviceId, services, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Общие ошибки формы */}
      {Object.keys(errors).length > 0 && (
        <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
          <p className="text-sm text-red-900 font-bold mb-2">⚠️ Исправьте ошибки:</p>
          <ul className="space-y-1 text-sm text-red-800">
            {errors.newPatientName && <li>• ФИО пациента обязательно</li>}
            {errors.newPatientPhone && <li>• Телефон пациента обязателен</li>}
            {errors.newPatientSource && <li>• Выберите источник регистрации</li>}
            {errors.departmentId && <li>• Выберите отделение</li>}
            {errors.doctorId && <li>• Выберите врача</li>}
            {errors.serviceId && <li>• Выберите услугу</li>}
            {errors.date && <li>• Укажите дату</li>}
            {errors.time && <li>• {errors.time.message}</li>}
          </ul>
        </div>
      )}

      {/* Toggle: Existing vs New Patient - только при создании */}
      {!isEditMode && (
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
          <button
            type="button"
            onClick={() => setIsNewPatient(false)}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              !isNewPatient
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Существующий пациент
          </button>
          <button
            type="button"
            onClick={() => {
              setIsNewPatient(true);
              setValue('patientId', '');
              setPatientSearch('');
            }}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              isNewPatient
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Новый пациент
          </button>
        </div>
      )}

      {/* Информация о пациенте при редактировании */}
      {isEditMode && appointment && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-900 mb-2">Пациент:</p>
          <p className="font-medium">{appointment.patient.fullName}</p>
          <p className="text-sm text-gray-600">{appointment.patient.phone}</p>
        </div>
      )}

      {/* Existing Patient Search - только при создании */}
      {!isEditMode && !isNewPatient && (
        <div>
          <Label>Пациент</Label>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Поиск по имени или телефону..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {isSearching && (
            <p className="text-sm text-gray-500 mt-2">Поиск...</p>
          )}
          {patients.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-lg divide-y max-h-48 overflow-y-auto">
              {patients.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => {
                    setValue('patientId', patient.id);
                    setPatientSearch(patient.fullName);
                  }}
                  className="w-full p-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <p className="font-medium">{patient.fullName}</p>
                  <p className="text-sm text-gray-600">{patient.phone}</p>
                </button>
              ))}
            </div>
          )}
          {errors.patientId && (
            <p className="text-sm text-red-600 mt-1">{errors.patientId.message}</p>
          )}
        </div>
      )}

      {/* New Patient Form - только при создании */}
      {!isEditMode && isNewPatient && (
        <div className="space-y-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
          <p className="text-sm font-medium text-blue-900">Данные нового пациента</p>
          
          <div>
            <Label>ФИО *</Label>
            <Input
              {...register('newPatientName')}
              placeholder="Иванов Иван Иванович"
              className="mt-2"
            />
            {errors.newPatientName && (
              <p className="text-sm text-red-600 mt-1">{errors.newPatientName.message}</p>
            )}
          </div>

          <div>
            <Label>Телефон *</Label>
            <Input
              {...register('newPatientPhone')}
              placeholder="+77001234567"
              className="mt-2"
            />
            {errors.newPatientPhone && (
              <p className="text-sm text-red-600 mt-1">{errors.newPatientPhone.message}</p>
            )}
          </div>

          <div>
            <Label>ИИН</Label>
            <Input
              {...register('newPatientIin')}
              placeholder="123456789012 (необязательно)"
              maxLength={12}
              className="mt-2"
            />
            {errors.newPatientIin && (
              <p className="text-sm text-red-600 mt-1">{errors.newPatientIin.message}</p>
            )}
          </div>

          <div>
            <Label>Дата рождения</Label>
            <Input
              type="date"
              {...register('newPatientDateOfBirth')}
              className="mt-2"
            />
            {errors.newPatientDateOfBirth && (
              <p className="text-sm text-red-600 mt-1">{errors.newPatientDateOfBirth.message}</p>
            )}
          </div>

          <div>
            <Label>Пол</Label>
            <Select
              value={watch('newPatientGender') || ''}
              onValueChange={(value) => setValue('newPatientGender', value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Не указан" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Мужской</SelectItem>
                <SelectItem value="FEMALE">Женский</SelectItem>
              </SelectContent>
            </Select>
            {errors.newPatientGender && (
              <p className="text-sm text-red-600 mt-1">{errors.newPatientGender.message}</p>
            )}
          </div>

          <div>
            <Label>Источник *</Label>
            <Select
              value={watch('newPatientSource') || ''}
              onValueChange={(value) => setValue('newPatientSource', value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Выберите источник" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                <SelectItem value="GIS">2GIS</SelectItem>
                <SelectItem value="REFERRAL">Рекомендация</SelectItem>
                <SelectItem value="SITE">Сайт</SelectItem>
                <SelectItem value="OTHER">Другое</SelectItem>
              </SelectContent>
            </Select>
            {errors.newPatientSource && (
              <p className="text-sm text-red-600 mt-1">{errors.newPatientSource.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Department */}
      <div>
        <Label>Отделение</Label>
        <Select
          value={watch('departmentId') || ''}
          onValueChange={(value) => {
            setValue('departmentId', value);
            setValue('doctorId', '');
            setValue('serviceId', '');
          }}
          disabled={isEditMode}
        >
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Выберите отделение" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.departmentId && (
          <p className="text-sm text-red-600 mt-1">{errors.departmentId.message}</p>
        )}
      </div>

      {/* Doctor */}
      <div>
        <Label>Врач</Label>
        <Select
          value={watch('doctorId') || ''}
          onValueChange={(value) => setValue('doctorId', value)}
          disabled={!departmentId || isEditMode}
        >
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Выберите врача" />
          </SelectTrigger>
          <SelectContent>
            {doctors.map((doctor) => (
              <SelectItem key={doctor.id} value={doctor.id}>
                {doctor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.doctorId && (
          <p className="text-sm text-red-600 mt-1">{errors.doctorId.message}</p>
        )}
      </div>

      {/* Service */}
      <div>
        <Label>Услуга</Label>
        <Select
          value={watch('serviceId') || ''}
          onValueChange={(value) => setValue('serviceId', value)}
          disabled={!departmentId || isEditMode}
        >
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Выберите услугу" />
          </SelectTrigger>
          <SelectContent>
            {services.map((service) => (
              <SelectItem key={service.id} value={service.id}>
                {service.name} - {service.price.toLocaleString()} ₸
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.serviceId && (
          <p className="text-sm text-red-600 mt-1">{errors.serviceId.message}</p>
        )}
      </div>

      {/* Date & Time - disabled в режиме редактирования */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Дата</Label>
          <Input
            type="date"
            {...register('date')}
            className="mt-2"
            disabled={isEditMode}
          />
          {errors.date && (
            <p className="text-sm text-red-600 mt-1">{errors.date.message}</p>
          )}
        </div>
        <div>
          <Label>Время</Label>
          <Input
            type="time"
            {...register('time')}
            className="mt-2"
            disabled={isEditMode}
          />
          {errors.time && (
            <p className="text-sm text-red-600 mt-1">{errors.time.message}</p>
          )}
        </div>
      </div>

      {/* Prepayment */}
      <div>
        <Label>Предоплата (₸)</Label>
        <Input
          type="number"
          {...register('prepayment', { valueAsNumber: true })}
          className="mt-2"
        />
        {errors.prepayment && (
          <p className="text-sm text-red-600 mt-1">{errors.prepayment.message}</p>
        )}
      </div>

      {/* Comment */}
      <div>
        <Label>Комментарий</Label>
        <Textarea
          {...register('comment')}
          placeholder="Дополнительная информация..."
          className="mt-2"
        />
      </div>

      {/* Submit */}
      <div className="flex gap-2">
        <Button
          type="submit"
          className="flex-1"
          disabled={createMutation.isPending || deleteMutation.isPending}
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {isEditMode ? 'Сохранение...' : 'Создание...'}
            </>
          ) : (
            isEditMode ? 'Сохранить изменения' : 'Создать запись'
          )}
        </Button>

        {/* Кнопка удаления - только в режиме редактирования */}
        {isEditMode && (
          <Button
            type="button"
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50"
            onClick={handleDelete}
            disabled={createMutation.isPending || deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Удаление...
              </>
            ) : (
              'Удалить'
            )}
          </Button>
        )}
      </div>
    </form>
  );
}
