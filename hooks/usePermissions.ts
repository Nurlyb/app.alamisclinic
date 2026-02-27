import { useAuthStore } from '@/lib/store/auth';
import { hasPermission, hasAnyPermission, hasAllPermissions, Permission } from '@/lib/auth/rbac';

export function usePermissions() {
  const user = useAuthStore((state) => state.user);

  const can = (permission: Permission): boolean => {
    if (!user) return false;
    return hasPermission(user.role, permission);
  };

  const canAny = (permissions: Permission[]): boolean => {
    if (!user) return false;
    return hasAnyPermission(user.role, permissions);
  };

  const canAll = (permissions: Permission[]): boolean => {
    if (!user) return false;
    return hasAllPermissions(user.role, permissions);
  };

  return {
    can,
    canAny,
    canAll,
  };
}
