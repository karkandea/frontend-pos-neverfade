export type EmployeeSummary = {
  id: string;
  nama: string;
  jabatan: string;
  status: string;
  userId?: string | null;
  linkedUsername?: string | null;
  hasPin?: boolean;
  pinUpdatedAt?: string | null;
};

export type SharedEmployee = {
  id: string;
  nama: string;
  jabatan: string;
  role: "owner" | "admin" | "kasir" | null;
  canAccessPos: boolean;
};

export type SharedAttendanceState = {
  date: string;
  status:
    | "scheduled"
    | "present"
    | "late"
    | "absent"
    | "off"
    | "working"
    | "missing_checkout";
  checkIn: string | null;
  checkOut: string | null;
  scheduleStart: string | null;
  scheduleEnd: string | null;
  exceptionType: string | null;
  outsideSchedule: boolean;
  nextAction: "checkin" | "checkout" | null;
};

export type SharedPosUnlockResponse = {
  sessionToken: string;
  expiresAtUtc: string;
  employee: SharedEmployee;
  attendance: SharedAttendanceState;
  posToken: string | null;
  posExpiresAtUtc: string | null;
};

export type SharedPosSession = {
  expiresAtUtc: string;
  employee: SharedEmployee;
  attendance: SharedAttendanceState;
};

export type SharedAttendanceResult = {
  ok: boolean;
  recordedAt: string;
  attendance: SharedAttendanceState;
};

export type SharedPosDevice = {
  id: string;
  name: string;
  active: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};

export type RegisteredSharedPosDevice = {
  device: SharedPosDevice;
  deviceToken: string;
};

export type AttendancePolicy = {
  graceMinutes: number;
  absenceThresholdMinutes: number;
};

export type WeeklyScheduleDay = {
  dayOfWeek: number;
  isWorkingDay: boolean;
  startTime: string | null;
  endTime: string | null;
};

export type ScheduleException = {
  id: string;
  karyawanId: string;
  date: string;
  type: "leave" | "holiday" | "changed_shift" | "off";
  startTime: string | null;
  endTime: string | null;
  note: string | null;
};

export type AttendanceDashboardSummary = {
  scheduled: number;
  present: number;
  late: number;
  absent: number;
  working: number;
  missingCheckout: number;
};

export type AttendanceDashboardRow = {
  karyawanId: string;
  karyawanNama: string;
  jabatan: string;
  status: SharedAttendanceState["status"];
  scheduleStart: string | null;
  scheduleEnd: string | null;
  checkIn: string | null;
  checkOut: string | null;
  outsideSchedule: boolean;
  exceptionType: string | null;
  exceptionNote: string | null;
};

export type AttendanceDashboard = {
  date: string;
  summary: AttendanceDashboardSummary;
  employees: AttendanceDashboardRow[];
};

export type EmployeeSharedAccess = {
  karyawanId: string;
  userId: string | null;
  linkedUsername: string | null;
  hasPin: boolean;
  pinUpdatedAt: string | null;
};
