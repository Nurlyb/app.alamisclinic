'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Loader2, Building2, Briefcase, Stethoscope } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api/client';
import { departmentsApi } from '@/api/departments.api';
import { DepartmentForm } from '@/components/settings/DepartmentForm';
import { ServiceForm } from '@/components/services/ServiceForm';
import { DoctorServiceForm } from '@/components/settings/DoctorServiceForm';
import type { Department, Service } from '@/types';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all');
  
  // Department modals
  const [isDeptCreateOpen, setIsDeptCreateOpen] = useState(false);
  const [isDeptEditOpen, setIsDeptEditOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  
  // Service modals
  const [isServiceCreateOpen, setIsServiceCreateOpen] = useState(false);
  const [isServiceEditOpen, setIsServiceEditOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Doctor Service modals
  const [isDoctorServiceCreateOpen, setIsDoctorServiceCreateOpen] = useState(false);
  const [isDoctorServiceEditOpen, setIsDoctorServiceEditOpen] = useState(false);
  const [selectedDoctorService, setSelectedDoctorService] = useState<any>(null);

  // Загрузка отделений
  const { data: departments = [], isLoading: deptLoading } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await departmentsApi.getAll();
      return response.data || [];
    },
  });

  // Загрузка услуг
  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await api.get<{ data: Service[] }>('/api/services');
      return response?.data || [];
    },
  });

  // Удаление отделения
  const deleteDeptMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/departments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Отделение деактивировано');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Ошибка деактивации');
    },
  });

  // Удаление услуги
  const deleteServiceMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/services/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Услуга деактивирована');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Ошибка деактивации');
    },
  });

  // Загрузка услуг докторов (операций)
  const { data: doctorServices = [], isLoading: doctorServicesLoading } = useQuery({
    queryKey: ['doctor-services'],
    queryFn: async () => {
      const response = await api.get<{ data: { services: any[] } }>('/api/doctor-services');
      return response?.data?.services || [];
    },
  });

  // Удаление услуги доктора
  const deleteDoctorServiceMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/doctor-services/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-services'] });
      toast.success('Услуга доктора деактивирована');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Ошибка деактивации');
    },
  });

  // Фильтрация услуг
  const filteredServices = services.filter((service) => {
    if (selectedDepartmentId !== 'all' && service.departmentId !== selectedDepartmentId) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        service.name.toLowerCase().includes(query) ||
        service.code.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <AppShell requiredPermissions={['departments:manage', 'services:manage']}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Настройки</h1>
          <p className="text-gray-600 mt-1">
            Управление отделениями и услугами клиники
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="departments" className="space-y-6">
          <TabsList>
            <TabsTrigger value="departments">
              <Building2 className="w-4 h-4 mr-2" />
              Отделения
            </TabsTrigger>
            <TabsTrigger value="services">
              <Briefcase className="w-4 h-4 mr-2" />
              Услуги
            </TabsTrigger>
            <TabsTrigger value="doctor-services">
              <Stethoscope className="w-4 h-4 mr-2" />
              Услуги докторов
            </TabsTrigger>
          </TabsList>

          {/* Departments Tab */}
          <TabsContent value="departments" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Всего отделений: {departments.length}
              </p>
              <Button onClick={() => setIsDeptCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Добавить отделение
              </Button>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {deptLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                  {departments.map((dept) => (
                    <div
                      key={dept.id}
                      className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-all"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedDepartment(dept);
                              setIsDeptEditOpen(true);
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          {dept.isActive && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Деактивировать отделение "${dept.name}"?`)) {
                                  deleteDeptMutation.mutate(dept.id);
                                }
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">
                          Услуг: {services.filter(s => s.departmentId === dept.id).length}
                        </span>
                        <span className={dept.isActive ? 'text-green-600' : 'text-red-600'}>
                          {dept.isActive ? '● Активно' : '● Неактивно'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!deptLoading && departments.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">Отделения не найдены</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-4">
            <div className="flex justify-between items-center gap-4">
              <div className="flex-1 flex gap-4">
                <Input
                  placeholder="Поиск по названию или коду..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-md"
                />
                <select
                  value={selectedDepartmentId}
                  onChange={(e) => setSelectedDepartmentId(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="all">Все отделения</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={() => setIsServiceCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Добавить услугу
              </Button>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {servicesLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Код
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Название
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Отделение
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Цена
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Длительность
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Действия
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredServices.map((service) => (
                        <tr key={service.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {service.code}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {service.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {service.department?.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {service.price.toLocaleString()} ₸
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {service.durationMin} мин
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedService(service);
                                  setIsServiceEditOpen(true);
                                }}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              {service.isActive && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm(`Деактивировать услугу "${service.name}"?`)) {
                                      deleteServiceMutation.mutate(service.id);
                                    }
                                  }}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!servicesLoading && filteredServices.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">Услуги не найдены</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Doctor Services Tab */}
          <TabsContent value="doctor-services" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Всего услуг докторов: {doctorServices.length}
              </p>
              <Button onClick={() => setIsDoctorServiceCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Добавить услугу доктора
              </Button>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {doctorServicesLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                  {doctorServices.map((service: any) => (
                    <div
                      key={service.id}
                      className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-all"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-gray-900">{service.name}</h3>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedDoctorService(service);
                              setIsDoctorServiceEditOpen(true);
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          {service.isActive && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Деактивировать услугу "${service.name}"?`)) {
                                  deleteDoctorServiceMutation.mutate(service.id);
                                }
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {service.description && (
                        <p className="text-sm text-gray-600 mb-3">{service.description}</p>
                      )}
                      {service.departments && service.departments.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-1">Отделения:</p>
                          <div className="flex flex-wrap gap-1">
                            {service.departments.map((dept: any) => (
                              <span
                                key={dept.department.id}
                                className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                              >
                                {dept.department.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        Создано: {new Date(service.createdAt).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!doctorServicesLoading && doctorServices.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">Услуги докторов не найдены</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Department Dialogs */}
      <Dialog open={isDeptCreateOpen} onOpenChange={setIsDeptCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить отделение</DialogTitle>
          </DialogHeader>
          <DepartmentForm
            onSuccess={() => {
              setIsDeptCreateOpen(false);
              queryClient.invalidateQueries({ queryKey: ['departments'] });
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isDeptEditOpen} onOpenChange={setIsDeptEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать отделение</DialogTitle>
          </DialogHeader>
          {selectedDepartment && (
            <DepartmentForm
              department={selectedDepartment}
              onSuccess={() => {
                setIsDeptEditOpen(false);
                setSelectedDepartment(null);
                queryClient.invalidateQueries({ queryKey: ['departments'] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Service Dialogs */}
      <Dialog open={isServiceCreateOpen} onOpenChange={setIsServiceCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Добавить услугу</DialogTitle>
          </DialogHeader>
          <ServiceForm
            onSuccess={() => {
              setIsServiceCreateOpen(false);
              queryClient.invalidateQueries({ queryKey: ['services'] });
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isServiceEditOpen} onOpenChange={setIsServiceEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактировать услугу</DialogTitle>
          </DialogHeader>
          {selectedService && (
            <ServiceForm
              service={selectedService}
              onSuccess={() => {
                setIsServiceEditOpen(false);
                setSelectedService(null);
                queryClient.invalidateQueries({ queryKey: ['services'] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Doctor Service Dialogs */}
      <Dialog open={isDoctorServiceCreateOpen} onOpenChange={setIsDoctorServiceCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Добавить услугу доктора</DialogTitle>
          </DialogHeader>
          <DoctorServiceForm
            onSuccess={() => {
              setIsDoctorServiceCreateOpen(false);
              queryClient.invalidateQueries({ queryKey: ['doctor-services'] });
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isDoctorServiceEditOpen} onOpenChange={setIsDoctorServiceEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Редактировать услугу доктора</DialogTitle>
          </DialogHeader>
          {selectedDoctorService && (
            <DoctorServiceForm
              service={selectedDoctorService}
              onSuccess={() => {
                setIsDoctorServiceEditOpen(false);
                setSelectedDoctorService(null);
                queryClient.invalidateQueries({ queryKey: ['doctor-services'] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
