import { useState } from "react";
import { X, Save, User, Building2, Clock } from "lucide-react";
import type { EmployeeData } from "../types";

interface Props {
  employee: EmployeeData;
  onClose: () => void;
  onSave: (
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
  ) => Promise<void>;
}

export default function EditProfileModal({ employee, onClose, onSave }: Props) {
  const [name, setName] = useState(employee.name);
  const [dept, setDept] = useState(employee.department);
  const [idleLimit, setIdleLimit] = useState(employee.idleLimit);
  const [forceLogoff, setForceLogoff] = useState(employee.forceLogoff);
  const [inOfficeToday, setInOfficeToday] = useState<boolean>(!!employee.inOfficeToday);
  const [checkInTimeStr, setCheckInTimeStr] = useState<string>(() => {
    if (employee.officeCheckInTime) {
      const d = new Date(employee.officeCheckInTime);
      return d.toTimeString().slice(0, 5);
    }
    return new Date().toTimeString().slice(0, 5);
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    let officeCheckInTime: string | undefined = undefined;
    let officeCheckOutTime: string | undefined = undefined;

    if (inOfficeToday) {
      const [hours, minutes] = checkInTimeStr.split(":").map(Number);
      const d = new Date();
      d.setHours(hours || 0, minutes || 0, 0, 0);
      officeCheckInTime = d.toISOString();
    } else if (employee.inOfficeToday && !inOfficeToday) {
      // Early uncheck: record check-out time right now!
      officeCheckOutTime = new Date().toISOString();
    }

    await onSave(employee.id, {
      name,
      dept,
      idleLimit,
      forceLogoff,
      inOfficeToday,
      officeCheckInTime,
      officeCheckOutTime,
    });
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-[slideUp_0.25s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <User size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Edit Profile & Status</h2>
              <p className="text-xs text-gray-400 font-mono">
                {employee.windowsId || `ID #${employee.id}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-800"
              placeholder="Enter employee name..."
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Department
            </label>
            <input
              type="text"
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-800"
              placeholder="Enter department..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Idle Limit (Seconds)
            </label>
            <input
              type="number"
              value={idleLimit}
              onChange={(e) => setIdleLimit(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-800"
              placeholder="e.g. 900 for 15 mins"
            />
          </div>

          <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                  <Building2 size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-blue-900">At Office Today</p>
                  <p className="text-xs text-blue-600">Unlimited idle until 5:00 PM today</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={inOfficeToday}
                  onChange={(e) => setInOfficeToday(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {inOfficeToday && (
              <div className="pt-3 border-t border-blue-200/60 flex flex-col gap-2 animate-[fadeIn_0.2s_ease-out]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Clock size={13} className="text-blue-600" />
                    Check-In Time (Backdate):
                  </label>
                  <input
                    type="time"
                    value={checkInTimeStr}
                    onChange={(e) => setCheckInTimeStr(e.target.value)}
                    className="px-2.5 py-1 bg-white border border-blue-200 rounded-lg text-xs font-semibold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                </div>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  ⚡ Hours will be recorded automatically at 100% active from check-in until 5:00 PM. Unchecking early reverts immediately to normal tracking.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between bg-red-50 p-4 rounded-xl border border-red-100">
            <div>
              <p className="text-sm font-bold text-red-700">Remote Kill Session</p>
              <p className="text-xs text-red-500">Force immediate logoff on next heartbeat</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={forceLogoff}
                onChange={(e) => setForceLogoff(e.target.checked)}
              />
              <div className="w-11 h-6 bg-red-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
