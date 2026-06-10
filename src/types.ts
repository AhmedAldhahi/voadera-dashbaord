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
}

export interface SessionData {
  id: string;
  employeeId: string;
  loginTime: string;
  logoutTime: string | null;
  lastSeen: string;
}
