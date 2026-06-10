import { useState } from "react";
import { Lock, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

interface Props {
  apiBase: string;
  onLogin: (token: string) => void;
}

export default function LoginScreen({ apiBase, onLogin }: Props) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError("Incorrect password. Please try again.");
        } else {
          setError(`Server error (${res.status}). Please try later.`);
        }
        setLoading(false);
        return;
      }

      const data = await res.json();
      onLogin(data.token);
    } catch {
      setError("Cannot connect to the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0f172a 100%)",
      }}
    >
      {/* Ambient glow */}
      <div
        className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)",
        }}
      />

      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.95) 100%)",
          border: "1px solid rgba(148,163,184,0.12)",
          boxShadow:
            "0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        {/* Top accent */}
        <div
          className="h-1"
          style={{
            background:
              "linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #3b82f6 100%)",
          }}
        />

        <div className="px-8 pt-10 pb-8">
          {/* Logo / Branding */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{
                background:
                  "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                boxShadow: "0 0 30px rgba(99,102,241,0.4)",
              }}
            >
              <ShieldCheck size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Voadera HR Analytics
            </h1>
            <p className="text-sm text-slate-400 mt-2">
              Enter your password to access the dashboard
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Enter admin password"
                  autoFocus
                  className="w-full pl-11 pr-12 py-3.5 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: error
                      ? "1px solid rgba(239,68,68,0.5)"
                      : "1px solid rgba(148,163,184,0.15)",
                  }}
                  onFocus={(e) => {
                    (e.target as HTMLInputElement).style.borderColor =
                      "rgba(99,102,241,0.5)";
                    (e.target as HTMLInputElement).style.boxShadow =
                      "0 0 20px rgba(99,102,241,0.15)";
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = error
                      ? "rgba(239,68,68,0.5)"
                      : "rgba(148,163,184,0.15)";
                    (e.target as HTMLInputElement).style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff size={16} className="text-slate-400" />
                  ) : (
                    <Eye size={16} className="text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#f87171",
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: loading
                  ? "rgba(99,102,241,0.4)"
                  : "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                boxShadow: loading
                  ? "none"
                  : "0 4px 20px rgba(99,102,241,0.3)",
              }}
              onMouseEnter={(e) => {
                if (!loading)
                  (e.target as HTMLButtonElement).style.boxShadow =
                    "0 6px 30px rgba(99,102,241,0.5)";
              }}
              onMouseLeave={(e) => {
                if (!loading)
                  (e.target as HTMLButtonElement).style.boxShadow =
                    "0 4px 20px rgba(99,102,241,0.3)";
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div
          className="px-8 py-4 text-center"
          style={{
            borderTop: "1px solid rgba(148,163,184,0.08)",
          }}
        >
          <p className="text-[11px] text-slate-600">
            Secured by Voadera Authentication System
          </p>
        </div>
      </div>
    </div>
  );
}
