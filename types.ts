
export enum UserRole {
  ADMIN = 'admin',
  STUDENT = 'student',
  COOK = 'cook',
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  tenantId: string;
  password?: string;
}

export interface Student extends User {
  role: UserRole.STUDENT;
  securityFee: number;
  arrears: number;
}

export interface Cook extends User {
  role: UserRole.COOK;
  includeInBilling: boolean;
}

export interface Admin extends User {
  role: UserRole.ADMIN;
  includeInBilling: boolean;
  isSuperAdmin?: boolean;
}

export type AnyUser = Student | Cook | Admin;

export enum MealType {
  BREAKFAST = 'Breakfast',
  DINNER = 'Dinner',
}

export interface Menu {
  date: string; // YYYY-MM-DD
  tenantId: string;
  [MealType.BREAKFAST]?: string;
  [MealType.DINNER]?: string;
}

export interface Attendance {
  userId: string;
  date: string; // YYYY-MM-DD
  meal: MealType;
  markedAt: string; // ISO string
  tenantId: string;
}

export interface CookTransaction {
  id: string;
  type: 'given' | 'returned' | 'adjustment';
  amount: number;
  reason?: string;
  timestamp: string; // ISO string
  adminId: string;
  tenantId: string;
}

export enum BillItemType {
    MEAL = 'meal',
    MISC = 'misc',
    ARREARS = 'arrears',
    SECURITY = 'security',
    PAYMENT = 'payment'
}

export interface BillItem {
    id: string;
    userId: string;
    type: BillItemType;
    description: string;
    amount: number; // positive for charges, negative for payments
    timestamp: string; // ISO string
    tenantId: string;
    relatedMeal?: {
        date: string;
        meal: MealType;
    }
}

export interface Notification {
  id: string;
  content: string;
  recipientIds: string[]; // 'all-students', 'cook', or list of user IDs
  senderId: string;
  timestamp: string; // ISO string
  readBy: string[];
  tenantId: string;
}

export enum HistoryType {
    USER_MANAGEMENT = 'User Management',
    MENU_MANAGEMENT = 'Menu Management',
    ATTENDANCE_MANAGEMENT = 'Attendance Management',
    FINANCIAL_ADMIN = 'Financial Admin',
    SYSTEM = 'System',
    TENANT_MANAGEMENT = 'Tenant Management',
}

export interface HistoryEntry {
  id: string;
  type: HistoryType;
  description: string;
  timestamp: string; // ISO string;
  actorId: string;
  tenantId: string | 'system'; // System-level history has no tenant
}

export interface MealTimeSettings {
  start: number; // Hour (0-23)
  end: number;   // Hour (0-23)
}

export interface AppSettings {
  mealTimes: {
    [MealType.BREAKFAST]: MealTimeSettings;
    [MealType.DINNER]: MealTimeSettings;
  };
}

export interface Tenant {
  id: string;
  name: string;
  ownerId: string;
  settings: AppSettings;
}

export interface RegistrationRequest {
    id: string;
    name: string;
    age: number;
    profession: string;
    contactNumber: string;
    username: string;
    password?: string;
    status: 'pending' | 'approved' | 'rejected';
    timestamp: string; // ISO string
}

export interface AppData {
  users: AnyUser[];
  menus: Menu[];
  attendance: Attendance[];
  cookTransactions: CookTransaction[];
  billItems: BillItem[];
  notifications: Notification[];
  history: HistoryEntry[];
  tenants: Tenant[];
  registrationRequests: RegistrationRequest[];
}
