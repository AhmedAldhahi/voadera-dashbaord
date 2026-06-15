import { useEffect, useState, useMemo, useCallback } from "react";
import { Search, Download, Calendar, Globe, Loader2, LogOut, Clock } from "lucide-react";
import type { EmployeeData, SessionData } from "./types";
import { exportToCSV, exportDailyReportToCSV } from "./utils";
import StatCards from "./components/StatCards";
import EditProfileModal from "./components/EditProfileModal";
import WebHistoryModal, { type WebLog } from "./components/WebHistoryModal";
import LoginScreen from "./components/LoginScreen";
import TimeLogModal from "./components/TimeLogModal";

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

  const handleSaveProfile = async (
    id: number,
    data: { name: string; dept: string; idleLimit: number; forceLogoff: boolean }
  ) => {
    const res = await authFetch(`${API_BASE}/employees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        name: data.name, 
        department: data.dept,
        idleLimit: data.idleLimit,
        forceLogoff: data.forceLogoff 
      }),
    });
    if (!res.ok) throw new Error("Failed to update");

    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === id
          ? { ...emp, name: data.name, department: data.dept, idleLimit: data.idleLimit, forceLogoff: data.forceLogoff }
          : emp
      )
    );
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
                  <th className="px-6 py-4 font-semibold">Dept.</th>
                  <th className="px-6 py-4 font-semibold">Logged In</th>
                  <th className="px-6 py-4 font-semibold text-green-700">
                    Active Time
                  </th>
                  <th className="px-6 py-4 font-semibold text-red-600">
                    Total Idle
                  </th>
                  <th className="px-6 py-4 font-semibold text-orange-600">
                    Peak Break
                  </th>
                  <th className="px-6 py-4 font-semibold text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredEmployees.length === 0 && !loading ? (
                  <tr>
                    <td
                      colSpan={7}
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
                  filteredEmployees.map((emp) => (
                    <tr
                      key={emp.id}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                          <span className="font-bold text-gray-800">
                            {emp.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium uppercase tracking-tighter">
                          {emp.department}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {emp.totalTime}
                      </td>
                      <td className="px-6 py-4 text-green-600 font-bold">
                        {emp.activeTime}
                      </td>
                      <td className="px-6 py-4 text-red-500 font-medium">
                        {emp.idleTime}
                      </td>
                      <td className="px-6 py-4 text-orange-600 font-medium">
                        {emp.longestIdle}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewWebLogs(emp)}
                            className="px-3 py-1 text-purple-600 hover:bg-purple-100 rounded-lg transition-all text-xs font-bold uppercase tracking-wider border border-transparent hover:border-purple-200 flex items-center gap-1.5 disabled:opacity-50"
                            title={emp.windowsId ? "View web activity logs" : "No Windows ID linked"}
                            disabled={!emp.windowsId || loadingWebLogsFor === emp.id}
                          >
                            {loadingWebLogsFor === emp.id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Globe size={13} />
                            )}
                            {loadingWebLogsFor === emp.id ? "Loading..." : "Web Logs"}
                          </button>
                          <button
                            onClick={() => handleViewTimeLog(emp)}
                            className="px-3 py-1 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all text-xs font-bold uppercase tracking-wider border border-transparent hover:border-emerald-200 flex items-center gap-1.5 disabled:opacity-50"
                            title="View login and logout times"
                            disabled={loadingTimeLogsFor === emp.id}
                          >
                            {loadingTimeLogsFor === emp.id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Clock size={13} />
                            )}
                            {loadingTimeLogsFor === emp.id ? "Loading..." : "Time Log"}
                          </button>
                          <button
                            onClick={() => handleDownloadEmployeeReport(emp)}
                            className="px-3 py-1 text-slate-600 hover:bg-slate-100 rounded-lg transition-all text-xs font-bold uppercase tracking-wider border border-transparent hover:border-slate-200 flex items-center gap-1.5 disabled:opacity-50"
                            title="Download daily CSV report"
                            disabled={loadingReportFor === emp.id}
                          >
                            {loadingReportFor === emp.id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Download size={13} />
                            )}
                            {loadingReportFor === emp.id ? "Loading..." : "Report"}
                          </button>
                          <button
                            onClick={() => setEditingEmployee(emp)}
                            className="px-3 py-1 text-blue-600 hover:bg-blue-100 rounded-lg transition-all text-xs font-bold uppercase tracking-wider border border-transparent hover:border-blue-200"
                          >
                            Edit Profile
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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
    </div>
  );
}
