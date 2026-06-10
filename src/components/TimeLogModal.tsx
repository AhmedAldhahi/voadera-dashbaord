import { X, Clock, ArrowRight, Activity, CalendarDays } from "lucide-react";
import type { SessionData } from "../types";

interface Props {
  employeeName: string;
  sessions: SessionData[];
  dateRange: string;
  onClose: () => void;
}

export default function TimeLogModal({ employeeName, sessions, dateRange, onClose }: Props) {
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Unknown";
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Unknown Date";
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  // Group sessions by day so if the user picked a date range, it looks organized.
  const groupedSessions = sessions.reduce((acc, session) => {
    const dateKey = new Date(session.loginTime).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(session);
    return acc;
  }, {} as Record<string, SessionData[]>);

  const dates = Object.keys(groupedSessions).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      <div
        className="relative w-full max-w-lg mx-4 max-h-[85vh] flex flex-col rounded-2xl overflow-hidden animate-[slideUp_0.3s_ease-out]"
        style={{
          background: "linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.92) 100%)",
          border: "1px solid rgba(148,163,184,0.15)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                boxShadow: "0 0 20px rgba(16,185,129,0.4)",
              }}
            >
              <Clock size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {employeeName}'s Time Log
              </h2>
              <p className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <CalendarDays size={12} />
                {dateRange.charAt(0).toUpperCase() + dateRange.slice(1)} • {sessions.length} Logins
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors group"
          >
            <X size={18} className="text-slate-400 group-hover:text-white transition-colors" />
          </button>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Clock size={40} className="mb-3 opacity-30" />
              <p className="text-sm font-semibold">No login activity recorded</p>
            </div>
          ) : (
            <div className="space-y-6">
              {dates.map((dateKey) => (
                <div key={dateKey}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                      {formatDateLabel(dateKey)}
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                    <span className="text-[10px] text-slate-600 font-mono">
                      {groupedSessions[dateKey].length} {groupedSessions[dateKey].length === 1 ? "entry" : "entries"}
                    </span>
                  </div>

                  <div className="relative ml-2 space-y-3">
                    <div
                      className="absolute left-[15px] top-2 bottom-2 w-px"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(148,163,184,0.2) 0%, rgba(148,163,184,0.05) 100%)",
                      }}
                    />

                    {groupedSessions[dateKey].map((session, index) => {
                      const isActive = !session.logoutTime;
                      
                      return (
                        <div
                          key={session.id || index}
                          className="relative flex items-center gap-4 p-3 -ml-1 rounded-xl transition-all duration-200 group/row cursor-default bg-white/5 border border-white/5 hover:bg-white/10"
                        >
                          <div
                            className={`relative z-10 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isActive ? "bg-green-500/20 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]" : "bg-slate-700/50 text-slate-400"
                            }`}
                          >
                            {isActive ? <Activity size={16} /> : <Clock size={16} />}
                          </div>

                          <div className="flex-1 min-w-0 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col">
                                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-0.5">Login</span>
                                <span className="text-sm font-bold text-white font-mono">
                                  {formatTime(session.loginTime)}
                                </span>
                              </div>
                              <ArrowRight size={14} className="text-slate-600 mx-2" />
                              <div className="flex flex-col">
                                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-0.5">Logout</span>
                                {isActive ? (
                                  <span className="text-sm font-bold text-green-400 animate-pulse">
                                    Active Now
                                  </span>
                                ) : (
                                  <span className="text-sm font-bold text-slate-300 font-mono">
                                    {formatTime(session.logoutTime!)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            Close
          </button>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.4); }
      `}</style>
    </div>
  );
}
