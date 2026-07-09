export interface EmployeeData {
  id: number;
  windowsId?: string;
  name: string;
  department: string;
  totalTime: string;
  activeTime: string;
  idleTime: string;
  longestIdle: string;
  isOnline?: boolean;
  idleLimit: number;
  forceLogoff: boolean;
  inOfficeToday?: boolean;
  officeCheckInTime?: string | null;
  officeCheckOutTime?: string | null;
  securityAlerts?: SecurityAlert[];
}

export interface SessionData {
  id: string;
  employeeId: string;
  loginTime: string;
  logoutTime: string | null;
  lastSeen: string;
}

export interface TimelineEvent {
  type: string; // "JIGGLER_START" or "GENUINE_RESUMED"
  at: string;   // e.g. "10:15"
}

export interface SecurityAlert {
  id: string;
  tsUsername: string;
  alertType: string;
  severity?: string | null;
  reason?: string | null;
  activeWindowAtFlag?: string | null;
  timestamp: string;
  durationSeconds?: number | null;
  totalJigglerMinutes?: number | null;
  totalGenuineMinutes?: number | null;
  timelineJson?: string | null;
}
