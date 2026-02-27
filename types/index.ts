// Enums
export enum Role {
  OWNER = 'OWNER',
  OPERATOR = 'OPERATOR',
  RECEPTIONIST = 'RECEPTIONIST',
  ASSISTANT = 'ASSISTANT',
  DOCTOR = 'DOCTOR',
}

export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  ARRIVED = 'ARRIVED',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  TRANSFERRED = 'TRANSFERRED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  KASPI = 'KASPI',
}

export enum Source {
  INSTAGRAM = 'INSTAGRAM',
  GIS = 'GIS',
  REFERRAL = 'REFERRAL',
  SITE = 'SITE',
  OTHER = 'OTHER',
}

export enum DirectionStatus {
  PENDING = 'PENDING',
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// User
export interface User {
  id: string;
  name: string;
  role: Role;
  phone: string;
  departmentId?: string;
  department?: Department;
  colorBadge?: string;
  isActive: boolean;
  createdAt: string;
}

// Department
export interface Department {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  _count?: {
    users: number;
    services: number;
  };
}

// Service
export interface Service {
  id: string;
  name: string;
  code: string;
  price: number;
  doctorPercentage: number;
  durationMin: number;
  departmentId: string;
  department?: Department;
  categoryId?: string;
  isActive: boolean;
}

// Patient
export interface Patient {
  id: string;
  fullName: string;
  phone: string;
  iin?: string;
  dateOfBirth?: string;
  source: Source;
  isBlacklisted: boolean;
  blacklistReason?: string;
  debt: number;
  createdAt: string;
  _count?: {
    appointments: number;
    payments: number;
  };
}

// Appointment
export interface Appointment {
  id: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  patientId: string;
  patient: Patient;
  doctorId: string;
  doctor: User;
  serviceId: string;
  service: Service;
  departmentId: string;
  department: Department;
  managerId?: string;
  manager?: User;
  prepayment: number;
  comment?: string;
  arrivedAt?: string;
  arrivedBy?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  transferredAt?: string;
  transferredBy?: string;
  createdAt: string;
}

// Payment
export interface Payment {
  id: string;
  amount: number;
  method: PaymentMethod;
  appointmentId?: string;
  appointment?: Appointment;
  patientId: string;
  patient: Patient;
  serviceId: string;
  service: Service;
  cashierId: string;
  cashier: User;
  receiptUrl?: string;
  createdAt: string;
}

// Direction
export interface Direction {
  id: string;
  patientId: string;
  patient: Patient;
  fromDoctorId: string;
  fromDoctor: User;
  toDoctorId: string;
  toDoctor: User;
  serviceId: string;
  service: Service;
  status: DirectionStatus;
  comment?: string;
  appointmentId?: string;
  createdAt: string;
}

// Medical Record
export interface MedicalRecord {
  id: string;
  appointmentId: string;
  appointment: Appointment;
  patientId: string;
  patient: Patient;
  doctorId: string;
  doctor: User;
  complaints?: string;
  vitals?: Record<string, any>;
  diagnosis?: string;
  icd10?: string;
  prescriptions?: string;
  recommendations?: string;
  nextVisit?: string;
  createdAt: string;
}

// Salary Accrual
export interface SalaryAccrual {
  id: string;
  doctorId: string;
  doctor: User;
  appointmentId: string;
  appointment: Appointment;
  patientId: string;
  patient: Patient;
  serviceId: string;
  service: Service;
  serviceAmount: number;
  percentage: number;
  amount: number;
  date: string;
  month: number;
  year: number;
}

// Notification
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

// Auth
export interface LoginRequest {
  phone: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Analytics
export interface DashboardAnalytics {
  today: {
    revenue: number;
    patients: number;
    appointments: number;
  };
  week: {
    revenue: number;
    patients: number;
    appointments: number;
  };
  month: {
    revenue: number;
    patients: number;
    appointments: number;
    conversionRate: number;
  };
  topDoctors: Array<{
    id: string;
    name: string;
    department: Department;
    revenue: number;
    patients: number;
  }>;
  topServices: Array<{
    id: string;
    name: string;
    price: number;
    count: number;
    revenue: number;
  }>;
}

// Permissions
export type Permission =
  | 'view:schedule'
  | 'create:appointment'
  | 'update:appointment'
  | 'update:own:appointment'
  | 'delete:appointment'
  | 'view:own:appointments'
  | 'view:patients'
  | 'create:patient'
  | 'update:patient'
  | 'blacklist:patient'
  | 'view:payments'
  | 'create:payment'
  | 'view:refunds'
  | 'approve:refund'
  | 'view:directions'
  | 'create:direction'
  | 'view:medical_records'
  | 'create:medical_record'
  | 'view:salary'
  | 'view:analytics'
  | 'manage:users'
  | 'manage:services'
  | 'view:audit_log';
