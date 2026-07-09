import { X, Shield, AlertTriangle, Clock, Activity, Monitor } from "lucide-react";
import type { SecurityAlert, TimelineEvent } from "../types";

interface Props {
  employeeName: string;
  alerts: SecurityAlert[];
  onClose: () => void;
}

const severityConfig: Record<string, { bg: string; border: string; text: string; glow: string; label: string }> = {
  HIGH: {
    bg: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
    border: "rgba(239,68,68,0.3)",
    text: "text-red-400",
    glow: "0 0 20px rgba(239,68,68,0.4)",
    label: "High Severity",
  },
  MEDIUM: {
    bg: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)",
    border: "rgba(249,115,22,0.3)",
    text: "text-orange-400",
    glow: "0 0 20px rgba(249,115,22,0.4)",
    label: "Medium Severity",
  },
  LOW: {
    bg: "linear-gradient(135deg, #ca8a04 0%, #a16207 100%)",
    border: "rgba(234,179,8,0.3)",
    text: "text-yellow-400",
    glow: "0 0 20px rgba(234,179,8,0.4)",
    label: "Low Severity",
  },
};

function getHighestSeverity(alerts: SecurityAlert[]): string {
  const order = ["HIGH", "MEDIUM", "LOW"];
  for (const level of order) {
    if (alerts.some((a) => (a.severity || "").toUpperCase() === level)) return level;
  }
  return "MEDIUM";
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function SecurityAlertModal({ employeeName, alerts, onClose }: Props) {
  const topSeverity = getHighestSeverity(alerts);
  const config = severityConfig[topSeverity] || severityConfig.MEDIUM;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      <div
        className="relative w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col rounded-2xl overflow-hidden animate-[slideUp_0.3s_ease-out]"
        style={{
          background: "linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.92) 100%)",
          border: `1px solid ${config.border}`,
          boxShadow: `0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05), ${config.glow}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Severity Banner */}
        <div
          className="px-6 py-4"
          style={{ background: config.bg }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Shield size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Security Alerts — {employeeName}
                </h2>
                <p className="text-xs text-white/70 font-semibold">
                  {alerts.length} alert{alerts.length !== 1 ? "s" : ""} • {config.label}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors group"
            >
              <X size={18} className="text-white/70 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>

        {/* Alert List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
          {alerts.map((alert) => {
            const sev = (alert.severity || "MEDIUM").toUpperCase();
            const sevCfg = severityConfig[sev] || severityConfig.MEDIUM;
            const isJigglerSummary = alert.alertType === "JIGGLER_DAY_SUMMARY";

            let timeline: TimelineEvent[] = [];
            if (alert.timelineJson) {
              try {
                timeline = JSON.parse(alert.timelineJson);
              } catch { /* ignore */ }
            }

            const jigglerMin = alert.totalJigglerMinutes ?? 0;
            const genuineMin = alert.totalGenuineMinutes ?? 0;
            const totalMin = jigglerMin + genuineMin;
            const jigglerPct = totalMin > 0 ? Math.round((jigglerMin / totalMin) * 100) : 0;

            return (
              <div
                key={alert.id}
                className="rounded-xl border border-white/10 bg-white/5 overflow-hidden"
              >
                {/* Alert Header */}
                <div className="px-5 py-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`mt-0.5 ${sevCfg.text}`}>
                      <AlertTriangle size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">
                          {alert.alertType.replace(/_/g, " ")}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            sev === "HIGH"
                              ? "bg-red-500/20 text-red-400 border border-red-500/30"
                              : sev === "MEDIUM"
                              ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                              : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                          }`}
                        >
                          {sev}
                        </span>
                      </div>

                      {alert.reason && (
                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                          {alert.reason}
                        </p>
                      )}

                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Clock size={11} />
                          {formatTimestamp(alert.timestamp)}
                        </span>
                        {alert.durationSeconds != null && (
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Activity size={11} />
                            {Math.floor(alert.durationSeconds / 60)}m {alert.durationSeconds % 60}s
                          </span>
                        )}
                        {alert.activeWindowAtFlag && (
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Monitor size={11} />
                            {alert.activeWindowAtFlag}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Jiggler Day Summary Breakdown */}
                {isJigglerSummary && totalMin > 0 && (
                  <div className="px-5 pb-4">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-red-400 font-bold mb-1">
                          Jiggler Time
                        </p>
                        <p className="text-xl font-extrabold text-red-400">
                          {jigglerMin}<span className="text-sm font-bold ml-0.5">min</span>
                        </p>
                        <p className="text-[10px] text-red-400/60 font-semibold mt-0.5">
                          {jigglerPct}% of tracked time
                        </p>
                      </div>
                      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold mb-1">
                          Genuine Time
                        </p>
                        <p className="text-xl font-extrabold text-emerald-400">
                          {genuineMin}<span className="text-sm font-bold ml-0.5">min</span>
                        </p>
                        <p className="text-[10px] text-emerald-400/60 font-semibold mt-0.5">
                          {100 - jigglerPct}% of tracked time
                        </p>
                      </div>
                    </div>

                    {/* Visual Bar */}
                    <div className="h-3 rounded-full overflow-hidden bg-slate-700/50 flex">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500"
                        style={{ width: `${jigglerPct}%` }}
                      />
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                        style={{ width: `${100 - jigglerPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[10px] text-red-400/70 font-semibold">Jiggler {jigglerPct}%</span>
                      <span className="text-[10px] text-emerald-400/70 font-semibold">Genuine {100 - jigglerPct}%</span>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                {timeline.length > 0 && (
                  <div className="px-5 pb-4">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3">
                      Activity Timeline
                    </p>
                    <div className="relative ml-3">
                      <div
                        className="absolute left-[7px] top-1 bottom-1 w-px"
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(148,163,184,0.25) 0%, rgba(148,163,184,0.05) 100%)",
                        }}
                      />
                      <div className="space-y-2">
                        {timeline.map((evt, i) => {
                          const isJiggler = evt.type === "JIGGLER_START";
                          return (
                            <div key={i} className="relative flex items-center gap-3 pl-1">
                              <div
                                className={`relative z-10 w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                                  isJiggler
                                    ? "bg-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                                    : "bg-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                                }`}
                              >
                                {isJiggler ? "🚨" : "✅"}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-slate-300">
                                  {evt.at}
                                </span>
                                <span
                                  className={`text-[11px] font-semibold ${
                                    isJiggler ? "text-red-400" : "text-emerald-400"
                                  }`}
                                >
                                  {isJiggler ? "Jiggler Detected" : "Genuine Activity Resumed"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
