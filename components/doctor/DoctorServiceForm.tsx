'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api/client';
import { DoctorService, Service } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface DoctorServiceFormProps {
  service?: DoctorService;
  onClose: () => void;
  onSuccess: () => void;
}

export function DoctorServiceForm({ service, onClose, onSuccess }: DoctorServiceFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [formData, setFormData] = useState({
    serviceId: service?.serviceId || '',
    customPrice: service?.customPrice?.toString() || '',
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const response = await apiClient.get('/api/services?isActive=true');
      if (response.success) {
        setServices(response.data);
      }
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let response;
      if (service) {
        // Обновление
        response = await apiClient.patch(`/api/doctor-services/${service.id}`, {
          customPrice: formData.customPrice ? parseFloat(formData.customPrice) : null,
        });
      } else {
        // Создание
        response = await apiClient.post('/api/doctor-services', {
          serviceId: formData.serviceId,
          customPrice: formData.customPrice ? parseFloat(formData.customPrice) : null,
        });
      }

      if (response.success) {
        onSuccess();
      } else {
        alert(response.error || 'Ошибка при сохранении услуги');
      }
    } catch (error) {
      console.error('Error saving service:', error);
      alert('Ошибка при сохранении услуги');
    } finally {
      setLoading(false);
    }
  };

  const selectedService = services.find((s) => s.id === formData.serviceId);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {service ? 'Редактировать услугу' : 'Добавить услугу'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!service && (
            <div className="space-y-2">
              <Label htmlFor="serviceId">Услуга</Label>
              <Select
                value={formData.serviceId}
                onValueChange={(value) =>
                  setFormData({ ...formData, serviceId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите услугу" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} ({service.code}) - {service.price.toLocaleString()} ₸
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedService && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <div>Базовая цена: {selectedService.price.toLocaleString()} ₸</div>
              <div>Длительность: {selectedService.durationMin} мин</div>
              <div>Отделение: {selectedService.department?.name}</div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="customPrice">
              Индивидуальная цена (необязательно)
            </Label>
            <Input
              id="customPrice"
              type="number"
              step="0.01"
              placeholder="Оставьте пустым для базовой цены"
              value={formData.customPrice}
              onChange={(e) =>
                setFormData({ ...formData, customPrice: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Если не указана, будет использоваться базовая цена услуги
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading || (!service && !formData.serviceId)}>
              {loading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
