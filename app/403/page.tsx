'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Доступ запрещён
        </h1>
        <p className="text-gray-600 mb-8">
          У вас нет прав для просмотра этой страницы
        </p>
        <Link href="/dashboard">
          <Button>
            Вернуться на главную
          </Button>
        </Link>
      </div>
    </div>
  );
}
