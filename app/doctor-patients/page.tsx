'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { User, Phone, Calendar, FileText, Plus, Stethoscope, UserCheck } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth';
import { MedicalRecordForm } from '@/components/schedule/MedicalRecordForm';
import { AssignOperationForm } from '@/components/doctor/AssignOperationForm';
import { EditPatientInfo } from '@/components/doctor/EditPatientInfo';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { ru } from 'date-fns/locale';

export default function DoctorPatientsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const patientIdFromUrl = searchParams.get('patientId');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isPatientDetailsOpen, setIsPatientDetailsOpen] = useState(false);
  const [isAssignOperationOpen, setIsAssignOperationOpen] = useState(false);
  const [isMedicalRecordOpen, setIsMedicalRecordOpen] = useState(false);
  const [selectedAppointmentForRecord, setSelectedAppointmentForRecord] = useState<any>(null);

  // Загрузка пациентов доктора (через записи)
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['doctor-appointments'],
    queryFn: async () => {
      const response = await api.get<{ data: any[] }>('/api/appointments');
      return response?.data || [];
    },
  });

  // Получаем уникальных пациентов
  const patients = Array.from(
    new Map(
      appointments
        .filter((apt: any) => apt.status === 'ARRIVED' || apt.status === 'DONE')
        .map((apt: any) => [apt.patient.id, apt.patient])
    ).values()
  );

  // Загрузка конкретного пациента по ID из URL
  const { data: patientFromUrl } = useQuery({
    queryKey: ['patient-from-url', patientIdFromUrl],
    queryFn: async () => {
      if (!patientIdFromUrl) return null;
      // Ищем пациента в appointments
      const appointment = appointments.find((apt: any) => apt.patientId === patientIdFromUrl);
      return appointment?.patient || null;
    },
    enabled: !!patientIdFromUrl && appointments.length > 0,
  });

  // Автоматически открыть карточку пациента, если передан patientId в URL
  useEffect(() => {
    if (patientIdFromUrl && patientFromUrl) {
      setSelectedPatient(patientFromUrl);
      setIsPatientDetailsOpen(true);
    }
  }, [patientIdFromUrl, patientFromUrl]);

  // Принудительно перезагружать медицинские записи при открытии карточки
  useEffect(() => {
    if (isPatientDetailsOpen && selectedPatient) {
      // Небольшая задержка чтобы дать время на открытие карточки
      const timer = setTimeout(() => {
        queryClient.refetchQueries({ 
          queryKey: ['patient-medical-records', selectedPatient.id] 
        });
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isPatientDetailsOpen, selectedPatient, queryClient]);

  // Фильтрация по поиску
  const filteredPatients = patients.filter((patient: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      patient.fullName.toLowerCase().includes(query) ||
      patient.phone.includes(query) ||
      (patient.iin && patient.iin.includes(query))
    );
  });

  // Загрузка назначенных операций для пациента
  const { data: patientOperations = [] } = useQuery({
    queryKey: ['patient-operations', selectedPatient?.id],
    queryFn: async () => {
      if (!selectedPatient) return [];
      const response = await api.get<{ data: { assignments: any[] } }>(
        `/api/doctor-service-assignments?patientId=${selectedPatient.id}`
      );
      return response?.data?.assignments || [];
    },
    enabled: !!selectedPatient,
  });

  // Загрузка медицинских записей пациента
  const { data: medicalRecords = [] } = useQuery({
    queryKey: ['patient-medical-records', selectedPatient?.id],
    queryFn: async () => {
      if (!selectedPatient) return [];
      const response: any = await api.get(
        `/api/medical-records?patientId=${selectedPatient.id}`
      );
      // API возвращает { success: true, data: { records: [...] } }
      return response.data?.records || response.records || [];
    },
    enabled: !!selectedPatient,
    refetchOnMount: 'always', // Всегда перезагружать при открытии
    staleTime: 0, // Данные сразу считаются устаревшими
  });

  // Загрузка последней записи пациента для записи диагноза
  const { data: lastAppointment } = useQuery({
    queryKey: ['patient-last-appointment', selectedPatient?.id],
    queryFn: async () => {
      if (!selectedPatient) return null;
      const response = await api.get<{ data: any[] }>('/api/appointments');
      const patientAppointments = response?.data?.filter(
        (apt: any) => apt.patientId === selectedPatient.id && apt.status === 'ARRIVED'
      ) || [];
      // Возвращаем последнюю запись
      return patientAppointments.sort((a: any, b: any) => 
        new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
      )[0] || null;
    },
    enabled: !!selectedPatient,
  });

  // Мутация для закрепления пациента за ассистентом
  const assignAssistantMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      return api.patch(`/api/appointments/${appointmentId}/assign-assistant`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['patient-last-appointment'] });
      toast.success('Пациент закреплен за вами');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Ошибка закрепления пациента');
    },
  });

  const handlePatientClick = (patient: any) => {
    setSelectedPatient(patient);
    setIsPatientDetailsOpen(true);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PLANNED: 'bg-blue-100 text-blue-800',
      PAID: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      PLANNED: 'Запланировано',
      PAID: 'Оплачено',
      COMPLETED: 'Выполнено',
      CANCELLED: 'Отменено',
    };
    return texts[status] || status;
  };

  return (
    <AppShell requiredPermissions={['appointments:view:all', 'appointments:view:own']}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Мои пациенты</h1>
          <p className="text-gray-600 mt-1">
            {user?.role === 'DOCTOR' ? '👨‍⚕️ Ваши пациенты' : '🩺 Пациенты вашего доктора'}
          </p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <Input
            placeholder="Поиск по имени, телефону, ИИН..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Patients List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-12 text-center">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Нет пациентов
              </h3>
              <p className="text-gray-600">
                {searchQuery
                  ? 'По вашему запросу ничего не найдено'
                  : 'У вас пока нет пациентов'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredPatients.map((patient: any) => (
                <button
                  key={patient.id}
                  onClick={() => handlePatientClick(patient)}
                  className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {patient.fullName}
                        </h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {patient.phone}
                          </span>
                          {patient.iin && (
                            <span>ИИН: {patient.iin}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {patient.blacklist && (
                      <Badge className="bg-red-100 text-red-800">
                        Чёрный список
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Patient Details Sheet */}
      <Sheet open={isPatientDetailsOpen} onOpenChange={setIsPatientDetailsOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedPatient && (
            <>
              <SheetHeader>
                <SheetTitle>Карточка пациента</SheetTitle>
                <SheetDescription>
                  {selectedPatient.fullName}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Patient Info - Editable */}
                <EditPatientInfo
                  patient={selectedPatient}
                  onSuccess={() => {
                    // Обновляем данные пациента в локальном состоянии
                    setSelectedPatient({ ...selectedPatient });
                  }}
                />

                {/* Doctor and Assistant Info */}
                {lastAppointment && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-medium text-blue-900 mb-3">
                      Команда лечения
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-800">
                          Доктор: <span className="font-medium">{lastAppointment.doctor?.name}</span>
                        </span>
                      </div>
                      {lastAppointment.assistant ? (
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-800">
                            Ассистент: <span className="font-medium">{lastAppointment.assistant.name}</span>
                          </span>
                          {lastAppointment.assistantTakenAt && (
                            <span className="text-xs text-gray-600">
                              (взят на работу {format(new Date(lastAppointment.assistantTakenAt), 'dd.MM.yyyy HH:mm')})
                            </span>
                          )}
                        </div>
                      ) : user?.role === 'ASSISTANT' ? (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Ассистент не назначен
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* Assistant Action Button */}
                {user?.role === 'ASSISTANT' && lastAppointment && !lastAppointment.assistantId && (
                  <Button
                    onClick={() => assignAssistantMutation.mutate(lastAppointment.id)}
                    disabled={assignAssistantMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    {assignAssistantMutation.isPending ? 'Закрепляю...' : 'Взять на работу'}
                  </Button>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => {
                      if (lastAppointment) {
                        setSelectedAppointmentForRecord(lastAppointment);
                        setIsPatientDetailsOpen(false);
                        setIsMedicalRecordOpen(true);
                      } else {
                        alert('Нет записи со статусом "Прибыл" для этого пациента');
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={
                      !lastAppointment || 
                      (user?.role === 'ASSISTANT' && (!lastAppointment?.assistantId || lastAppointment?.assistantId !== user?.id))
                    }
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Записать диагноз
                  </Button>
                  
                  <Button
                    onClick={() => {
                      setIsPatientDetailsOpen(false);
                      setIsAssignOperationOpen(true);
                    }}
                    disabled={
                      user?.role === 'ASSISTANT' && (!lastAppointment?.assistantId || lastAppointment?.assistantId !== user?.id)
                    }
                  >
                    <Stethoscope className="w-4 h-4 mr-2" />
                    Услуги доктора
                  </Button>
                </div>

                {/* Assigned Services */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">
                    Назначенные услуги
                  </h3>
                  {patientOperations.length === 0 ? (
                    <p className="text-sm text-gray-600">Услуг пока нет</p>
                  ) : (
                    <div className="space-y-2">
                      {patientOperations.map((op: any) => (
                        <div
                          key={op.id}
                          className="p-3 border border-gray-200 rounded-lg"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium">{op.service.name}</h4>
                            <Badge className={getStatusColor(op.status)}>
                              {getStatusText(op.status)}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex justify-between">
                              <span>Цена:</span>
                              <span className="font-medium">
                                {Number(op.price).toLocaleString()} ₸
                              </span>
                            </div>
                            {op.scheduledDate && (
                              <div className="flex justify-between">
                                <span>Планируемая дата:</span>
                                <span>
                                  {format(new Date(op.scheduledDate), 'dd.MM.yyyy')}
                                </span>
                              </div>
                            )}
                            {op.notes && (
                              <p className="mt-2 text-xs">{op.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Medical Records */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">
                    История осмотров
                  </h3>
                  {medicalRecords.length === 0 ? (
                    <p className="text-sm text-gray-600">Записей пока нет</p>
                  ) : (
                    <div className="space-y-3">
                      {medicalRecords.map((record: any) => (
                        <div
                          key={record.id}
                          className="p-3 border border-gray-200 rounded-lg"
                        >
                          <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(record.createdAt), 'dd.MM.yyyy HH:mm', {
                              locale: ru,
                            })}
                          </div>
                          {record.diagnosis && (
                            <div className="mb-2">
                              <span className="text-xs font-medium text-gray-700">
                                Диагноз:
                              </span>
                              <p className="text-sm mt-1">{record.diagnosis}</p>
                            </div>
                          )}
                          {record.notes && (
                            <div>
                              <span className="text-xs font-medium text-gray-700">
                                Примечания:
                              </span>
                              <p className="text-sm mt-1">{record.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Assign Operation Dialog */}
      <Dialog open={isAssignOperationOpen} onOpenChange={setIsAssignOperationOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Назначить операцию</DialogTitle>
            <DialogDescription>
              Выберите операцию и укажите цену
            </DialogDescription>
          </DialogHeader>
          {selectedPatient && (
            <AssignOperationForm
              patientId={selectedPatient.id}
              patientName={selectedPatient.fullName}
              onSuccess={() => {
                setIsAssignOperationOpen(false);
                setIsPatientDetailsOpen(true);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Medical Record Dialog */}
      <Dialog open={isMedicalRecordOpen} onOpenChange={setIsMedicalRecordOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Записать диагноз</DialogTitle>
            <DialogDescription>
              Медицинская карта пациента
            </DialogDescription>
          </DialogHeader>
          {selectedAppointmentForRecord && (
            <MedicalRecordForm
              appointment={selectedAppointmentForRecord}
              onSuccess={() => {
                // Закрываем форму диагноза
                setIsMedicalRecordOpen(false);
                // Открываем карточку пациента обратно
                setIsPatientDetailsOpen(true);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
