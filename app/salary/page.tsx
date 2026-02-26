'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth';
import { apiClient } from '@/lib/api/client';

export default function SalaryPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [summary, setSummary] = useState<any>(null);
  const [accruals, setAccruals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'DOCTOR' && user?.role !== 'OWNER') {
      router.push('/dashboard');
      return;
    }
    loadSalary();
  }, [isAuthenticated, user]);

  const loadSalary = async () => {
    setLoading(true);
    
    const now = new Date();
    const month = (now.getMonth() + 1).toString();
    const year = now.getFullYear().toString();

    const [summaryRes, accrualsRes] = await Promise.all([
      apiClient.get(`/api/salary/summary?month=${month}&year=${year}`),
      apiClient.get(`/api/salary/accruals?month=${month}&year=${year}`)
    ]);

    if (summaryRes.data) setSummary(summaryRes.data);
    if (accrualsRes.data) setAccruals(Array.isArray(accrualsRes.data) ? accrualsRes.data : []);
    
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 text-sm mb-2 inline-block">
                ← Назад
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">💼 Моя зарплата</h1>
              <p className="text-sm text-gray-600">Начисления и статистика</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Сводка */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">Всего начислено</span>
                <span className="text-2xl">💰</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {summary.totalEarned?.toLocaleString('ru-KZ') || 0} ₸
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">Приёмов</span>
                <span className="text-2xl">👥</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {summary.totalAppointments || 0}
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">Средний чек</span>
                <span className="text-2xl">📊</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {summary.averageCheck?.toLocaleString('ru-KZ') || 0} ₸
              </p>
            </div>
          </div>
        )}

        {/* Начисления */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Начисления за текущий месяц
            </h2>
          </div>

          {accruals.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">💼</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Начислений пока нет
              </h3>
              <p className="text-gray-600">
                Начисления появятся после завершённых приёмов
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Дата
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Пациент
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Услуга
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Сумма услуги
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ваш %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Начислено
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {accruals.map((accrual: any) => (
                    <tr key={accrual.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(accrual.date).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {accrual.patient?.fullName}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {accrual.service?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {accrual.serviceAmount?.toLocaleString('ru-KZ')} ₸
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {accrual.percentage}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-green-600">
                          +{accrual.amount?.toLocaleString('ru-KZ')} ₸
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
