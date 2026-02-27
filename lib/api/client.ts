/**
 * API Client с автоматическим refresh токенов
 */

import { useAuthStore } from '@/lib/store/auth';

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

class APIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async refreshAccessToken(): Promise<string | null> {
    const { refreshToken, updateToken, logout } = useAuthStore.getState();

    if (!refreshToken) {
      logout();
      return null;
    }

    try {
      const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        logout();
        return null;
      }

      const data = await response.json();
      updateToken(data.accessToken);
      return data.accessToken;
    } catch (error) {
      logout();
      return null;
    }
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data?: T; error?: string }> {
    const { accessToken } = useAuthStore.getState();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    try {
      let response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
      });

      // Если 401, пробуем обновить токен
      if (response.status === 401) {
        const newToken = await this.refreshAccessToken();
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
          response = await fetch(`${this.baseURL}${endpoint}`, {
            ...options,
            headers,
          });
        }
      }

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Произошла ошибка' };
      }

      return { data };
    } catch (error) {
      return { error: 'Ошибка сети' };
    }
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  put<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  patch<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new APIClient(API_URL);
