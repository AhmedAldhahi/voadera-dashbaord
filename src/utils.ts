import type { EmployeeData } from "./types";

export function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  let seconds = 0;
  const h = timeStr.match(/(\d+)h/);
  const m = timeStr.match(/(\d+)m/);
  const s = timeStr.match(/(\d+)s/);
  if (h) seconds += parseInt(h[1]) * 3600;
  if (m) seconds += parseInt(m[1]) * 60;
  if (s) seconds += parseInt(s[1]);
  return seconds;
}

export function formatSeconds(total: number): string {
  if (total <= 0) return "0h 0m 0s";
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  return `${h}h ${m}m ${s}s`;
}

export function isOfficeActiveToday(emp: { inOfficeToday?: boolean; officeCheckInTime?: string | null }): boolean {
  if (!emp.inOfficeToday) return false;
  if (!emp.officeCheckInTime) return false;
  const checkInDate = new Date(emp.officeCheckInTime);
  const today = new Date();
  return (
    checkInDate.getFullYear() === today.getFullYear() &&
    checkInDate.getMonth() === today.getMonth() &&
    checkInDate.getDate() === today.getDate()
  );
}

export function exportToCSV(employees: EmployeeData[], dateRange: string) {
  const headers = ["Name", "Department", "Logged In", "Active Time", "Idle Time", "Peak Break"];
  const rows = employees.map((emp) => [
    emp.name,
    emp.department,
    emp.totalTime,
    emp.activeTime,
    emp.idleTime,
    emp.longestIdle,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((c) => `"${c}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `voadera-${dateRange}-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportDailyReportToCSV(employeeName: string, dateRange: string, dailyData: any[]) {
  const headers = ["Date", "Total Session Time", "Active Time", "Idle Time", "Longest Break"];
  const rows = dailyData.map((day) => [
    day.date,
    day.totalTime,
    day.activeTime,
    day.idleTime,
    day.longestIdle,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((c) => `"${c}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  
  const safeName = employeeName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  a.download = `report-${safeName}-${dateRange}-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
