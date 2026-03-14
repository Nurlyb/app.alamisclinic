'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/lib/store/auth';
import { authApi } from '@/api/auth.api';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  phone: z.string().min(10, 'Введите корректный номер телефона'),
  password: z.string().min(1, 'Введите пароль'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [isLoading, setIsLoading] = useState(false);

  // Если уже авторизован - редирект на dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const [selectedRole, setSelectedRole] = useState<string>('owner');

  const testAccounts = {
    owner: { phone: '+77001234567', password: 'clinic123', name: 'Владелец' },
    operator: { phone: '+77001234568', password: 'clinic123', name: 'Оператор' },
    receptionist: { phone: '+77001234569', password: 'clinic123', name: 'Регистратор' },
    assistant: { phone: '+77001234570', password: 'clinic123', name: 'Ассистент' },
    doctor1: { phone: '+77001234571', password: 'clinic123', name: 'Доктор 1' },
    doctor2: { phone: '+77001234572', password: 'clinic123', name: 'Доктор 2' },
    doctor3: { phone: '+77001234573', password: 'clinic123', name: 'Доктор 3' },
  };

  const fillTestData = (role: string) => {
    const account = testAccounts[role as keyof typeof testAccounts];
    if (account) {
      setValue('phone', account.phone);
      setValue('password', account.password);
      setSelectedRole(role);
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      const response = await authApi.login(data);
      
      if (response.success) {
        login(response.user, response.tokens.accessToken, response.tokens.refreshToken);
        toast.success(`Добро пожаловать, ${response.user.name}!`);
        router.push('/dashboard');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка входа');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <Image
                src="/alamis_logo.png"
                alt="Alamis Clinic"
                width={180}
                height={60}
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Система управления клиникой
            </h1>
            <p className="text-gray-600">Вход в систему</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Телефон
              </label>
              <Input
                {...register('phone')}
                type="tel"
                placeholder="+77001234567"
                disabled={isLoading}
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Пароль
              </label>
              <Input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                disabled={isLoading}
                className={errors.password ? 'border-red-500' : ''}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Вход...
                </>
              ) : (
                'Войти'
              )}
            </Button>

            {/* Test data buttons */}
            <div className="space-y-2">
              <p className="text-xs text-gray-600 font-medium text-center">
                Быстрый вход:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fillTestData('owner')}
                  disabled={isLoading}
                  className="text-xs"
                >
                  👑 Владелец
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fillTestData('operator')}
                  disabled={isLoading}
                  className="text-xs"
                >
                  💼 Оператор
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fillTestData('receptionist')}
                  disabled={isLoading}
                  className="text-xs"
                >
                  📋 Регистратор
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fillTestData('assistant')}
                  disabled={isLoading}
                  className="text-xs"
                >
                  🤝 Ассистент
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fillTestData('doctor1')}
                  disabled={isLoading}
                  className="text-xs"
                >
                  👨‍⚕️ Доктор 1
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fillTestData('doctor2')}
                  disabled={isLoading}
                  className="text-xs"
                >
                  👩‍⚕️ Доктор 2
                </Button>
              </div>
            </div>
          </form>

          {/* Test credentials info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800 mb-2 font-medium">
              ℹ️ Все пароли: <span className="font-mono">clinic123</span>
            </p>
            <div className="space-y-1 text-xs text-blue-700">
              <p>👑 Владелец: +77001234567</p>
              <p>💼 Оператор: +77001234568</p>
              <p>📋 Регистратор: +77001234569</p>
              <p>🤝 Ассистент: +77001234570</p>
              <p>👨‍⚕️ Доктора: +77001234571-573</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          © 2026 Alamis Clinic
        </p>
      </div>
    </div>
  );
}
