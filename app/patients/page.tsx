'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  User, 
  Phone, 
  Calendar,
  AlertCircle,
  CreditCard,
  FileText,
  Edit,
  Ban
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { patientsApi } from '@/api/patients.api';
import type { Patient } from '@/types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function PatientsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  // Загрузка пациентов
  const { data, isLoading } = useQuery({
    queryKey: ['patients', searchQuery, page],
    queryFn: async () => {
      const response = await patientsApi.getAll({
        search: searchQuery || undefined,
        page,
        limit,
      });
      return response;
    },
  });

  const patients = data?.data || [];
  const pagination = data?.pagination;

  const handlePatientClick = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsDetailsOpen(true);
  };

  const getSourceBadge = (source: string) => {
    const colors = {
      INSTAGRAM: 'bg-pink-100 text-pink-800',
      GIS: 'bg-blue-100 text-blue-800',
      REFERRAL: 'bg-green-100 text-green-800',
      SITE: 'bg-purple-100 text-purple-800',
      OTHER: 'bg-gray-100 text-gray-800',
    };
    return colors[source as keyof typeof colors] || colors.OTHER;
  };

  const getSourceText = (source: string) => {
    const texts = {
      INSTAGRAM: 'Instagram',
      GIS: '2GIS',
      REFERRAL: 'Рекомендация',
      SITE: 'Сайт',
      OTHER: 'Другое',
    };
    return texts[source as keyof typeof texts] || source;
  };

  return (
    <AppShell requiredPermissions={['patients:view']}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Пациенты</h1>
            <p className="text-gray-600 mt-1">
              Всего: {pagination?.total || 0}
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Новый пациент
          </Button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Поиск по имени, телефону, ИИН..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
        </div>

        {/* Patients Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : patients.length === 0 ? (
            <div className="p-12 text-center">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Пациенты не найдены
              </h3>
              <p className="text-gray-600 mb-4">
                Попробуйте изменить параметры поиска
              </p>
            </div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Пациент
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Телефон
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Источник
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Записей
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Долг
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Дата регистрации
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {patients.map((patient) => (
                    <tr
                      key={patient.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handlePatientClick(patient)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                              {patient.fullName}
                              {patient.isBlacklisted && (
                                <AlertCircle className="w-4 h-4 text-red-600" />
                              )}
                            </div>
                            {patient.iin && (
                              <div className="text-sm text-gray-500">
                                ИИН: {patient.iin}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-900">
                          <Phone className="w-4 h-4 text-gray-400" />
                          {patient.phone}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getSourceBadge(patient.source)}>
                          {getSourceText(patient.source)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {patient._count?.appointments || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {patient.debt > 0 ? (
                          <span className="text-sm font-medium text-red-600">
                            {patient.debt.toLocaleString()} ₸
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(patient.createdAt), 'd MMM yyyy', { locale: ru })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePatientClick(patient);
                          }}
                        >
                          Открыть
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Страница {pagination.page} из {pagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Назад
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === pagination.totalPages}
                    >
                      Вперёд
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Patient Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedPatient && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selectedPatient.fullName}
                  {selectedPatient.isBlacklisted && (
                    <Badge className="bg-red-100 text-red-800">
                      Чёрный список
                    </Badge>
                  )}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Contact Info */}
                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <h3 className="font-medium text-gray-900">Контактная информация</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{selectedPatient.phone}</span>
                    </div>
                    {selectedPatient.iin && (
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span>ИИН: {selectedPatient.iin}</span>
                      </div>
                    )}
                    {selectedPatient.dateOfBirth && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>
                          Дата рождения:{' '}
                          {format(new Date(selectedPatient.dateOfBirth), 'd MMMM yyyy', {
                            locale: ru,
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-600 mb-1">Записей</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {selectedPatient._count?.appointments || 0}
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-sm text-green-600 mb-1">Платежей</div>
                    <div className="text-2xl font-bold text-green-900">
                      {selectedPatient._count?.payments || 0}
                    </div>
                  </div>
                </div>

                {/* Debt */}
                {selectedPatient.debt > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800 mb-2">
                      <CreditCard className="w-5 h-5" />
                      <span className="font-medium">Задолженность</span>
                    </div>
                    <div className="text-2xl font-bold text-red-900">
                      {selectedPatient.debt.toLocaleString()} ₸
                    </div>
                  </div>
                )}

                {/* Blacklist Reason */}
                {selectedPatient.isBlacklisted && selectedPatient.blacklistReason && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800 mb-2">
                      <Ban className="w-5 h-5" />
                      <span className="font-medium">Причина блокировки</span>
                    </div>
                    <p className="text-sm text-red-900">
                      {selectedPatient.blacklistReason}
                    </p>
                  </div>
                )}

                {/* Source */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Источник</label>
                  <Badge className={`mt-2 ${getSourceBadge(selectedPatient.source)}`}>
                    {getSourceText(selectedPatient.source)}
                  </Badge>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" className="flex-1">
                    <Edit className="w-4 h-4 mr-2" />
                    Редактировать
                  </Button>
                  <Button
                    variant="outline"
                    className={selectedPatient.isBlacklisted ? 'flex-1' : 'flex-1 text-red-600'}
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    {selectedPatient.isBlacklisted ? 'Разблокировать' : 'В чёрный список'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Patient Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый пациент</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center text-gray-600">
            Форма создания пациента будет добавлена в следующем шаге
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
