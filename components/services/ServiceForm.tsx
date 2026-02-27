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
import { api } from '@/api/client';
import { departmentsApi } from '@/api/departments.api';
import type { Service, Department } from '@/types';
import toast from 'react-hot-toast';

interface ServiceFormProps {
  service?: Service;
  onSuccess?: () => void;
}

export function ServiceForm({ service, onSuccess }: ServiceFormProps) {
  const [formData, setFormData] = useState({
    code: service?.code || '',
    name: service?.name || '',
    price: service?.price || 0,
    departmentId: service?.departmentId || '',
    categoryId: service?.categoryId || '',
    durationMin: service?.durationMin || 30,
  });

  // Загрузка отделений
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await departmentsApi.getAll();
      return response.data || [];
    },
  });

  // Загрузка категорий для выбранного отделения
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', formData.departmentId],
    queryFn: async () => {
      if (!formData.departmentId) return [];
      const response = await api.get(`/api/departments/${formData.departmentId}/categories`);
      return response.data || [];
    },
    enabled: !!formData.departmentId,
  });

  // Создание/обновление
  const mutation = useMutation({
    mutationFn: async () => {
      if (service) {
        return api.put(`/api/services/${service.id}`, formData);
      } else {
        return api.post('/api/services', { ...formData, isActive: true });
      }
    },
    onSuccess: () => {
      toast.success(service ? 'Услуга обновлена' : 'Услуга создана');
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Ошибка');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Код услуги *</Label>
          <Input
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            placeholder="N001"
            required
          />
        </div>
        <div>
          <Label>Длительность (мин) *</Label>
          <Input
            type="number"
            value={formData.durationMin}
            onChange={(e) => setFormData({ ...formData, durationMin: parseInt(e.target.value) })}
            min={5}
            required
          />
        </div>
      </div>

      <div>
        <Label>Название услуги *</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Консультация врача"
          required
        />
      </div>

      <div>
        <Label>Цена (₸) *</Label>
        <Input
          type="number"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
          min={0}
          required
        />
      </div>

      <div>
        <Label>Отделение *</Label>
        <Select
          value={formData.departmentId}
          onValueChange={(value) => setFormData({ ...formData, departmentId: value, categoryId: '' })}
          required
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

      {formData.departmentId && (
        <div>
          <Label>Категория</Label>
          <Select
            value={formData.categoryId}
            onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите категорию (необязательно)" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat: any) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            Категория для группировки услуг (Консультации, Диагностика и т.д.)
          </p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Сохранение...
          </>
        ) : (
          <>{service ? 'Обновить' : 'Создать'}</>
        )}
      </Button>
    </form>
  );
}
