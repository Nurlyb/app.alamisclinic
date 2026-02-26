import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/components/providers/query-provider';
import { ToastProvider } from '@/components/providers/toast-provider';
import { AuthInitializer } from '@/components/auth/AuthInitializer';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: 'Alamis Clinic - Система управления клиникой',
  description: 'Полнофункциональная система управления медицинской клиникой',
  icons: {
    icon: '/alamis_logo.png',
    apple: '/alamis_logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <QueryProvider>
          <AuthInitializer>
            {children}
          </AuthInitializer>
          <ToastProvider />
        </QueryProvider>
      </body>
    </html>
  );
}
