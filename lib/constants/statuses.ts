/**
 * Константы статусов и их цветовая маркировка
 */

export const APPOINTMENT_STATUSES = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  ARRIVED: 'ARRIVED',
  DONE: 'DONE',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
  TRANSFERRED: 'TRANSFERRED',
} as const;

export type AppointmentStatus = typeof APPOINTMENT_STATUSES[keyof typeof APPOINTMENT_STATUSES];

/**
 * Цветовая маркировка статусов для расписания
 */
export const STATUS_COLORS = {
  [APPOINTMENT_STATUSES.PENDING]: {
    bg: 'bg-yellow-50',
    hover: 'hover:bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    label: 'Ожидание подтверждения',
    emoji: '🟡',
  },
  [APPOINTMENT_STATUSES.CONFIRMED]: {
    bg: 'bg-green-50',
    hover: 'hover:bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
    label: 'Подтверждено',
    emoji: '🟢',
  },
  [APPOINTMENT_STATUSES.ARRIVED]: {
    bg: 'bg-green-100',
    hover: 'hover:bg-green-200',
    text: 'text-green-900',
    border: 'border-green-300',
    label: 'Прибыл',
    emoji: '🟢',
  },
  [APPOINTMENT_STATUSES.DONE]: {
    bg: 'bg-green-50',
    hover: 'hover:bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
    label: 'Выполнено',
    emoji: '✅',
  },
  [APPOINTMENT_STATUSES.CANCELLED]: {
    bg: 'bg-red-50',
    hover: 'hover:bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
    label: 'Отменено',
    emoji: '🔴',
  },
  [APPOINTMENT_STATUSES.NO_SHOW]: {
    bg: 'bg-red-100',
    hover: 'hover:bg-red-200',
    text: 'text-red-900',
    border: 'border-red-300',
    label: 'Не пришёл',
    emoji: '🔴',
  },
  [APPOINTMENT_STATUSES.TRANSFERRED]: {
    bg: 'bg-blue-50',
    hover: 'hover:bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-200',
    label: 'Перенесено',
    emoji: '🔵',
  },
} as const;

/**
 * Статусы направлений
 */
export const DIRECTION_STATUSES = {
  CREATED: 'Создано',
  SCHEDULED: 'Записан',
  ARRIVED: 'Пришёл',
  DONE: 'Выполнено',
  CANCELLED: 'Отменено',
} as const;

/**
 * Статусы возвратов
 */
export const REFUND_STATUSES = {
  PENDING: 'Ожидает одобрения',
  APPROVED: 'Одобрено',
  REJECTED: 'Отклонено',
  COMPLETED: 'Выполнено',
} as const;

/**
 * Источники пациентов
 */
export const PATIENT_SOURCES = {
  INSTAGRAM: 'Instagram',
  GIS: '2ГИС',
  REFERRAL: 'Рекомендация',
  SITE: 'Сайт',
  OTHER: 'Другое',
} as const;
