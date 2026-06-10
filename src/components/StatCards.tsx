import { Users, Activity, Clock, AlertTriangle } from "lucide-react";
import type { EmployeeData } from "../types";
import { parseTimeToSeconds, formatSeconds } from "../utils";

interface Props {
  employees: EmployeeData[];
}

export default function StatCards({ employees }: Props) {
  const total = employees.length;

  const avgActive =
    total > 0
      ? employees.reduce((s, e) => s + parseTimeToSeconds(e.activeTime), 0) / total
      : 0;

  const totalIdle = employees.reduce(
    (s, e) => s + parseTimeToSeconds(e.idleTime),
    0
  );

  const peakIdler = employees.reduce(
    (max, emp) => {
      const s = parseTimeToSeconds(emp.longestIdle);
      return s > max.seconds ? { name: emp.name, seconds: s } : max;
    },
    { name: "—", seconds: 0 }
  );

  const cards = [
    {
      label: "Total Staff",
      value: total.toString(),
      icon: Users,
      iconBg: "bg-blue-100",
      textColor: "text-blue-600",
    },
    {
      label: "Avg. Active",
      value: formatSeconds(avgActive),
      icon: Activity,
      iconBg: "bg-green-100",
      textColor: "text-green-600",
    },
    {
      label: "Total Idle",
      value: formatSeconds(totalIdle),
      icon: Clock,
      iconBg: "bg-red-100",
      textColor: "text-red-600",
    },
    {
      label: "Peak Idler",
      value: peakIdler.name,
      sub: peakIdler.seconds > 0 ? formatSeconds(peakIdler.seconds) : undefined,
      icon: AlertTriangle,
      iconBg: "bg-orange-100",
      textColor: "text-orange-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {c.label}
            </span>
            <div
              className={`w-8 h-8 ${c.iconBg} rounded-lg flex items-center justify-center`}
            >
              <c.icon size={16} className={c.textColor} />
            </div>
          </div>
          <p className={`text-2xl font-extrabold ${c.textColor} truncate`}>
            {c.value}
          </p>
          {c.sub && <p className="text-xs text-gray-400 mt-1">{c.sub}</p>}
        </div>
      ))}
    </div>
  );
}
