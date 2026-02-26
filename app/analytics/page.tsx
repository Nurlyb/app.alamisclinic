'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth';
import { apiClient } from '@/lib/api/client';

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'OWNER') {
      router.push('/dashboard');
      return;
    }
    loadAnalytics();
  }, [isAuthenticated, user]);

  const loadAnalytics = async () => {
    setLoading(true);
    const { data } = await apiClient.get('/api/analytics/dashboard');
    if (data) {
      setAnalytics(data);
    }
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
              <h1 className="text-2xl font-bold text-gray-900">📊 Аналитика</h1>
              <p className="text-sm text-gray-600">Отчёты и статистика клиники</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Общая статистика */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Выручка сегодня</span>
              <span className="text-2xl">💰</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {analytics?.today?.revenue?.toLocaleString('ru-KZ') || 0} ₸
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Пациентов: {analytics?.today?.patients || 0}
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Выручка за неделю</span>
              <span className="text-2xl">📈</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {analytics?.week?.revenue?.toLocaleString('ru-KZ') || 0} ₸
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Пациентов: {analytics?.week?.patients || 0}
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Выручка за месяц</span>
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {analytics?.month?.revenue?.toLocaleString('ru-KZ') || 0} ₸
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Пациентов: {analytics?.month?.patients || 0}
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Конверсия</span>
              <span className="text-2xl">🎯</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {analytics?.month?.conversionRate || 0}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Записей: {analytics?.month?.appointments || 0}
            </p>
          </div>
        </div>

        {/* Топ врачей */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Топ врачей по выручке
            </h2>
          </div>
          <div className="p-6">
            {analytics?.topDoctors?.length > 0 ? (
              <div className="space-y-4">
                {analytics.topDoctors.map((doctor: any, index: number) => (
                  <div key={doctor.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl font-bold text-gray-400">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {doctor.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {doctor.department?.name}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {doctor.revenue?.toLocaleString('ru-KZ')} ₸
                      </div>
                      <div className="text-sm text-gray-600">
                        {doctor.patients} пациентов
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                Данных пока нет
              </p>
            )}
          </div>
        </div>

        {/* Популярные услуги */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Популярные услуги
            </h2>
          </div>
          <div className="p-6">
            {analytics?.topServices?.length > 0 ? (
              <div className="space-y-4">
                {analytics.topServices.map((service: any, index: number) => (
                  <div key={service.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl font-bold text-gray-400">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {service.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {service.price?.toLocaleString('ru-KZ')} ₸
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {service.count} раз
                      </div>
                      <div className="text-sm text-gray-600">
                        {service.revenue?.toLocaleString('ru-KZ')} ₸
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                Данных пока нет
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
