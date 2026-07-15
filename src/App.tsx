import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Search, Download, Calendar, Globe, LogOut, Clock, MoreHorizontal, Shield, Building2, Loader2 } from "lucide-react";
import type { EmployeeData, SessionData } from "./types";
import { exportToCSV, exportDailyReportToCSV, parseTimeToSeconds } from "./utils";
import StatCards from "./components/StatCards";
import EditProfileModal from "./components/EditProfileModal";
import WebHistoryModal, { type WebLog } from "./components/WebHistoryModal";
import LoginScreen from "./components/LoginScreen";
import TimeLogModal from "./components/TimeLogModal";
import SecurityAlertModal from "./components/SecurityAlertModal";

const API_BASE = "https://voadera-analytics-api.onrender.com";

export default function App() {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("voadera_token")
  );
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingEmployee, setEditingEmployee] = useState<EmployeeData | null>(
    null
  );
  const [webLogEmployee, setWebLogEmployee] = useState<EmployeeData | null>(null);
  const [webLogs, setWebLogs] = useState<WebLog[]>([]);
  const [loadingWebLogsFor, setLoadingWebLogsFor] = useState<number | null>(null);
  
  const [timeLogEmployee, setTimeLogEmployee] = useState<EmployeeData | null>(null);
  const [timeLogs, setTimeLogs] = useState<SessionData[]>([]);
  const [loadingTimeLogsFor, setLoadingTimeLogsFor] = useState<number | null>(null);
  const [loadingReportFor, setLoadingReportFor] = useState<number | null>(null);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [alertEmployee, setAlertEmployee] = useState<EmployeeData | null>(null);
  const [togglingOfficeFor, setTogglingOfficeFor] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [dateRange, setDateRange] = useState("today");

  // ── Auth helpers ──────────────────────────────────────────────────────
  const handleLogin = useCallback((newToken: string) => {
    localStorage.setItem("voadera_token", newToken);
    setToken(newToken);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("voadera_token");
    setToken(null);
    setEmployees([]);
  }, []);

  /** Fetch wrapper that attaches the JWT token and auto-logs out on 401 */
  const authFetch = useCallback(
    async (url: string, options?: RequestInit) => {
      const res = await fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.status === 401) {
        handleLogout();
        throw new Error("Session expired");
      }
      return res;
    },
    [token, handleLogout]
  );


  const getDates = (range: string) => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    if (range === "yesterday") {
      start.setDate(start.getDate() - 1);
      end.setTime(start.getTime());
      end.setHours(23, 59, 59, 999);
    } else if (range === "week") {
      start.setDate(start.getDate() - 7);
    } else if (range !== "today") {
      if (range.includes("_to_")) {
        const [startStr, endStr] = range.split("_to_");
        const sParts = startStr.split("-").map(Number);
        const eParts = endStr.split("-").map(Number);
        if (sParts.length === 3 && !sParts.some(isNaN) && eParts.length === 3 && !eParts.some(isNaN)) {
          start.setFullYear(sParts[0], sParts[1] - 1, sParts[2]);
          start.setHours(0, 0, 0, 0);
          end.setFullYear(eParts[0], eParts[1] - 1, eParts[2]);
          end.setHours(23, 59, 59, 999);
        }
      } else {
        const parts = range.split("-").map(Number);
        if (parts.length === 3 && !parts.some(isNaN)) {
          start.setFullYear(parts[0], parts[1] - 1, parts[2]);
          start.setHours(0, 0, 0, 0);
          end.setTime(start.getTime());
          end.setHours(23, 59, 59, 999);
        }
      }
    }
    return { start: start.toISOString(), end: end.toISOString() };
  };

  const [error, setError] = useState<string | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenuId]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const { start, end } = getDates(dateRange);

    authFetch(`${API_BASE}/employees?start=${start}&end=${end}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setEmployees(data);
        } else {
          console.error("API returned non-array data:", data);
          setEmployees([]);
          setError("Server returned invalid data format.");
        }
        setLoading(false);
      })
      .catch((err) => {
        if (err.message === "Session expired") return;
        console.error("API Error:", err);
        setEmployees([]);
        setError("Failed to connect to the analytics server. It might be waking up—please try refreshing in 30 seconds.");
        setLoading(false);
      });
  }, [dateRange, authFetch]);

  const filteredEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return [];
    return employees.filter(
      (emp) =>
        (emp.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.department || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [employees, searchQuery]);

  // Quick inline toggle for At Office — no modal needed
  const handleToggleOffice = async (emp: EmployeeData, checkInTimeStr?: string) => {
    const newValue = !emp.inOfficeToday;
    setTogglingOfficeFor(emp.id);
    try {
      const payload: any = { inOfficeToday: newValue };
      if (newValue) {
        if (checkInTimeStr) {
          const [hours, minutes] = checkInTimeStr.split(":").map(Number);
          const d = new Date();
          d.setHours(hours || 0, minutes || 0, 0, 0);
          payload.officeCheckInTime = d.toISOString();
        } else {
          payload.officeCheckInTime = new Date().toISOString();
        }
      } else {
        payload.officeCheckOutTime = new Date().toISOString();
      }
      const res = await authFetch(`${API_BASE}/employees/${emp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to toggle office status");
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === emp.id
            ? {
                ...e,
                inOfficeToday: newValue,
                officeCheckInTime: newValue ? payload.officeCheckInTime : e.officeCheckInTime,
                officeCheckOutTime: newValue ? null : payload.officeCheckOutTime,
              }
            : e
        )
      );
    } catch (err) {
      console.error("Failed to toggle office:", err);
    } finally {
      setTogglingOfficeFor(null);
    }
  };

  // Update check-in time for an already-active office session
  const handleUpdateOfficeTime = async (emp: EmployeeData, timeStr: string) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const d = new Date();
    d.setHours(hours || 0, minutes || 0, 0, 0);
    const checkInTime = d.toISOString();
    try {
      const res = await authFetch(`${API_BASE}/employees/${emp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inOfficeToday: true, officeCheckInTime: checkInTime }),
      });
      if (!res.ok) throw new Error("Failed to update office time");
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === emp.id ? { ...e, officeCheckInTime: checkInTime } : e
        )
      );
    } catch (err) {
      console.error("Failed to update office time:", err);
    }
  };

  const handleSaveProfile = async (
    id: number,
    data: {
      name: string;
      dept: string;
      idleLimit: number;
      forceLogoff: boolean;
      inOfficeToday: boolean;
      officeCheckInTime?: string;
      officeCheckOutTime?: string;
    }
  ) => {
    const res = await authFetch(`${API_BASE}/employees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        name: data.name, 
        department: data.dept,
        idleLimit: data.idleLimit,
        forceLogoff: data.forceLogoff,
        inOfficeToday: data.inOfficeToday,
        officeCheckInTime: data.officeCheckInTime,
        officeCheckOutTime: data.officeCheckOutTime,
      }),
    });
    if (!res.ok) throw new Error("Failed to update");

    // Optimistically update local employee state immediately
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === id
          ? {
              ...emp,
              name: data.name,
              department: data.dept,
              idleLimit: data.idleLimit,
              forceLogoff: data.forceLogoff,
              inOfficeToday: data.inOfficeToday,
              officeCheckInTime: data.officeCheckInTime ?? emp.officeCheckInTime,
              officeCheckOutTime: data.officeCheckOutTime ?? emp.officeCheckOutTime,
            }
          : emp
      )
    );

    // Re-fetch employees so the updated active hours and office status are accurately calculated
    const { start, end } = getDates(dateRange);
    try {
      const refreshRes = await authFetch(`${API_BASE}/employees?start=${start}&end=${end}`);
      if (refreshRes.ok) {
        const refreshedData = await refreshRes.json();
        if (Array.isArray(refreshedData)) setEmployees(refreshedData);
      }
    } catch (err) {
      console.error("Failed to refresh employee list:", err);
    }

    setEditingEmployee(null);
  };

  const handleViewWebLogs = async (emp: EmployeeData) => {
    if (!emp.windowsId) return;
    setLoadingWebLogsFor(emp.id);
    try {
      const { start, end } = getDates(dateRange);
      const res = await authFetch(
        `${API_BASE}/weblogs/${encodeURIComponent(emp.windowsId)}?start=${start}&end=${end}`
      );
      if (!res.ok) throw new Error("Failed to fetch logs");
      const result = await res.json();
      if (result.status === "Success") {
        setWebLogs(result.data);
        setWebLogEmployee(emp);
      } else {
        setWebLogs([]);
      }
    } catch (err) {
      console.error("Failed to fetch web logs:", err);
      setWebLogs([]);
    } finally {
      setLoadingWebLogsFor(null);
    }
  };

  const handleViewTimeLog = async (emp: EmployeeData) => {
    setLoadingTimeLogsFor(emp.id);
    try {
      const { start, end } = getDates(dateRange);
      const res = await authFetch(`${API_BASE}/employees/${emp.id}/sessions?start=${start}&end=${end}`);
      if (!res.ok) throw new Error("Failed to fetch sessions");
      const result = await res.json();
      if (result.status === "Success") {
        setTimeLogs(result.data);
        setTimeLogEmployee(emp);
      } else {
        setTimeLogs([]);
      }
    } catch (err) {
      console.error("Failed to fetch time logs:", err);
      setTimeLogs([]);
    } finally {
      setLoadingTimeLogsFor(null);
    }
  };

  const handleDownloadEmployeeReport = async (emp: EmployeeData) => {
    setLoadingReportFor(emp.id);
    try {
      const { start, end } = getDates(dateRange);
      const res = await authFetch(`${API_BASE}/employees/${emp.id}/daily-report?start=${start}&end=${end}`);
      if (!res.ok) throw new Error("Failed to fetch daily report");
      const result = await res.json();
      if (result.status === "Success") {
        exportDailyReportToCSV(emp.name, dateRange, result.data);
      }
    } catch (err) {
      console.error("Failed to download employee report:", err);
      alert("Failed to generate report. Please try again.");
    } finally {
      setLoadingReportFor(null);
    }
  };

  if (!token) {
    return <LoginScreen apiBase={API_BASE} onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
              Voadera HR Analytics
            </h1>
            <p className="text-gray-500 mt-2 flex items-center gap-2">
              <Calendar size={14} />
              Monitoring:{" "}
              <span className="font-semibold text-gray-700">
                {dateRange.charAt(0).toUpperCase() + dateRange.slice(1)}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all shadow-sm"
              title="Sign out"
            >
              <LogOut size={16} />
              Logout
            </button>

            {/* CSV Export */}
            <button
              onClick={() => exportToCSV(filteredEmployees, dateRange)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
              title="Export to CSV"
            >
              <Download size={16} />
              Export CSV
            </button>

            {/* Date Selector */}
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200 items-center">
              {["today", "yesterday", "week"].map((r) => (
                <button
                  key={r}
                  onClick={() => setDateRange(r)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    dateRange === r
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}

              <div className="h-6 w-px bg-gray-200 mx-2" />
              
              <div className="flex items-center">
                <input
                  type="date"
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    if (dateRange.includes("_to_")) {
                      setDateRange(`${val}_to_${dateRange.split("_to_")[1]}`);
                    } else {
                      setDateRange(`${val}_to_${val}`);
                    }
                  }}
                  className={`px-2 py-1.5 rounded-lg text-sm font-semibold transition-all outline-none border cursor-pointer ${
                    (dateRange.includes("_to_") || (!["today", "yesterday", "week"].includes(dateRange)))
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "border-transparent text-gray-500 hover:bg-gray-50 bg-transparent"
                  }`}
                  title="Start Date"
                  value={
                    dateRange.includes("_to_") 
                      ? dateRange.split("_to_")[0]
                      : (!["today", "yesterday", "week"].includes(dateRange) ? dateRange : "")
                  }
                />
                
                <span className="text-gray-400 mx-1 font-bold">→</span>

                <input
                  type="date"
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    if (dateRange.includes("_to_")) {
                      setDateRange(`${dateRange.split("_to_")[0]}_to_${val}`);
                    } else if (!["today", "yesterday", "week"].includes(dateRange)) {
                      setDateRange(`${dateRange}_to_${val}`);
                    } else {
                      setDateRange(`${val}_to_${val}`);
                    }
                  }}
                  className={`px-2 py-1.5 rounded-lg text-sm font-semibold transition-all outline-none border cursor-pointer ${
                    dateRange.includes("_to_") && dateRange.split("_to_")[0] !== dateRange.split("_to_")[1]
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "border-transparent text-gray-500 hover:bg-gray-50 bg-transparent"
                  }`}
                  title="End Date"
                  value={
                    dateRange.includes("_to_") 
                      ? dateRange.split("_to_")[1]
                      : (!["today", "yesterday", "week"].includes(dateRange) ? dateRange : "")
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <StatCards employees={employees} />

        {/* Table Container */}
        <div
          className={`bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 ${
            loading ? "opacity-50 pointer-events-none" : "opacity-100"
          }`}
        >
          {/* Loading Bar */}
          {loading && (
            <div className="h-1 w-full bg-blue-100 overflow-hidden">
              <div className="h-full bg-blue-600 animate-[loading_1.5s_infinite_linear] w-1/3" />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-6 bg-red-50 border-b border-red-100 flex items-center gap-3 text-red-600">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}

          {/* Search + Count */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-4">
            <div className="relative max-w-md flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search by name or department..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <span className="text-sm text-gray-400 hidden sm:block whitespace-nowrap">
              {filteredEmployees.length} of {employees.length} employees
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-widest border-b border-gray-100">
                  <th className="px-6 py-4 font-semibold">Employee</th>
                  <th className="px-6 py-4 font-semibold">Activity</th>
                  <th className="px-6 py-4 font-semibold text-right w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredEmployees.length === 0 && !loading ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-16 text-center text-gray-400"
                    >
                      <p className="text-lg font-semibold">No data found</p>
                      <p className="text-sm mt-1">
                        {searchQuery
                          ? "Try a different search term"
                          : "No employee activity for this period"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    const activeSeconds = parseTimeToSeconds(emp.activeTime);
                    const totalSeconds = parseTimeToSeconds(emp.totalTime);
                    const activePct = totalSeconds > 0 ? Math.round((activeSeconds / totalSeconds) * 100) : 0;
                    const hasAlerts = (emp.securityAlerts?.length ?? 0) > 0;
                    // Check if the check-in is actually from today (fixes stale badge persisting to next day)
                    const isOfficeActiveForRange = (() => {
                      if (!emp.inOfficeToday) return false;
                      if (!emp.officeCheckInTime) return false;
                      const checkInDate = new Date(emp.officeCheckInTime);
                      const today = new Date();
                      return (
                        checkInDate.getFullYear() === today.getFullYear() &&
                        checkInDate.getMonth() === today.getMonth() &&
                        checkInDate.getDate() === today.getDate()
                      );
                    })();

                    // Determine highest severity for badge
                    let highestSeverity = "LOW";
                    if (hasAlerts) {
                      const sevOrder = ["HIGH", "MEDIUM", "LOW"];
                      for (const lvl of sevOrder) {
                        if (emp.securityAlerts!.some(a => (a.severity || "").toUpperCase() === lvl)) {
                          highestSeverity = lvl;
                          break;
                        }
                      }
                    }

                    const severityBadgeClasses: Record<string, string> = {
                      HIGH: "bg-red-100 text-red-700 border-red-200 hover:bg-red-200",
                      MEDIUM: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200",
                      LOW: "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200",
                    };

                    return (
                      <tr
                        key={emp.id}
                        className="hover:bg-blue-50/30 transition-colors group"
                      >
                        {/* Column 1 — Employee */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                emp.isOnline !== false
                                  ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"
                                  : "bg-gray-300"
                              }`}
                            />
                            <span className="font-bold text-gray-800">
                              {emp.name}
                            </span>
                            {isOfficeActiveForRange && (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 animate-[fadeIn_0.2s_ease-out]"
                                title={`Check-in: ${emp.officeCheckInTime ? new Date(emp.officeCheckInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Today'}`}
                              >
                                <Building2 size={13} className="text-blue-100 animate-pulse" />
                                <span>At Office</span>
                              </span>
                            )}
                            {hasAlerts && (
                              <button
                                onClick={() => setAlertEmployee(emp)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border transition-colors cursor-pointer ${severityBadgeClasses[highestSeverity]}`}
                              >
                                <Shield size={10} />
                                Flagged: {highestSeverity}
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md text-[11px] font-medium uppercase tracking-tighter">
                              {emp.department}
                            </span>

                            {/* Inline At Office Toggle */}
                            <div className="flex items-center gap-1.5 ml-1">
                              <label
                                className={`relative inline-flex items-center cursor-pointer ${
                                  togglingOfficeFor === emp.id ? 'opacity-50 pointer-events-none' : ''
                                }`}
                                title={isOfficeActiveForRange ? 'Uncheck to end office mode' : 'Mark as At Office'}
                              >
                                <input
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={isOfficeActiveForRange}
                                  onChange={() => handleToggleOffice(emp)}
                                />
                                <div className="w-8 h-[18px] bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-[14px] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-[14px] after:w-[14px] after:transition-all after:shadow-sm transition-colors" />
                              </label>
                              {togglingOfficeFor === emp.id ? (
                                <Loader2 size={11} className="animate-spin text-blue-500" />
                              ) : (
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                  isOfficeActiveForRange ? 'text-blue-600' : 'text-gray-400'
                                }`}>
                                  {isOfficeActiveForRange ? 'In Office' : 'Office'}
                                </span>
                              )}
                              {isOfficeActiveForRange && (
                                <input
                                  type="time"
                                  className="px-1.5 py-0.5 bg-blue-50 border border-blue-200 rounded-md text-[11px] font-semibold text-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-400 w-[80px] cursor-pointer"
                                  title="Change check-in time"
                                  value={
                                    emp.officeCheckInTime
                                      ? new Date(emp.officeCheckInTime).toTimeString().slice(0, 5)
                                      : new Date().toTimeString().slice(0, 5)
                                  }
                                  onChange={(e) => {
                                    if (e.target.value) handleUpdateOfficeTime(emp, e.target.value);
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Column 2 — Activity */}
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-700">
                            <span className="font-semibold text-green-600">{emp.activeTime}</span>
                            <span className="text-gray-400 mx-1">active ·</span>
                            <span className="font-medium text-red-500">{emp.idleTime}</span>
                            <span className="text-gray-400 mx-1">idle ·</span>
                            <span className="font-medium text-orange-500">{emp.longestIdle}</span>
                            <span className="text-gray-400 ml-1">peak</span>
                          </p>
                          <div className="mt-2 h-1.5 w-full max-w-xs rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${activePct}%`,
                                background: isOfficeActiveForRange
                                  ? "linear-gradient(90deg, #3b82f6, #4f46e5)"
                                  : activePct > 60
                                  ? "linear-gradient(90deg, #22c55e, #16a34a)"
                                  : activePct > 30
                                  ? "linear-gradient(90deg, #eab308, #f59e0b)"
                                  : "linear-gradient(90deg, #ef4444, #dc2626)",
                              }}
                            />
                          </div>
                          <p className="text-[11px] text-gray-400 mt-1">
                            Logged in: {emp.totalTime} {isOfficeActiveForRange && <span className="text-blue-600 font-semibold ml-1">· In-Office Mode Active</span>}
                          </p>
                        </td>

                        {/* Column 3 — Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="relative inline-block" ref={openMenuId === String(emp.id) ? menuRef : undefined}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === String(emp.id) ? null : String(emp.id));
                              }}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-all text-gray-400 hover:text-gray-700"
                              title="Actions"
                            >
                              <MoreHorizontal size={18} />
                            </button>

                            {openMenuId === String(emp.id) && (
                              <div
                                className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-50 animate-[scaleIn_0.15s_ease-out]"
                                style={{ transformOrigin: "top right" }}
                              >
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    handleViewWebLogs(emp);
                                  }}
                                  disabled={!emp.windowsId || loadingWebLogsFor === emp.id}
                                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <Globe size={15} className="text-purple-500" />
                                  {loadingWebLogsFor === emp.id ? "Loading..." : "View Web Logs"}
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    handleViewTimeLog(emp);
                                  }}
                                  disabled={loadingTimeLogsFor === emp.id}
                                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <Clock size={15} className="text-emerald-500" />
                                  {loadingTimeLogsFor === emp.id ? "Loading..." : "View Time Log"}
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    handleDownloadEmployeeReport(emp);
                                  }}
                                  disabled={loadingReportFor === emp.id}
                                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <Download size={15} className="text-slate-500" />
                                  {loadingReportFor === emp.id ? "Loading..." : "Download Report"}
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setEditingEmployee(emp);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  <span className="text-[15px] w-[15px] text-center leading-none">✏️</span>
                                  Edit Profile
                                </button>
                                {hasAlerts && (
                                  <>
                                    <div className="my-1 border-t border-gray-100" />
                                    <button
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        setAlertEmployee(emp);
                                      }}
                                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-semibold"
                                    >
                                      <Shield size={15} className="text-red-500" />
                                      View Security Alerts
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editingEmployee && (
        <EditProfileModal
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onSave={handleSaveProfile}
        />
      )}

      {/* Web History Modal */}
      {webLogEmployee && (
        <WebHistoryModal
          employeeName={webLogEmployee.name}
          logs={webLogs}
          dateRange={dateRange}
          onClose={() => {
            setWebLogEmployee(null);
            setWebLogs([]);
          }}
        />
      )}

      {/* Time Log Modal */}
      {timeLogEmployee && (
        <TimeLogModal
          employeeName={timeLogEmployee.name}
          sessions={timeLogs}
          dateRange={dateRange}
          onClose={() => {
            setTimeLogEmployee(null);
            setTimeLogs([]);
          }}
        />
      )}

      {/* Security Alert Modal */}
      {alertEmployee && alertEmployee.securityAlerts && (
        <SecurityAlertModal
          employeeName={alertEmployee.name}
          alerts={alertEmployee.securityAlerts}
          onClose={() => setAlertEmployee(null)}
        />
      )}
    </div>
  );
}
