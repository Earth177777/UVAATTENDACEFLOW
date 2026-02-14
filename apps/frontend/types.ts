
export enum Role {
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  EMPLOYEE = 'EMPLOYEE',
}

export enum AttendanceMethod {
  LOCATION = 'LOCATION',
  WIFI = 'WIFI',
  QR = 'QR',
  MANUAL = 'MANUAL',
}

export enum Status {
  PRESENT = 'PRESENT',
  LATE = 'LATE',
  ABSENT = 'ABSENT',
  CHECKED_OUT = 'CHECKED_OUT',
}

export interface User {
  id: string;
  userId: string;
  name: string;
  role: Role;
  avatar: string;
  departments: string[];
  idCardFront?: string;
  idCardBack?: string;
  customSchedule?: Record<string, DaySchedule>;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  department: string; // Track which department this record belongs to
  date: string; // ISO Date string YYYY-MM-DD
  checkInTime: string | null; // ISO Date Time
  checkOutTime: string | null; // ISO Date Time
  status: Status;
  method: AttendanceMethod;
  notes?: string;
  location?: { lat: number; lng: number };
}

export interface OfficeLocation {
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
}

export interface TeamSettings {
  useCustomIPs: boolean;
  allowedIPs: string[];
  useCustomLocations: boolean;
  officeLocations: OfficeLocation[];
  useCustomQr: boolean;
  useCustomSchedule: boolean;
  schedule: Record<string, DaySchedule>;
}

export interface DaySchedule {
  enabled: boolean;
  startTime: string; // "09:00"
  endTime: string; // "17:00"
}

export interface AppSettings {
  schedule: Record<string, DaySchedule>; // Keys: "Monday", "Tuesday", etc.
  exceptions: Record<string, DaySchedule>; // Keys: "YYYY-MM-DD"
  requireLocation: boolean;
  requireWifi: boolean;
  requireQr: boolean;
  officeLocations: OfficeLocation[];
  allowedWifiSSID: string; // Simulated
  allowedIPs: string[];
  gracePeriodMinutes: number;
  qrExpirySeconds: number;
  qrGenerationConfig: {
    length: number;
    prefix: string;
    includeNumbers: boolean;
    includeLetters: boolean;
  };
  globalQrCode?: {
    code: string;
    timestamp: number;
    expiresIn: number;
  };
  teamQrCodes: Record<string, {
    code: string;
    timestamp: number;
    expiresIn: number;
  }>;
  dataRetentionDays: number;
  teamSettings: Record<string, TeamSettings>;
}

export interface QrCodeData {
  code: string;
  timestamp: number;
  expiresIn: number;
}
