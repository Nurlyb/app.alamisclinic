'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usersApi } from '@/api/users.api';
import { departmentsApi } from '@/api/departments.api';
import type { User, Department } from '@/types';
import toast from 'react-hot-toast';

interface UserFormProps {
  user?: User;
  onSuccess?: () => void;
}

export function UserForm({ user, onSuccess }: UserFormProps) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    role: user?.role || 'OPERATOR',
    departmentId: user?.departmentId || '',
    colorBadge: user?.colorBadge || '#3B82F6',
    phone: user?.phone || '',
    password: '',
  });

  // Загрузка отделений
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await departmentsApi.getAll();
      return response.data || [];
    },
  });

  // Создание/обновление пользователя
  const mutation = useMutation({
    mutationFn: async () => {
      if (user) {
        // Обновление
        return usersApi.update(user.id, {
          name: formData.name,
          role: formData.role as any,
          departmentId: formData.departmentId || undefined,
          colorBadge: formData.colorBadge,
          phone: formData.phone,
        });
      } else {
        // Создание
        if (!formData.password) {
          throw new Error('Пароль обязателен');
        }
        return usersApi.create({
          name: formData.name,
          role: formData.role as any,
          departmentId: formData.departmentId || undefined,
          colorBadge: formData.colorBadge,
          phone: formData.phone,
          password: formData.password,
        });
      }
    },
    onSuccess: () => {
      toast.success(user ? 'Пользователь обновлен' : 'Пользователь создан');
      onSuccess?.();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'Ошибка';
      toast.error(errorMessage);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Имя */}
      <div>
        <Label>Имя *</Label>
        <Input
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Иван Иванов"
          required
        />
      </div>

      {/* Роль */}
      <div>
        <Label>Роль *</Label>
        <Select
          value={formData.role}
          onValueChange={(value) => handleChange('role', value)}
          required
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OPERATOR">Оператор</SelectItem>
            <SelectItem value="RECEPTIONIST">Регистратура</SelectItem>
            <SelectItem value="ASSISTANT">Ассистент</SelectItem>
            <SelectItem value="DOCTOR">Доктор</SelectItem>
            <SelectItem value="OWNER">Владелец</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 mt-1">
          {formData.role === 'OPERATOR' && 'Создает записи, видит только свои'}
          {formData.role === 'RECEPTIONIST' && 'Принимает оплату, переносит и отменяет записи'}
          {formData.role === 'ASSISTANT' && 'Помощник врача, вносит витальные показатели'}
          {formData.role === 'DOCTOR' && 'Врач, видит только свои записи'}
          {formData.role === 'OWNER' && 'Полный доступ ко всем функциям'}
        </p>
      </div>

      {/* Отделение (для докторов) */}
      {(formData.role === 'DOCTOR' || formData.role === 'ASSISTANT') && (
        <div>
          <Label>Отделение {formData.role === 'DOCTOR' ? '*' : ''}</Label>
          <Select
            value={formData.departmentId}
            onValueChange={(value) => handleChange('departmentId', value)}
            required={formData.role === 'DOCTOR'}
          >
            <SelectTrigger>
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
        </div>
      )}

      {/* Телефон */}
      <div>
        <Label>Телефон *</Label>
        <Input
          type="tel"
          value={formData.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          placeholder="+77001234567"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Используется для входа в систему
        </p>
      </div>

      {/* Пароль (только при создании) */}
      {!user && (
        <div>
          <Label>Пароль *</Label>
          <Input
            type="password"
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            placeholder="Минимум 8 символов"
            required
            minLength={8}
          />
        </div>
      )}

      {/* Цвет бейджа */}
      <div>
        <Label>Цвет бейджа *</Label>
        <div className="flex items-center gap-3">
          <Input
            type="color"
            value={formData.colorBadge}
            onChange={(e) => handleChange('colorBadge', e.target.value)}
            className="w-20 h-10"
            required
          />
          <Input
            type="text"
            value={formData.colorBadge}
            onChange={(e) => handleChange('colorBadge', e.target.value)}
            placeholder="#3B82F6"
            pattern="^#[0-9A-Fa-f]{6}$"
            required
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Цвет для отображения в расписании
        </p>
      </div>

      {/* Кнопки */}
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
            <>{user ? 'Обновить' : 'Создать'}</>
          )}
        </Button>
      </div>
    </form>
  );
}
