'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api/client';
import { Patient, Appointment } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Phone, Calendar, FileText } from 'lucide-react';
import { MedicalRecordForm } from '@/components/schedule/MedicalRecordForm';

export function DoctorPatients() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [showMedicalForm, setShowMedicalForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const doctorId = user?.role === 'ASSISTANT' && user.assistingDoctorId 
        ? user.assistingDoctorId 
        : user?.id;

      // Получаем пациентов через записи доктора
      const response = await apiClient.get(`/api/appointments?doctorId=${doctorId}`);
      if (response.success) {
        // Извлекаем уникальных пациентов
        const uniquePatients = Array.from(
          new Map(
            response.data.map((apt: Appointment) => [apt.patient.id, apt.patient])
          ).values()
        );
        setPatients(uniquePatients as Patient[]);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPatientAppointments = async (patientId: string) => {
    try {
      const doctorId = user?.role === 'ASSISTANT' && user.assistingDoctorId 
        ? user.assistingDoctorId 
        : user?.id;

      const response = await apiClient.get(
        `/api/appointments?doctorId=${doctorId}&patientId=${patientId}`
      );
      if (response.success) {
        setPatientAppointments(response.data);
      }
    } catch (error) {
      console.error('Error loading patient appointments:', error);
    }
  };

  const handleSelectPatient = async (patient: Patient) => {
    setSelectedPatient(patient);
    await loadPatientAppointments(patient.id);
  };

  const handleOpenMedicalRecord = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowMedicalForm(true);
  };

  const filteredPatients = patients.filter(
    (patient) =>
      patient.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.phone.includes(searchQuery)
  );

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Мои пациенты</CardTitle>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени или телефону"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredPatients.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Пациенты не найдены
                </p>
              ) : (
                filteredPatients.map((patient) => (
                  <div
                    key={patient.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedPatient?.id === patient.id
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => handleSelectPatient(patient)}
                  >
                    <div className="font-medium">{patient.fullName}</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Phone className="h-3 w-3" />
                      {patient.phone}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedPatient ? `История приёмов: ${selectedPatient.fullName}` : 'Выберите пациента'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedPatient ? (
              <p className="text-center text-muted-foreground py-8">
                Выберите пациента из списка слева
              </p>
            ) : patientAppointments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Нет записей для этого пациента
              </p>
            ) : (
              <div className="space-y-3">
                {patientAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="p-4 rounded-lg border hover:bg-muted transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={
                              appointment.status === 'DONE'
                                ? 'default'
                                : appointment.status === 'ARRIVED'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {appointment.status}
                          </Badge>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {new Date(appointment.datetime).toLocaleDateString('ru-RU')}
                          </div>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">{appointment.service.name}</span>
                        </div>
                        {appointment.comment && (
                          <div className="text-sm text-muted-foreground">
                            {appointment.comment}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenMedicalRecord(appointment)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Карточка
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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
            loadPatientAppointments(selectedPatient!.id);
          }}
        />
      )}
    </>
  );
}
