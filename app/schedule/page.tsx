'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  Calendar, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  User,
  Phone,
  Stethoscope,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription 
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/api/client';
import { departmentsApi } from '@/api/departments.api';
import { usersApi } from '@/api/users.api';
import { useAuthStore } from '@/lib/store/auth';
import { useSocket, useScheduleEvents } from '@/lib/socket/hooks';
import { AppointmentForm } from '@/components/schedule/AppointmentForm';
import { PatientArrivedModal } from '@/components/schedule/PatientArrivedModal';
import { CancelAppointmentForm } from '@/components/schedule/CancelAppointmentForm';
import { RescheduleAppointmentForm } from '@/components/schedule/RescheduleAppointmentForm';
import { AppointmentStats } from '@/components/schedule/AppointmentStats';
import { appointmentsApi } from '@/api/appointments.api';
import type { Appointment, AppointmentStatus, Department, User as UserType } from '@/types';
import toast from 'react-hot-toast';

// Временные слоты (каждые 30 минут с 8:00 до 20:00)
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8;
  const minute = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minute}`;
});

export default function SchedulePage() {
  const queryClient = useQueryClient();
  const { user, accessToken } = useAuthStore();
  const { can } = usePermissions();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isArrivedOpen, setIsArrivedOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');
  const [selectedTime, setSelectedTime] = useState<string>('');

  // WebSocket подключение
  useSocket(accessToken);

  // Подписка на события расписания
  useScheduleEvents(user?.role === 'DOCTOR' ? user.id : null, {
    onCreated: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Новая запись создана');
    },
    onUpdated: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onCancelled: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast('Запись отменена');
    },
  });

  // Загрузка отделений
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await departmentsApi.getAll();
      return response.data || [];
    },
  });

  // Загрузка докторов по отделению
  const { data: doctors = [] } = useQuery<UserType[]>({
    queryKey: ['doctors', selectedDepartmentId],
    queryFn: async () => {
      if (!selectedDepartmentId || selectedDepartmentId === 'all') return [];
      const response = await usersApi.getDoctors(selectedDepartmentId);
      return response.data || [];
    },
    enabled: !!selectedDepartmentId && selectedDepartmentId !== 'all',
  });

  // Загрузка записей
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const response = await api.get<{ data: Appointment[] }>(
        `/api/appointments?date=${format(selectedDate, 'yyyy-MM-dd')}`
      );
      return response.data || [];
    },
  });

  // Фильтрация записей для оператора и доктора (видят только свои)
  const visibleAppointments = appointments.filter((apt) => {
    // Доктор видит только свои записи (где он назначен доктором)
    if (user?.role === 'DOCTOR') {
      return apt.doctorId === user?.id;
    }
    
    // Оператор видит только записи, которые он создал
    if (can('appointments:view:own') && !can('appointments:view:all')) {
      return apt.managerId === user?.id;
    }
    
    // Остальные роли видят все записи
    return true;
  });

  // Фильтрация по отделению и доктору
  const departmentFilteredAppointments = visibleAppointments.filter((apt) => {
    if (selectedDepartmentId && selectedDepartmentId !== 'all' && apt.departmentId !== selectedDepartmentId) {
      return false;
    }
    if (selectedDoctorId && selectedDoctorId !== 'all' && apt.doctorId !== selectedDoctorId) {
      return false;
    }
    return true;
  });

  // Фильтрация по поиску
  const filteredAppointments = departmentFilteredAppointments.filter((apt) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      apt.patient.fullName.toLowerCase().includes(query) ||
      apt.patient.phone.includes(query) ||
      apt.doctor.name.toLowerCase().includes(query) ||
      apt.service.name.toLowerCase().includes(query)
    );
  });

  // Группировка по времени
  const appointmentsByTime = filteredAppointments.reduce((acc, apt) => {
    if (!acc[apt.time]) acc[apt.time] = [];
    acc[apt.time].push(apt);
    return acc;
  }, {} as Record<string, Appointment[]>);

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsDetailsOpen(true);
  };

  const getStatusColor = (status: AppointmentStatus) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      CONFIRMED: 'bg-green-100 text-green-800 border-green-300',
      ARRIVED: 'bg-blue-100 text-blue-800 border-blue-300',
      DONE: 'bg-gray-100 text-gray-700 border-gray-300',
      CANCELLED: 'bg-red-100 text-red-800 border-red-300',
      NO_SHOW: 'bg-red-100 text-red-800 border-red-300',
      TRANSFERRED: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    };
    return colors[status] || colors.PENDING;
  };

  const getStatusText = (status: AppointmentStatus) => {
    const texts = {
      PENDING: 'Ожидание',
      CONFIRMED: 'Подтверждено',
      ARRIVED: 'Прибыл',
      DONE: 'Выполнено',
      CANCELLED: 'Отменено',
      NO_SHOW: 'Не пришёл',
      TRANSFERRED: 'Переведён',
    };
    return texts[status] || status;
  };

  return (
    <AppShell requiredPermissions={['appointments:view:all', 'appointments:view:own']}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Расписание</h1>
            <p className="text-gray-600 mt-1">
              {format(selectedDate, 'd MMMM yyyy, EEEE', { locale: ru })}
            </p>
            {user?.role === 'OPERATOR' && (
              <p className="text-sm text-blue-600 mt-1">
                💼 Вы видите только свои записи и свободные слоты
              </p>
            )}
            {user?.role === 'DOCTOR' && (
              <p className="text-sm text-blue-600 mt-1">
                👨‍⚕️ Ваше личное расписание
              </p>
            )}
            {user?.role === 'RECEPTIONIST' && (
              <p className="text-sm text-blue-600 mt-1">
                📋 Вы можете отмечать приход пациентов и управлять записями
              </p>
            )}
          </div>
          {can('appointments:create') && user?.role !== 'DOCTOR' && user?.role !== 'RECEPTIONIST' && (
            <Button onClick={() => {
              setSelectedTime('');
              setIsCreateOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Новая запись
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
          {/* Department and Doctor filters - только для не-докторов */}
          {user?.role !== 'DOCTOR' && (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Select
                  value={selectedDepartmentId}
                  onValueChange={(value) => {
                    setSelectedDepartmentId(value);
                    setSelectedDoctorId('all'); // Сбросить доктора при смене отделения
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Все отделения" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все отделения</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <Select
                  value={selectedDoctorId}
                  onValueChange={setSelectedDoctorId}
                  disabled={!selectedDepartmentId || selectedDepartmentId === 'all'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Все доктора" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все доктора</SelectItem>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        {doctor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Информация для доктора */}
          {user?.role === 'DOCTOR' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                👨‍⚕️ Вы видите только свои записи
              </p>
            </div>
          )}

          {/* Date Navigation */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(subDays(selectedDate, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <Input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="w-auto"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
            >
              Сегодня
            </Button>
          </div>

          {/* Search - только для не-операторов и не-докторов */}
          {user?.role !== 'OPERATOR' && user?.role !== 'DOCTOR' && (
            <Input
              placeholder="Поиск по пациенту, телефону, доктору..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          )}
        </div>

        {/* Statistics - для оператора и владельца */}
        {(user?.role === 'OPERATOR' || user?.role === 'OWNER') && (
          <AppointmentStats 
            date={selectedDate} 
            managerId={user?.role === 'OPERATOR' ? user.id : undefined}
          />
        )}

        {/* Schedule Grid */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {TIME_SLOTS.map((time) => {
                const slotsAtTime = appointmentsByTime[time] || [];
                
                // Проверка, прошло ли это время
                const now = new Date();
                const slotDateTime = new Date(selectedDate);
                const [hours, minutes] = time.split(':');
                slotDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                const isPastTime = slotDateTime < now;
                
                return (
                  <div
                    key={time}
                    className={`flex hover:bg-gray-50 transition-colors ${isPastTime ? 'opacity-50' : ''}`}
                  >
                    {/* Time Column */}
                    <div className="w-24 flex-shrink-0 p-4 border-r border-gray-200">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Clock className="w-4 h-4" />
                        {time}
                      </div>
                    </div>

                    {/* Appointments Column */}
                    <div className="flex-1 p-2">
                      {slotsAtTime.length === 0 ? (
                        <div className="h-full flex items-center justify-center gap-3">
                          <span className="text-gray-400 text-sm">
                            {isPastTime ? 'Прошло' : 'Свободно'}
                          </span>
                          {can('appointments:create') && !isPastTime && user?.role !== 'DOCTOR' && user?.role !== 'RECEPTIONIST' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedTime(time);
                                setIsCreateOpen(true);
                              }}
                              className="text-xs"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Создать запись
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {slotsAtTime.map((appointment) => {
                            const isCancelled = appointment.status === 'CANCELLED' || appointment.status === 'NO_SHOW';
                            
                            return (
                              <div key={appointment.id} className="space-y-2">
                                <button
                                  onClick={() => handleAppointmentClick(appointment)}
                                  disabled={isCancelled}
                                  className={`w-full text-left p-3 rounded-lg border-2 transition-all relative ${
                                    isCancelled
                                      ? 'opacity-50 cursor-not-allowed'
                                      : 'hover:shadow-md cursor-pointer'
                                  } ${getStatusColor(appointment.status)}`}
                                >
                                  {/* Status Badge - правый верхний угол */}
                                  <div className="absolute top-2 right-2">
                                    <Badge className={`text-xs px-2 py-0.5 ${getStatusColor(appointment.status)}`}>
                                      {getStatusText(appointment.status)}
                                    </Badge>
                                  </div>

                                  <div className="flex items-start justify-between mb-2 pr-20">
                                    <div className="flex items-center gap-2">
                                      <User className="w-4 h-4" />
                                      <span className="font-medium text-sm">
                                        {appointment.patient.fullName}
                                      </span>
                                    </div>
                                    {appointment.patient.isBlacklisted && (
                                      <AlertCircle className="w-4 h-4 text-red-600" />
                                    )}
                                  </div>
                                  
                                  <div className="space-y-1 text-xs">
                                    <div className="flex items-center gap-1">
                                      <Stethoscope className="w-3 h-3" />
                                      <span>{appointment.doctor.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Phone className="w-3 h-3" />
                                      <span>{appointment.patient.phone}</span>
                                    </div>
                                    <div className="font-medium">
                                      {appointment.service.name}
                                    </div>
                                    {appointment.prepayment > 0 && (
                                      <div className="flex items-center gap-1">
                                        <CreditCard className="w-3 h-3" />
                                        <span>{appointment.prepayment.toLocaleString()} ₸</span>
                                      </div>
                                    )}
                                  </div>
                                </button>
                                
                                {/* Кнопка создать запись для отмененных записей, если время не прошло */}
                                {isCancelled && !isPastTime && can('appointments:create') && user?.role !== 'DOCTOR' && user?.role !== 'RECEPTIONIST' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedTime(time);
                                      setIsCreateOpen(true);
                                    }}
                                    className="w-full text-xs"
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Создать запись на это время
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Empty State */}
        {!isLoading && filteredAppointments.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Нет записей
            </h3>
            <p className="text-gray-600 mb-4">
              На выбранную дату записей не найдено
            </p>
            {can('appointments:create') && user?.role !== 'DOCTOR' && (
              <Button onClick={() => {
                setSelectedTime('');
                setIsCreateOpen(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Создать запись
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Appointment Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedAppointment && (() => {
            // Проверка на прошедшее время
            const appointmentDateTime = new Date(selectedAppointment.date);
            const [hours, minutes] = selectedAppointment.time.split(':');
            appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            const isPastTime = appointmentDateTime < new Date();

            return (
            <>
              <SheetHeader>
                <SheetTitle>Детали записи</SheetTitle>
                <SheetDescription>
                  {format(new Date(selectedAppointment.date), 'd MMMM yyyy', { locale: ru })} в {selectedAppointment.time}
                  {isPastTime && (
                    <span className="block text-red-600 text-xs mt-1">⏰ Время записи прошло</span>
                  )}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Status */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Статус</label>
                  <Badge className={`mt-2 ${getStatusColor(selectedAppointment.status)}`}>
                    {getStatusText(selectedAppointment.status)}
                  </Badge>
                </div>

                {/* Patient */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Пациент</label>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">{selectedAppointment.patient.fullName}</p>
                    <p className="text-sm text-gray-600">{selectedAppointment.patient.phone}</p>
                    {selectedAppointment.patient.isBlacklisted && (
                      <Badge className="mt-2 bg-red-100 text-red-800">
                        Чёрный список
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Doctor */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Врач</label>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">{selectedAppointment.doctor.name}</p>
                    <p className="text-sm text-gray-600">{selectedAppointment.department.name}</p>
                  </div>
                </div>

                {/* Service */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Услуга</label>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">{selectedAppointment.service.name}</p>
                    <p className="text-sm text-gray-600">
                      {selectedAppointment.service.price.toLocaleString()} ₸
                    </p>
                  </div>
                </div>

                {/* Payment */}
                {selectedAppointment.prepayment > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Предоплата</label>
                    <p className="mt-2 text-lg font-semibold">
                      {selectedAppointment.prepayment.toLocaleString()} ₸
                    </p>
                  </div>
                )}

                {/* Comment */}
                {selectedAppointment.comment && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Комментарий</label>
                    <p className="mt-2 text-sm text-gray-600">{selectedAppointment.comment}</p>
                  </div>
                )}

                {/* Audit Info - только для владельца */}
                {user?.role === 'OWNER' && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <label className="text-sm font-medium text-blue-900 mb-2 block">
                      📋 История действий
                    </label>
                    <div className="space-y-2 text-xs text-blue-800">
                      <div className="flex justify-between">
                        <span>Создано:</span>
                        <span className="font-medium">
                          {format(new Date(selectedAppointment.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru })}
                        </span>
                      </div>
                      {selectedAppointment.manager && (
                        <div className="flex justify-between">
                          <span>Создал:</span>
                          <span className="font-medium">{selectedAppointment.manager.name}</span>
                        </div>
                      )}
                      {selectedAppointment.arrivedAt && (
                        <>
                          <div className="flex justify-between">
                            <span>Прибыл:</span>
                            <span className="font-medium">
                              {format(new Date(selectedAppointment.arrivedAt), 'dd.MM.yyyy HH:mm', { locale: ru })}
                            </span>
                          </div>
                          {selectedAppointment.arrivedBy && (
                            <div className="flex justify-between">
                              <span>Отметил прибытие:</span>
                              <span className="font-medium">{selectedAppointment.arrivedBy}</span>
                            </div>
                          )}
                        </>
                      )}
                      {selectedAppointment.cancelledAt && (
                        <>
                          <div className="flex justify-between">
                            <span>Отменено:</span>
                            <span className="font-medium">
                              {format(new Date(selectedAppointment.cancelledAt), 'dd.MM.yyyy HH:mm', { locale: ru })}
                            </span>
                          </div>
                          {selectedAppointment.cancelledBy && (
                            <div className="flex justify-between">
                              <span>Отменил:</span>
                              <span className="font-medium">{selectedAppointment.cancelledBy}</span>
                            </div>
                          )}
                        </>
                      )}
                      {selectedAppointment.transferredAt && (
                        <>
                          <div className="flex justify-between">
                            <span>Перенесено:</span>
                            <span className="font-medium">
                              {format(new Date(selectedAppointment.transferredAt), 'dd.MM.yyyy HH:mm', { locale: ru })}
                            </span>
                          </div>
                          {selectedAppointment.transferredBy && (
                            <div className="flex justify-between">
                              <span>Перенес:</span>
                              <span className="font-medium">{selectedAppointment.transferredBy}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2 pt-4 border-t">
                  {/* Кнопки для регистратуры - 3 кнопки */}
                  {user?.role === 'RECEPTIONIST' && selectedAppointment.status !== 'CANCELLED' && selectedAppointment.status !== 'DONE' && selectedAppointment.status !== 'ARRIVED' && !isPastTime && (
                    <>
                      <Button 
                        className="w-full"
                        onClick={() => {
                          setIsDetailsOpen(false);
                          setIsArrivedOpen(true);
                        }}
                      >
                        Принять оплату
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setIsDetailsOpen(false);
                            setIsRescheduleOpen(true);
                          }}
                        >
                          Перенести
                        </Button>
                        <Button 
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setIsDetailsOpen(false);
                            setIsCancelOpen(true);
                          }}
                        >
                          Отменить
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Кнопки для других ролей */}
                  {user?.role !== 'RECEPTIONIST' && !isPastTime && (
                    <>
                      {/* Кнопка "Пациент прибыл" - для любого статуса кроме отмененных и завершенных */}
                      {selectedAppointment.status !== 'CANCELLED' && 
                       selectedAppointment.status !== 'DONE' && 
                       selectedAppointment.status !== 'ARRIVED' && 
                       can('payments:create') && (
                        <Button 
                          className="w-full"
                          onClick={() => {
                            setIsDetailsOpen(false);
                            setIsArrivedOpen(true);
                          }}
                        >
                          Пациент прибыл
                        </Button>
                      )}
                      
                      <div className="flex gap-2">
                        {/* Оператор может редактировать только свои записи, остальные - все */}
                        {(
                          (user?.role === 'OPERATOR' && selectedAppointment.managerId === user?.id) ||
                          (user?.role !== 'OPERATOR' && can('appointments:update'))
                        ) && (
                          <Button 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => {
                              setIsDetailsOpen(false);
                              setIsEditOpen(true);
                            }}
                          >
                            Редактировать
                          </Button>
                        )}
                        {/* Оператор может удалять только свои записи, остальные - все */}
                        {(
                          (user?.role === 'OPERATOR' && selectedAppointment.managerId === user?.id && can('appointments:delete')) ||
                          (user?.role !== 'OPERATOR' && can('appointments:delete'))
                        ) && (
                          <Button 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => {
                              setIsDetailsOpen(false);
                              setIsCancelOpen(true);
                            }}
                          >
                            Отменить
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                  
                  {/* Сообщение если время прошло */}
                  {isPastTime && (
                    <div className="text-center text-sm text-gray-500 py-4">
                      ⏰ Редактирование недоступно - время записи прошло
                    </div>
                  )}
                  
                  {/* Сообщение для оператора о чужой записи */}
                  {!isPastTime && user?.role === 'OPERATOR' && selectedAppointment.managerId !== user?.id && (
                    <div className="text-center text-sm text-amber-600 py-4 bg-amber-50 rounded-lg">
                      ℹ️ Это запись другого оператора. Вы можете только просматривать её.
                    </div>
                  )}
                </div>
              </div>
            </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Create Appointment Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Новая запись</DialogTitle>
            <SheetDescription>
              {selectedTime && (
                <span className="text-blue-600 font-medium">
                  📅 {format(selectedDate, 'd MMMM yyyy', { locale: ru })} в {selectedTime}
                </span>
              )}
              {!selectedTime && (
                <span>Создайте новую запись на прием для пациента</span>
              )}
              {selectedDepartmentId !== 'all' && (
                <span className="block text-sm text-gray-600 mt-1">
                  🏥 {departments.find(d => d.id === selectedDepartmentId)?.name}
                  {selectedDoctorId !== 'all' && (
                    <> • 👨‍⚕️ {doctors.find(d => d.id === selectedDoctorId)?.name}</>
                  )}
                </span>
              )}
            </SheetDescription>
          </DialogHeader>
          <AppointmentForm
            onSuccess={() => {
              setIsCreateOpen(false);
              setSelectedTime('');
            }}
            defaultDate={format(selectedDate, 'yyyy-MM-dd')}
            defaultTime={selectedTime}
            defaultDepartmentId={selectedDepartmentId !== 'all' ? selectedDepartmentId : undefined}
            defaultDoctorId={selectedDoctorId !== 'all' ? selectedDoctorId : undefined}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать запись</DialogTitle>
            <SheetDescription>
              {selectedAppointment && (
                <span className="text-blue-600 font-medium">
                  📅 {format(new Date(selectedAppointment.date), 'd MMMM yyyy', { locale: ru })} в {selectedAppointment.time}
                </span>
              )}
            </SheetDescription>
          </DialogHeader>
          {selectedAppointment && (
            <AppointmentForm
              appointment={selectedAppointment}
              onSuccess={() => {
                setIsEditOpen(false);
                setSelectedAppointment(null);
              }}
              defaultDate={selectedAppointment.date}
              defaultTime={selectedAppointment.time}
              defaultDepartmentId={selectedAppointment.departmentId}
              defaultDoctorId={selectedAppointment.doctorId}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Patient Arrived Modal */}
      <PatientArrivedModal
        appointment={selectedAppointment}
        isOpen={isArrivedOpen}
        onClose={() => {
          setIsArrivedOpen(false);
          setSelectedAppointment(null);
        }}
      />

      {/* Cancel Modal */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Отменить запись</DialogTitle>
            <SheetDescription>
              Укажите причину отмены (обязательно)
            </SheetDescription>
          </DialogHeader>
          {selectedAppointment && (
            <CancelAppointmentForm
              appointment={selectedAppointment}
              onSuccess={() => {
                setIsCancelOpen(false);
                setSelectedAppointment(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Reschedule Modal */}
      <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Перенести запись</DialogTitle>
            <SheetDescription>
              Выберите новую дату и время для записи
            </SheetDescription>
          </DialogHeader>
          {selectedAppointment && (
            <RescheduleAppointmentForm
              appointment={selectedAppointment}
              onSuccess={() => {
                setIsRescheduleOpen(false);
                setSelectedAppointment(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
