'use client';

import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#fff',
          color: '#0F172A',
          border: '1px solid #E2E8F0',
          borderRadius: '0.5rem',
          padding: '12px 16px',
        },
        success: {
          iconTheme: {
            primary: '#16A34A',
            secondary: '#fff',
          },
        },
        error: {
          iconTheme: {
            primary: '#DC2626',
            secondary: '#fff',
          },
        },
      }}
    />
  );
}
