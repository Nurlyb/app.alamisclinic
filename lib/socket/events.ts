/**
 * Типы событий Socket.io
 * Централизованное определение всех событий для type-safety
 */

// ============================================
// CLIENT → SERVER СОБЫТИЯ
// ============================================

export interface ClientToServerEvents {
  // Подписки
  'join:schedule': (doctorId: string) => void;
  'leave:schedule': (doctorId: string) => void;
  'join:department': (departmentId: string) => void;
  'leave:department': (departmentId: string) => void;

  // Пинг
  ping: () => void;
}

// ============================================
// SERVER → CLIENT СОБЫТИЯ
// ============================================

export interface ServerToClientEvents {
  // Расписание
  'appointment:created': (data: AppointmentEvent) => void;
  'appointment:updated': (data: AppointmentEvent) => void;
  'appointment:cancelled': (data: AppointmentEvent) => void;

  // Пациенты
  'patient:arrived': (data: PatientArrivedEvent) => void;

  // Направления
  'direction:created': (data: DirectionEvent) => void;
  'direction:updated': (data: DirectionEvent) => void;

  // Возвраты
  'refund:approval_needed': (data: RefundEvent) => void;
  'refund:status_changed': (data: RefundEvent) => void;

  // Уведомления
  'notification:new': (data: NotificationEvent) => void;

  // Ассистент
  'assistant:assigned': (data: AssistantAssignedEvent) => void;

  // Системные
  error: (data: { message: string }) => void;
  pong: () => void;
}

// ============================================
// ТИПЫ ДАННЫХ СОБЫТИЙ
// ============================================

export interface AppointmentEvent {
  id: string;
  patientId: string;
  doctorId: string;
  serviceId: string;
  departmentId: string;
  datetime: string;
  status: string;
  type: string;
  comment?: string;
  prepayment: number;
  finalPayment: number;
  patient?: {
    fullName: string;
    phone: string;
    blacklist: boolean;
  };
  doctor?: {
    name: string;
    colorBadge: string;
  };
  service?: {
    name: string;
    price: number;
  };
  manager?: {
    name: string;
    colorBadge: string;
  };
}

export interface PatientArrivedEvent {
  appointmentId: string;
  patientName: string;
  datetime: string;
}

export interface DirectionEvent {
  id: string;
  number: number;
  fromDoctorId?: string;
  toDoctorId: string;
  patientId: string;
  serviceId: string;
  urgency: string;
  status: string;
  comment?: string;
  fromDoctor?: {
    name: string;
  };
  toDoctor?: {
    name: string;
  };
  patient?: {
    fullName: string;
    phone: string;
  };
  service?: {
    name: string;
    price: number;
  };
}

export interface RefundEvent {
  id: string;
  paymentId: string;
  appointmentId: string;
  amount: number;
  type: string;
  reasonCategory: string;
  reasonText?: string;
  requestedBy: string;
  approvedBy?: string;
  status: string;
}

export interface NotificationEvent {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  createdAt: string;
}

export interface AssistantAssignedEvent {
  appointmentId: string;
  patientName: string;
  doctorName: string;
}
