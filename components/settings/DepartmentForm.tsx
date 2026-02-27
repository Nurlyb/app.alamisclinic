'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/api/client';
import type { Department } from '@/types';
import toast from 'react-hot-toast';

interface DepartmentFormProps {
  department?: Department;
  onSuccess?: () => void;
}

export function DepartmentForm({ department, onSuccess }: DepartmentFormProps) {
  const [formData, setFormData] = useState({
    name: department?.name || '',
  });

  // Создание/обновление
  const mutation = useMutation({
    mutationFn: async () => {
      if (department) {
        return api.put(`/api/departments/${department.id}`, formData);
      } else {
        return api.post('/api/departments', { ...formData, isActive: true });
      }
    },
    onSuccess: () => {
      toast.success(department ? 'Отделение обновлено' : 'Отделение создано');
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
      <div>
        <Label>Название отделения *</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Проктология"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Например: Проктология, Урология, Кардиология
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Сохранение...
          </>
        ) : (
          <>{department ? 'Обновить' : 'Создать'}</>
        )}
      </Button>
    </form>
  );
}
