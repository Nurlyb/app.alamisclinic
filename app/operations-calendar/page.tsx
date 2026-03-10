'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, addDays, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  User,
  Phone,
  Scissors,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { OperationPaymentModal } from '@/components/schedule/OperationPaymentModal';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription 
} from '@/components/ui/sheet';
import { api } from '@/api/client';
import { departmentsApi } from '@/api/departments.api';
import { usersApi } from '@/api/users.api';
import { useAuthStore } from '@/lib/store/auth';
import type { Department, User as UserType } from '@/types';

// Временные слоты (каждые 30 минут с 8:00 до 20:00)
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8;
  const minute = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minute}`;
});

interface Operation {
  id: string;
  patientId: string;
  doctorId: string;
  serviceId: string;
  price: number;
  notes: string | null;
  status: string;
  scheduledDate: string | null;
  completedDate: string | null;
  date: string | null;
  time: string | null;
  patient: {
    id: string;
    fullName: string;
    phone: string;
  };
  service: {
    id: string;
    name: string;
  };
}

export default function OperationsCalendarPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedOperation, setSelectedOperation] = useState<Operation | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');

  // Загрузка отделений (только для ассистентов)
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await departmentsApi.getAll();
      return response.data || [];
    },
    enabled: user?.role === 'ASSISTANT',
  });

  // Загрузка докторов по отделению (только для ассистентов)
  const { data: doctors = [] } = useQuery<UserType[]>({
    queryKey: ['doctors', selectedDepartmentId],
    queryFn: async () => {
      if (!selectedDepartmentId || selectedDepartmentId === 'all') return [];
      const response = await usersApi.getDoctors(selectedDepartmentId);
      return response.data || [];
    },
    enabled: user?.role === 'ASSISTANT' && !!selectedDepartmentId && selectedDepartmentId !== 'all',
  });

  // Загрузка операций
  const { data: operations = [], isLoading } = useQuery({
    queryKey: ['operations-calendar', format(selectedDate, 'yyyy-MM-dd'), selectedDoctorId],
    queryFn: async () => {
      let url = `/api/doctor-service-assignments/calendar?date=${format(selectedDate, 'yyyy-MM-dd')}`;
      
      // Добавляем doctorId только для ассистентов
      if (user?.role === 'ASSISTANT' && selectedDoctorId && selectedDoctorId !== 'all') {
        url += `&doctorId=${selectedDoctorId}`;
      }
      
      const response = await api.get<{ data: any[] }>(url);
      return response.data || [];
    },
  });

  // Группировка по времени
  const operationsByTime = operations.reduce((acc, op) => {
    const time = op.time || 'Не указано';
    if (!acc[time]) acc[time] = [];
    acc[time].push(op);
    return acc;
  }, {} as Record<string, Operation[]>);

  const handleOperationClick = (operation: Operation) => {
    setSelectedOperation(operation);
    // Для регистратора сразу открываем окно оплаты
    if (user?.role === 'RECEPTIONIST' && operation.status === 'PLANNED') {
      setIsPaymentOpen(true);
    } else {
      setIsDetailsOpen(true);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      PLANNED: 'bg-blue-100 text-blue-800 border-blue-300',
      PAID: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      COMPLETED: 'bg-green-100 text-green-800 border-green-300',
      CANCELLED: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[status as keyof typeof colors] || colors.PLANNED;
  };

  const getStatusText = (status: string) => {
    const texts = {
      PLANNED: 'Запланировано',
      PAID: 'Оплачено',
      COMPLETED: 'Выполнено',
      CANCELLED: 'Отменено',
    };
    return texts[status as keyof typeof texts] || status;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CreditCard className="w-4 h-4" />;
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4" />;
      case 'CANCELLED':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <AppShell requiredPermissions={['appointments:view:own', 'appointments:view:all']}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📅 Календарь услуг</h1>
            <p className="text-gray-600 mt-1">
              {format(selectedDate, 'd MMMM yyyy, EEEE', { locale: ru })}
            </p>
            {user?.role === 'DOCTOR' && (
              <p className="text-sm text-blue-600 mt-1">
                🩺 Ваши запланированные услуги
              </p>
            )}
            {user?.role === 'ASSISTANT' && (
              <p className="text-sm text-blue-600 mt-1">
                🩺 Вы можете просматривать услуги всех докторов
              </p>
            )}
            {user?.role === 'RECEPTIONIST' && (
              <p className="text-sm text-blue-600 mt-1">
                💰 Календарь услуг для приема оплаты
              </p>
            )}
          </div>
        </div>

        {/* Filters - только для ассистентов */}
        {user?.role === 'ASSISTANT' && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Select
                  value={selectedDepartmentId}
                  onValueChange={(value) => {
                    setSelectedDepartmentId(value);
                    setSelectedDoctorId('all');
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
          </div>
        )}

        {/* Date Navigation */}
        <div className="bg-white rounded-lg shadow-sm p-4">
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
        </div>

        {/* Operations Grid */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {TIME_SLOTS.map((time) => {
                const opsAtTime = operationsByTime[time] || [];
                
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

                    {/* Operations Column */}
                    <div className="flex-1 p-2">
                      {opsAtTime.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                          <span className="text-gray-400 text-sm">
                            {isPastTime ? 'Прошло' : 'Свободно'}
                          </span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {opsAtTime.map((operation: Operation) => (
                            <button
                              key={operation.id}
                              onClick={() => handleOperationClick(operation)}
                              className={`w-full text-left p-3 rounded-lg border-2 transition-all hover:shadow-md ${getStatusColor(operation.status)}`}
                            >
                              {/* Status Badge */}
                              <div className="flex items-center justify-between mb-2">
                                <Badge className={`text-xs px-2 py-0.5 flex items-center gap-1 ${getStatusColor(operation.status)}`}>
                                  {getStatusIcon(operation.status)}
                                  {getStatusText(operation.status)}
                                </Badge>
                              </div>

                              <div className="space-y-1 text-xs">
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  <span className="font-medium">{operation.patient.fullName}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Scissors className="w-3 h-3" />
                                  <span className="font-medium text-blue-700">{operation.service.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  <span>{operation.patient.phone}</span>
                                </div>
                                <div className="font-semibold text-green-700">
                                  {operation.price.toLocaleString()} ₸
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Операции без времени */}
              {operationsByTime['Не указано'] && operationsByTime['Не указано'].length > 0 && (
                <div className="flex bg-yellow-50">
                  <div className="w-24 flex-shrink-0 p-4 border-r border-gray-200">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <AlertCircle className="w-4 h-4" />
                      Без времени
                    </div>
                  </div>
                  <div className="flex-1 p-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {operationsByTime['Не указано'].map((operation: Operation) => (
                        <button
                          key={operation.id}
                          onClick={() => handleOperationClick(operation)}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all hover:shadow-md ${getStatusColor(operation.status)}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge className={`text-xs px-2 py-0.5 flex items-center gap-1 ${getStatusColor(operation.status)}`}>
                              {getStatusIcon(operation.status)}
                              {getStatusText(operation.status)}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span className="font-medium">{operation.patient.fullName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Scissors className="w-3 h-3" />
                              <span className="font-medium text-blue-700">{operation.service.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span>{operation.patient.phone}</span>
                            </div>
                            <div className="font-semibold text-green-700">
                              {operation.price.toLocaleString()} ₸
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Empty State */}
        {!isLoading && operations.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Scissors className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Нет услуг
            </h3>
            <p className="text-gray-600">
              На выбранную дату услуг не запланировано
            </p>
          </div>
        )}
      </div>

      {/* Operation Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedOperation && (
            <>
              <SheetHeader>
                <SheetTitle>Детали услуги</SheetTitle>
                <SheetDescription>
                  {selectedOperation.date && format(new Date(selectedOperation.date), 'd MMMM yyyy', { locale: ru })}
                  {selectedOperation.time && ` в ${selectedOperation.time}`}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Status */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Статус</label>
                  <Badge className={`mt-2 flex items-center gap-2 w-fit ${getStatusColor(selectedOperation.status)}`}>
                    {getStatusIcon(selectedOperation.status)}
                    {getStatusText(selectedOperation.status)}
                  </Badge>
                </div>

                {/* Patient */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Пациент</label>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">{selectedOperation.patient.fullName}</p>
                    <p className="text-sm text-gray-600">{selectedOperation.patient.phone}</p>
                  </div>
                </div>

                {/* Service */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Услуга</label>
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                    <p className="font-medium text-blue-900">{selectedOperation.service.name}</p>
                  </div>
                </div>

                {/* Price */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Стоимость</label>
                  <p className="mt-2 text-2xl font-bold text-green-700">
                    {selectedOperation.price.toLocaleString()} ₸
                  </p>
                </div>

                {/* Notes */}
                {selectedOperation.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Примечания</label>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedOperation.notes}</p>
                    </div>
                  </div>
                )}

                {/* Completed Date */}
                {selectedOperation.completedDate && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Дата выполнения</label>
                    <p className="mt-2 text-sm text-gray-600">
                      {format(new Date(selectedOperation.completedDate), 'd MMMM yyyy, HH:mm', { locale: ru })}
                    </p>
                  </div>
                )}

                {/* Payment Button for Receptionist */}
                {user?.role === 'RECEPTIONIST' && selectedOperation.status === 'PLANNED' && (
                  <div className="pt-4 border-t">
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setIsDetailsOpen(false);
                        setIsPaymentOpen(true);
                      }}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Принять оплату
                    </Button>
                  </div>
                )}

                {/* Info for non-receptionist roles */}
                {user?.role !== 'RECEPTIONIST' && selectedOperation.status === 'PLANNED' && (
                  <div className="pt-4 border-t">
                    <div className="text-center text-sm text-gray-600 py-2 bg-blue-50 rounded-lg">
                      ℹ️ Оплата принимается регистратором
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Payment Modal */}
      <OperationPaymentModal
        operation={selectedOperation}
        isOpen={isPaymentOpen}
        onClose={() => {
          setIsPaymentOpen(false);
          setSelectedOperation(null);
          // Обновляем список операций после оплаты
          queryClient.invalidateQueries({ queryKey: ['operations-calendar'] });
        }}
      />
    </AppShell>
  );
}
