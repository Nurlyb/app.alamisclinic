'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShieldX } from 'lucide-react';

export default function ForbiddenPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <ShieldX className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Доступ запрещён
        </h1>
        <p className="text-gray-600 mb-6">
          У вас недостаточно прав для доступа к этой странице
        </p>
        <Button onClick={() => router.push('/dashboard')}>
          Вернуться на главную
        </Button>
      </div>
    </div>
  );
}