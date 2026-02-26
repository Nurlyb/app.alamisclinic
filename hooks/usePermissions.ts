import { useAuthStore } from '@/lib/store/auth';
import { Role, Permission } from '@/types';

// RBAC таблица прав доступа
const PERMISSIONS_MAP: Record<string, Permission[]> = {
  'OWNER': [
    'view:schedule',
    'create:appointment',
    'update:appointment',
    'delete:appointment',
    'view:patients',
    'create:patient',
    'update:patient',
    'blacklist:patient',
    'view:payments',
    'create:payment',
    'view:refunds',
    'approve:refund',
    'view:directions',
    'create:direction',
    'view:medical_records',
    'create:medical_record',
    'view:salary',
    'view:analytics',
    'manage:users',
    'manage:services',
    'view:audit_log',
  ],
  'OPERATOR': [
    'view:schedule',
    'view:own:appointments', // Видит только свои записи
    'create:appointment',
    'update:own:appointment', // Редактирует только свои записи
    'view:patients',
    'create:patient',
    'update:patient',
    'view:payments',
    'view:directions',
    'create:direction',
    'view:analytics',
  ],
  'MANAGER': [
    'view:schedule',
    'create:appointment',
    'update:appointment',
    'view:patients',
    'create:patient',
    'update:patient',
    'view:payments',
    'view:directions',
    'create:direction',
    'view:analytics',
  ],
  'RECEPTIONIST': [
    'view:schedule',
    'create:appointment',
    'update:appointment',
    'view:patients',
    'create:patient',
    'update:patient',
    'blacklist:patient',
    'view:payments',
    'create:payment',
    'view:refunds',
    'view:directions',
  ],
  'ASSISTANT': [
    'view:schedule',
    'view:patients',
    'view:directions',
  ],
  'CASHIER': [
    'view:schedule',
    'view:patients',
    'view:payments',
    'create:payment',
    'view:refunds',
  ],
  'DOCTOR': [
    'view:schedule',
    'view:patients',
    'view:directions',
    'create:direction',
    'view:medical_records',
    'create:medical_record',
    'view:salary',
  ],
};

export function usePermissions() {
  const user = useAuthStore((state) => state.user);

  const can = (permission: Permission): boolean => {
    if (!user) return false;
    
    const userPermissions = PERMISSIONS_MAP[user.role] || [];
    return userPermissions.includes(permission);
  };

  const canAny = (permissions: Permission[]): boolean => {
    return permissions.some((permission) => can(permission));
  };

  const canAll = (permissions: Permission[]): boolean => {
    return permissions.every((permission) => can(permission));
  };

  return {
    can,
    canAny,
    canAll,
    permissions: user ? PERMISSIONS_MAP[user.role] || [] : [],
  };
}
