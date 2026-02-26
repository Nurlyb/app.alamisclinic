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
  VIEW_ALL_SCHEDULE: [ROLES.OPERATOR, ROLES.RECEPTIONIST, ROLES.OWNER],
  VIEW_OWN_SCHEDULE: [ROLES.DOCTOR],
  CREATE_APPOINTMENT: [ROLES.OPERATOR, ROLES.OWNER],
  UPDATE_APPOINTMENT: [ROLES.OPERATOR, ROLES.OWNER],
  DELETE_APPOINTMENT: [ROLES.OPERATOR, ROLES.OWNER],
  
  // Пациенты
  VIEW_PATIENTS: [ROLES.OPERATOR, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.OWNER],
  CREATE_PATIENT: [ROLES.OPERATOR, ROLES.OWNER],
  UPDATE_PATIENT: [ROLES.OPERATOR, ROLES.OWNER],
  BLACKLIST_PATIENT: [ROLES.OPERATOR, ROLES.OWNER],
  
  // Оплата
  CREATE_PAYMENT: [ROLES.RECEPTIONIST, ROLES.OWNER],
  VIEW_PAYMENTS: [ROLES.RECEPTIONIST, ROLES.OWNER],
  
  // Возвраты
  CREATE_REFUND: [ROLES.RECEPTIONIST, ROLES.OWNER],
  APPROVE_REFUND: [ROLES.OWNER],
  
  // Направления
  CREATE_DIRECTION: [ROLES.DOCTOR, ROLES.OWNER],
  VIEW_DIRECTIONS: [ROLES.OPERATOR, ROLES.DOCTOR, ROLES.OWNER],
  
  // Медицинские карточки
  VIEW_MEDICAL_RECORDS: [ROLES.DOCTOR, ROLES.OWNER],
  CREATE_MEDICAL_RECORD: [ROLES.DOCTOR, ROLES.OWNER],
  UPDATE_MEDICAL_RECORD: [ROLES.DOCTOR, ROLES.OWNER],
  
  // Файлы
  UPLOAD_FILES: [ROLES.ASSISTANT, ROLES.DOCTOR, ROLES.OWNER],
  VIEW_FILES: [ROLES.ASSISTANT, ROLES.DOCTOR, ROLES.OWNER],
  
  // Зарплата
  VIEW_OWN_SALARY: [ROLES.DOCTOR],
  VIEW_ALL_SALARY: [ROLES.OWNER],
  MANAGE_SALARY_SCHEMES: [ROLES.OWNER],
  CLOSE_SALARY_PERIOD: [ROLES.OWNER],
  
  // Аналитика
  VIEW_OWN_ANALYTICS: [ROLES.DOCTOR],
  VIEW_ALL_ANALYTICS: [ROLES.OWNER],
  
  // Управление
  MANAGE_USERS: [ROLES.OWNER],
  MANAGE_DEPARTMENTS: [ROLES.OWNER],
  MANAGE_SERVICES: [ROLES.OWNER],
  VIEW_AUDIT_LOG: [ROLES.OWNER],
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
