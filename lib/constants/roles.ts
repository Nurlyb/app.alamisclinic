/**
 * Константы ролей и их прав доступа
 */

export const ROLES = {
  OPERATOR: 'OPERATOR',
  RECEPTIONIST: 'RECEPTIONIST',
  ASSISTANT: 'ASSISTANT',
  DOCTOR: 'DOCTOR',
  OWNER: 'OWNER',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

/**
 * Права доступа по ролям
 */
export const PERMISSIONS = {
  // Расписание
  VIEW_ALL_SCHEDULE: [ROLES.OPERATOR, ROLES.RECEPTIONIST, ROLES.OWNER] as Role[],
  VIEW_OWN_SCHEDULE: [ROLES.DOCTOR] as Role[],
  CREATE_APPOINTMENT: [ROLES.OPERATOR, ROLES.OWNER] as Role[],
  UPDATE_APPOINTMENT: [ROLES.OPERATOR, ROLES.OWNER] as Role[],
  DELETE_APPOINTMENT: [ROLES.OPERATOR, ROLES.OWNER] as Role[],
  
  // Пациенты
  VIEW_PATIENTS: [ROLES.OPERATOR, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.OWNER] as Role[],
  CREATE_PATIENT: [ROLES.OPERATOR, ROLES.OWNER] as Role[],
  UPDATE_PATIENT: [ROLES.OPERATOR, ROLES.OWNER] as Role[],
  BLACKLIST_PATIENT: [ROLES.OPERATOR, ROLES.OWNER] as Role[],
  
  // Оплата
  CREATE_PAYMENT: [ROLES.RECEPTIONIST, ROLES.OWNER] as Role[],
  VIEW_PAYMENTS: [ROLES.RECEPTIONIST, ROLES.OWNER] as Role[],
  
  // Возвраты
  CREATE_REFUND: [ROLES.RECEPTIONIST, ROLES.OWNER] as Role[],
  APPROVE_REFUND: [ROLES.OWNER] as Role[],
  
  // Направления
  CREATE_DIRECTION: [ROLES.DOCTOR, ROLES.OWNER] as Role[],
  VIEW_DIRECTIONS: [ROLES.OPERATOR, ROLES.DOCTOR, ROLES.OWNER] as Role[],
  
  // Медицинские карточки
  VIEW_MEDICAL_RECORDS: [ROLES.DOCTOR, ROLES.OWNER] as Role[],
  CREATE_MEDICAL_RECORD: [ROLES.DOCTOR, ROLES.OWNER] as Role[],
  UPDATE_MEDICAL_RECORD: [ROLES.DOCTOR, ROLES.OWNER] as Role[],
  
  // Файлы
  UPLOAD_FILES: [ROLES.ASSISTANT, ROLES.DOCTOR, ROLES.OWNER] as Role[],
  VIEW_FILES: [ROLES.ASSISTANT, ROLES.DOCTOR, ROLES.OWNER] as Role[],
  
  // Зарплата
  VIEW_OWN_SALARY: [ROLES.DOCTOR] as Role[],
  VIEW_ALL_SALARY: [ROLES.OWNER] as Role[],
  MANAGE_SALARY_SCHEMES: [ROLES.OWNER] as Role[],
  CLOSE_SALARY_PERIOD: [ROLES.OWNER] as Role[],
  
  // Аналитика
  VIEW_OWN_ANALYTICS: [ROLES.DOCTOR] as Role[],
  VIEW_ALL_ANALYTICS: [ROLES.OWNER] as Role[],
  
  // Управление
  MANAGE_USERS: [ROLES.OWNER] as Role[],
  MANAGE_DEPARTMENTS: [ROLES.OWNER] as Role[],
  MANAGE_SERVICES: [ROLES.OWNER] as Role[],
  VIEW_AUDIT_LOG: [ROLES.OWNER] as Role[],
} as const;

/**
 * Проверка прав доступа
 */
export function hasPermission(role: Role, permission: keyof typeof PERMISSIONS): boolean {
  return PERMISSIONS[permission].includes(role);
}

/**
 * Описания ролей
 */
export const ROLE_DESCRIPTIONS = {
  [ROLES.OPERATOR]: 'Создаёт записи, управляет расписанием, работает с пациентами',
  [ROLES.RECEPTIONIST]: 'Принимает оплату, отмечает прибытие, генерирует чеки',
  [ROLES.ASSISTANT]: 'Заполняет vitals, загружает файлы пациентов',
  [ROLES.DOCTOR]: 'Ведёт приём, заполняет карточки, создаёт направления',
  [ROLES.OWNER]: 'Полный доступ ко всем функциям системы',
} as const;
