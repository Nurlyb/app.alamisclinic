/**
 * RBAC (Role-Based Access Control)
 * Определение прав доступа для каждой роли
 */

import { Role } from '@prisma/client';

export type Permission =
  // Расписание
  | 'appointments:view:all'
  | 'appointments:view:own'
  | 'appointments:create'
  | 'appointments:update'
  | 'appointments:delete'
  | 'appointments:arrive'
  // Пациенты
  | 'patients:view'
  | 'patients:create'
  | 'patients:update'
  | 'patients:blacklist'
  | 'patients:files:upload'
  | 'patients:files:view'
  // Направления
  | 'directions:view:all'
  | 'directions:view:own'
  | 'directions:create'
  | 'directions:update'
  // Оплата
  | 'payments:create'
  | 'payments:view:all'
  | 'payments:view:own'
  | 'payments:receipt'
  // Возвраты
  | 'refunds:create'
  | 'refunds:approve'
  | 'refunds:view:all'
  // Медкарточки
  | 'medical:view:all'
  | 'medical:view:own'
  | 'medical:create'
  | 'medical:update'
  | 'medical:vitals'
  | 'medical:templates'
  // Зарплата
  | 'salary:view:all'
  | 'salary:view:own'
  | 'salary:schemes:manage'
  | 'salary:close-period'
  // Аналитика
  | 'analytics:view:all'
  | 'analytics:view:own'
  // Справочники
  | 'departments:manage'
  | 'services:manage'
  // Пользователи
  | 'users:manage'
  // Уведомления
  | 'notifications:view'
  | 'notifications:send'
  // Аудит
  | 'audit:view';

/**
 * Права доступа для каждой роли
 */
const rolePermissions: Record<Role, Permission[]> = {
  OPERATOR: [
    'appointments:view:all',
    'appointments:create',
    'appointments:update',
    'appointments:delete',
    'patients:view',
    'patients:create',
    'patients:update',
    'patients:blacklist',
    'directions:view:all',
    'directions:create',
    'notifications:view',
  ],

  RECEPTIONIST: [
    'appointments:view:all',
    'appointments:arrive',
    'patients:view',
    'payments:create',
    'payments:view:all',
    'payments:receipt',
    'refunds:create',
    'notifications:view',
  ],

  ASSISTANT: [
    'appointments:view:own',
    'patients:view',
    'patients:files:upload',
    'patients:files:view',
    'medical:view:own',
    'medical:vitals',
    'notifications:view',
  ],

  DOCTOR: [
    'appointments:view:own',
    'appointments:create',
    'appointments:update',
    'patients:view',
    'patients:files:view',
    'directions:view:own',
    'directions:create',
    'payments:view:own',
    'medical:view:own',
    'medical:create',
    'medical:update',
    'medical:templates',
    'salary:view:own',
    'analytics:view:own',
    'notifications:view',
  ],

  OWNER: [
    'appointments:view:all',
    'appointments:create',
    'appointments:update',
    'appointments:delete',
    'appointments:arrive',
    'patients:view',
    'patients:create',
    'patients:update',
    'patients:blacklist',
    'patients:files:upload',
    'patients:files:view',
    'directions:view:all',
    'directions:create',
    'directions:update',
    'payments:create',
    'payments:view:all',
    'payments:receipt',
    'refunds:create',
    'refunds:approve',
    'refunds:view:all',
    'medical:view:all',
    'medical:create',
    'medical:update',
    'medical:vitals',
    'medical:templates',
    'salary:view:all',
    'salary:schemes:manage',
    'salary:close-period',
    'analytics:view:all',
    'departments:manage',
    'services:manage',
    'users:manage',
    'notifications:view',
    'notifications:send',
    'audit:view',
  ],
};

/**
 * Проверка наличия права у роли
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

/**
 * Проверка наличия хотя бы одного из прав
 */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Проверка наличия всех прав
 */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Получение всех прав роли
 */
export function getRolePermissions(role: Role): Permission[] {
  return rolePermissions[role] || [];
}

/**
 * Проверка доступа к ресурсу на основе владения
 * Например, доктор может видеть только своих пациентов
 */
export function canAccessResource(
  role: Role,
  resourceOwnerId: string,
  currentUserId: string,
  viewAllPermission: Permission,
  viewOwnPermission: Permission
): boolean {
  // Владелец может видеть всё
  if (hasPermission(role, viewAllPermission)) {
    return true;
  }

  // Может видеть только свои ресурсы
  if (hasPermission(role, viewOwnPermission)) {
    return resourceOwnerId === currentUserId;
  }

  return false;
}
