import { useMemo } from "react";
import {
  X,
  Globe,
  Video,
  Users,
  MessageSquare,
  Activity,
  TrendingUp,
  Clock,
  Play,
  Camera,
  Hash,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";

// ─── Data Contract ─────────────────────────────────────────────────────────
export interface WebLog {
  id: string;
  tsUsername: string;
  url: string;
  createdAt: string;
}

interface Props {
  employeeName: string;
  logs: WebLog[];
  dateRange: string;
  onClose: () => void;
}

// ─── Translation Layer ─────────────────────────────────────────────────────
interface TranslatedSite {
  name: string;
  icon: LucideIcon;
  color: string;      // Tailwind text color
  bgColor: string;    // Tailwind bg color for icon badge
  glowColor: string;  // CSS box-shadow glow color
  isRaw?: boolean;    // Flag for raw urls
}

function getFriendlyUrl(rawUrl: string): TranslatedSite | null {
  // 1. Decode and normalize
  let decoded = "";
  try {
    decoded = decodeURIComponent(rawUrl || "");
  } catch {
    decoded = rawUrl || "";
  }
  
  // 2. Clean Window Title / Domain first
  let cleanTitle = decoded;
  const suffixes = [
    " - Google Chrome",
    " - Microsoft Edge",
    " - Mozilla Firefox",
    " - Brave",
    " - Personal",
    " - Work",
  ];
  
  for (const s of suffixes) {
    if (cleanTitle.toLowerCase().endsWith(s.toLowerCase())) {
      cleanTitle = cleanTitle.substring(0, cleanTitle.length - s.length);
    }
  }

  // If it's a URL, extract domain for cleaner title
  if (cleanTitle.includes(".") && !cleanTitle.includes(" ")) {
    try {
      const url = new URL(cleanTitle.startsWith("http") ? cleanTitle : `https://${cleanTitle}`);
      const domainParts = url.hostname.split(".");
      if (domainParts.length >= 2) {
        const main = domainParts[domainParts.length - 2];
        cleanTitle = main.charAt(0).toUpperCase() + main.slice(1);
      }
    } catch {}
  }

  const lower = cleanTitle.toLowerCase();

  // 3. Hide Technical Noise
  if (
    lower === "localhost" ||
    lower.includes("127.0.0.1") ||
    lower.includes("visualstudio.com") ||
    lower.includes("events.data.microsoft.com") ||
    lower.includes("api.iris.microsoft.com") ||
    lower.includes("arc.msn.com") ||
    lower.includes("googleapis.com") ||
    lower.includes("googleusercontent.com") ||
    lower === "new tab"
  ) {
    return null;
  }

  // 4. Known App/Site Mappings
  if (lower.includes("youtube") || lower.includes("googlevideo") || lower.includes("youtu.be")) {
    return {
      name: cleanTitle,
      icon: Video,
      color: "text-red-500",
      bgColor: "bg-red-500/15",
      glowColor: "rgba(239,68,68,0.3)",
    };
  }

  if (lower.includes("netflix") || lower.includes("nflx")) {
    return {
      name: cleanTitle,
      icon: Play,
      color: "text-red-500",
      bgColor: "bg-red-500/15",
      glowColor: "rgba(239,68,68,0.3)",
    };
  }

  if (lower.includes("facebook") || lower.includes("messenger")) {
    return {
      name: cleanTitle,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/15",
      glowColor: "rgba(59,130,246,0.3)",
    };
  }

  if (lower.includes("instagram")) {
    return {
      name: cleanTitle,
      icon: Camera,
      color: "text-pink-500",
      bgColor: "bg-pink-500/15",
      glowColor: "rgba(236,72,153,0.3)",
    };
  }

  if (lower.includes("tiktok")) {
    return {
      name: cleanTitle,
      icon: Video,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/15",
      glowColor: "rgba(34,211,238,0.3)",
    };
  }

  if (lower.includes("twitter") || lower.includes("x.com") || lower.includes(" - x - ")) {
    return {
      name: cleanTitle,
      icon: Hash,
      color: "text-sky-400",
      bgColor: "bg-sky-500/15",
      glowColor: "rgba(56,189,248,0.3)",
    };
  }

  if (lower.includes("whatsapp")) {
    return {
      name: cleanTitle,
      icon: MessageCircle,
      color: "text-green-500",
      bgColor: "bg-green-500/15",
      glowColor: "rgba(34,197,94,0.3)",
    };
  }

  if (lower.includes("slack")) {
    return {
      name: cleanTitle,
      icon: MessageSquare,
      color: "text-purple-400",
      bgColor: "bg-purple-500/15",
      glowColor: "rgba(168,85,247,0.3)",
    };
  }

  if (lower.includes("google search") || lower.includes("google gemini") || (lower.includes("google") && lower.includes("search"))) {
    return {
      name: "Google Search / AI",
      icon: Globe,
      color: "text-blue-400",
      bgColor: "bg-blue-500/15",
      glowColor: "rgba(59,130,246,0.3)",
    };
  }

  // 5. Final fallback
  return {
    name: cleanTitle || "Active Window",
    icon: Activity,
    color: "text-slate-300",
    bgColor: "bg-white/10",
    glowColor: "rgba(255,255,255,0.1)",
  };
}

// ─── Time Helpers ──────────────────────────────────────────────────────────
function formatTime(dateStr: string): string {
  if (!dateStr) return "Unknown";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Unknown";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatHourLabel(dateStr: string): string {
  if (!dateStr) return "Unknown";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Unknown";
  d.setMinutes(0, 0, 0);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getHourKey(dateStr: string): string {
  if (!dateStr) return "unknown";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "unknown";
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function WebHistoryModal({ employeeName, logs, dateRange, onClose }: Props) {
  // 1. Sort raw logs chronologically
  const sortedRawLogs = useMemo(() => {
    const safeLogs = Array.isArray(logs) ? logs : [];
    return [...safeLogs].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
    });
  }, [logs]);

  // 2. Filter, Translate, and Group logs
  const groupedCleanLogs = useMemo(() => {
    const groups: {
      id: string;
      site: TranslatedSite;
      time: string;
      createdAt: string;
      timestampMs: number;
      pingCount: number;
    }[] = [];

    for (const log of sortedRawLogs) {
      const translated = getFriendlyUrl(log.url);
      if (!translated) continue; // Filtered out

      const timestampMs = new Date(log.createdAt).getTime() || 0;
      
      if (groups.length === 0) {
        groups.push({
          id: log.id,
          site: translated,
          time: formatTime(log.createdAt),
          createdAt: log.createdAt,
          timestampMs,
          pingCount: 1,
        });
        continue;
      }

      const lastGroup = groups[groups.length - 1];
      const timeDiffMins = (timestampMs - lastGroup.timestampMs) / (1000 * 60);

      // Visual Noise Gate: Group if same name and within 10 minutes
      if (translated.name === lastGroup.site.name && timeDiffMins <= 10 && timeDiffMins >= 0) {
        lastGroup.pingCount += 1;
        // Keep the latest time for the group
        lastGroup.time = formatTime(log.createdAt);
        lastGroup.createdAt = log.createdAt;
        lastGroup.timestampMs = timestampMs;
      } else {
        groups.push({
          id: log.id,
          site: translated,
          time: formatTime(log.createdAt),
          createdAt: log.createdAt,
          timestampMs,
          pingCount: 1,
        });
      }
    }
    return groups;
  }, [sortedRawLogs]);

  // 3. Final Display Items
  const displayItems = useMemo(() => {
    return [...groupedCleanLogs].reverse();
  }, [groupedCleanLogs]);

  // ── Insight Computations ──────────────────────────────────────────────
  const totalRequests = groupedCleanLogs.reduce((acc, g) => acc + g.pingCount, 0);

  const topCategory = useMemo(() => {
    if (groupedCleanLogs.length === 0) return "—";
    const freq: Record<string, number> = {};
    groupedCleanLogs.forEach((l) => {
      freq[l.site.name] = (freq[l.site.name] || 0) + l.pingCount;
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
  }, [groupedCleanLogs]);

  const firstActive = useMemo(() => {
    if (sortedRawLogs.length === 0) return "—";
    return formatTime(sortedRawLogs[0].createdAt);
  }, [sortedRawLogs]);

  // ── Group by Hour for the UI Timeline ────────────────────────────────
  const groupedByHour = useMemo(() => {
    const groups: {
      key: string;
      label: string;
      items: typeof displayItems;
    }[] = [];
    const map = new Map<string, typeof displayItems>();

    displayItems.forEach((item) => {
      const key = getHourKey(item.createdAt);
      if (!map.has(key)) {
        map.set(key, []);
        groups.push({
          key,
          label: formatHourLabel(item.createdAt),
          items: map.get(key)!,
        });
      }
      map.get(key)!.push(item);
    });

    return groups;
  }, [displayItems]);

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
          border: "1px solid rgba(148,163,184,0.15)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                boxShadow: "0 0 20px rgba(99,102,241,0.4)",
              }}
            >
              <Activity size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {employeeName}'s Web Activity
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                DNS query log • {dateRange.charAt(0).toUpperCase() + dateRange.slice(1)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors group"
            >
              <X size={18} className="text-slate-400 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>

        {/* ── Insight Cards ───────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 px-6 py-4 border-b border-white/10">
          <div
            className="rounded-xl p-4 transition-all hover:scale-[1.02]"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <Globe size={14} className="text-blue-400" />
              </div>
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Total Requests
              </span>
            </div>
            <p className="text-2xl font-extrabold text-white tabular-nums">
              {totalRequests.toLocaleString()}
            </p>
          </div>

          <div
            className="rounded-xl p-4 transition-all hover:scale-[1.02]"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <TrendingUp size={14} className="text-purple-400" />
              </div>
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Top Category
              </span>
            </div>
            <p className="text-2xl font-extrabold text-white truncate">
              {topCategory}
            </p>
          </div>

          <div
            className="rounded-xl p-4 transition-all hover:scale-[1.02]"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <Clock size={14} className="text-emerald-400" />
              </div>
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                First Active
              </span>
            </div>
            <p className="text-2xl font-extrabold text-white">
              {firstActive}
            </p>
          </div>
        </div>

        {/* ── Timeline ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
          {groupedByHour.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Globe size={40} className="mb-3 opacity-30" />
              <p className="text-sm font-semibold">
                No web activity recorded
              </p>
              <p className="text-xs mt-1 text-slate-600">
                DNS logs will appear here once activity is detected.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedByHour.map((group) => (
                <div key={group.key}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                      {group.label}
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                    <span className="text-[10px] text-slate-600 font-mono">
                      {group.items.length} {group.items.length === 1 ? "entry" : "entries"}
                    </span>
                  </div>

                  <div className="relative ml-2">
                    <div
                      className="absolute left-[15px] top-2 bottom-2 w-px"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(148,163,184,0.2) 0%, rgba(148,163,184,0.05) 100%)",
                      }}
                    />

                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.site.icon;
                        return (
                          <div
                            key={item.id}
                            className="relative flex items-center gap-4 py-2.5 px-3 -ml-1 rounded-xl transition-all duration-200 group/row cursor-default"
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.background =
                                "rgba(255,255,255,0.04)";
                              (e.currentTarget as HTMLElement).style.boxShadow =
                                `0 0 20px ${item.site.glowColor}`;
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.background =
                                "transparent";
                              (e.currentTarget as HTMLElement).style.boxShadow =
                                "none";
                            }}
                          >
                            <div
                              className={`relative z-10 w-8 h-8 rounded-lg ${item.site.bgColor} flex items-center justify-center shrink-0 transition-transform duration-200 group-hover/row:scale-110`}
                            >
                              <Icon size={16} className={item.site.color} />
                            </div>

                            <div className="flex-1 min-w-0">
                              <span className={`text-sm font-semibold truncate transition-colors flex items-center flex-wrap ${item.site.isRaw ? 'text-slate-400 font-mono text-xs' : 'text-slate-200 group-hover/row:text-white'}`}>
                                {item.site.name}
                                {!item.site.isRaw && item.pingCount > 1 && (
                                  <span className="ml-2 text-[10px] text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 whitespace-nowrap">
                                    {item.pingCount} pings
                                  </span>
                                )}
                              </span>
                            </div>

                            <span className="text-xs font-mono text-slate-500 shrink-0 tabular-nums group-hover/row:text-slate-300 transition-colors">
                              {item.time}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="px-6 py-3 border-t border-white/10 flex items-center justify-between">
          <p className="text-[11px] text-slate-600">
            Powered by Sysmon DNS Monitoring
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            Close
          </button>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.4);
        }
      `}</style>
    </div>
  );
}
