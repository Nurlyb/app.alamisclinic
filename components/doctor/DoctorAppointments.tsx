'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api/client';
import { Appointment } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, FileText } from 'lucide-react';
import { MedicalRecordForm } from '@/components/schedule/MedicalRecordForm';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  ARRIVED: 'bg-green-100 text-green-800',
  DONE: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-orange-100 text-orange-800',
};

const statusLabels = {
  PENDING: 'Ожидание',
  CONFIRMED: 'Подтверждено',
  ARRIVED: 'Прибыл',
  DONE: 'Выполнено',
  CANCELLED: 'Отменено',
  NO_SHOW: 'Не пришёл',
};

export function DoctorAppointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showMedicalForm, setShowMedicalForm] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const doctorId = user?.role === 'ASSISTANT' && user.assistingDoctorId 
        ? user.assistingDoctorId 
        : user?.id;

      const response = await apiClient.get(`/api/appointments?doctorId=${doctorId}&status=ARRIVED,CONFIRMED`) as { success?: boolean; data?: any };
      if (response.success) {
        setAppointments(response.data);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMedicalRecord = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowMedicalForm(true);
  };

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  if (appointments.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Нет активных записей
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {appointments.map((appointment) => (
          <Card key={appointment.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-4">
                    <Badge className={statusColors[appointment.status]}>
                      {statusLabels[appointment.status]}
                    </Badge>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(appointment.datetime), 'dd MMMM yyyy', { locale: ru })}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {format(new Date(appointment.datetime), 'HH:mm')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{appointment.patient.fullName}</span>
                    <span className="text-sm text-muted-foreground">
                      {appointment.patient.phone}
                    </span>
                  </div>

                  <div className="text-sm">
                    <span className="text-muted-foreground">Услуга:</span>{' '}
                    <span className="font-medium">{appointment.service.name}</span>
                  </div>

                  {appointment.comment && (
                    <div className="text-sm text-muted-foreground">
                      Комментарий: {appointment.comment}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleOpenMedicalRecord(appointment)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Открыть карточку
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showMedicalForm && selectedAppointment && (
        <MedicalRecordForm
          appointment={selectedAppointment}
          onClose={() => {
            setShowMedicalForm(false);
            setSelectedAppointment(null);
          }}
          onSuccess={() => {
            setShowMedicalForm(false);
            setSelectedAppointment(null);
            loadAppointments();
          }}
        />
      )}
    </>
  );
}
