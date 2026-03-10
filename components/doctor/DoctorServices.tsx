'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api/client';
import { DoctorService } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';
import { DoctorServiceForm } from './DoctorServiceForm';

export function DoctorServices() {
  const { user } = useAuth();
  const [services, setServices] = useState<DoctorService[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState<DoctorService | null>(null);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const doctorId = user?.role === 'ASSISTANT' && user.assistingDoctorId 
        ? user.assistingDoctorId 
        : user?.id;

      const response = await apiClient.get(`/api/doctor-services?doctorId=${doctorId}`);
      if (response.success) {
        setServices(response.data);
      }
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту услугу?')) {
      return;
    }

    try {
      const response = await apiClient.delete(`/api/doctor-services/${id}`);
      if (response.success) {
        loadServices();
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      alert('Ошибка при удалении услуги');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        У вас пока нет добавленных услуг. Нажмите &quot;Добавить услугу&quot; чтобы создать первую.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {services.map((service) => (
          <div
            key={service.id}
            className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="font-medium">{service.service.name}</span>
                <Badge variant="outline">{service.service.code}</Badge>
                {service.customPrice && (
                  <Badge variant="secondary">
                    Индивидуальная цена: {service.customPrice.toLocaleString()} ₸
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Базовая цена: {service.service.price.toLocaleString()} ₸ • 
                Длительность: {service.service.durationMin} мин • 
                {service.service.department?.name}
              </div>
            </div>
            {user?.role === 'DOCTOR' && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingService(service)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(service.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {editingService && (
        <DoctorServiceForm
          service={editingService}
          onClose={() => setEditingService(null)}
          onSuccess={() => {
            setEditingService(null);
            loadServices();
          }}
        />
      )}
    </>
  );
}
