"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  LogIn,
  ShieldCheck,
  Sparkles,
  KeyRound,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  Sun,
  Moon,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("family_theme_mode");
      if (saved === "light") {
        setTheme("light");
        document.documentElement.classList.remove("dark");
      } else {
        setTheme("dark");
        document.documentElement.classList.add("dark");
      }
    } catch {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    }
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    try {
      localStorage.setItem("family_theme_mode", nextTheme);
      if (nextTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          username,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Có lỗi xảy ra!");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Không thể kết nối máy chủ!");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 md:p-8 pt-[max(env(safe-area-inset-top,0px),36px)] pb-[max(env(safe-area-inset-bottom,0px),16px)]">
      <div className="w-full max-w-xl space-y-5">
        {/* Header Brand Card (Soft UI Evolution) */}
        <div className="card-3d bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 text-white p-6 md:p-7 flex items-center gap-4 border-blue-500/30 shadow-xl shadow-blue-900/10">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md text-white flex items-center justify-center border border-white/25 shadow-inner shrink-0">
            <Home className="w-8 h-8" aria-hidden="true" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-amber-200 text-xs font-bold tracking-wide mb-1.5 border border-white/15">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
              <span>Tổ Ấm Số • Family Hub</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Quản Lý Gia Đình
            </h1>
            <p className="text-xs md:text-sm font-medium text-blue-100 mt-1">
              Thu chi định kỳ • Lịch con • Ngày giỗ Âm/Dương • Tài khoản & Giấy tờ
            </p>
          </div>
        </div>

        {/* Form Đăng nhập Bảo mật */}
        <div className="card-3d p-6 md:p-8 bg-white relative">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={
              theme === "dark"
                ? "Chuyển sang giao diện Sáng"
                : "Chuyển sang giao diện Tối"
            }
            title={
              theme === "dark"
                ? "Chuyển sang Giao diện Sáng (Light Mode)"
                : "Chuyển sang Giao diện Tối (Dark Mode)"
            }
            className={`btn-3d absolute top-6 right-6 px-2.5 py-1 text-xs ${
              theme === "dark"
                ? "bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
            }`}
          >
            {theme === "dark" ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                <span className="font-bold">Sáng</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" />
                <span className="font-bold">Tối</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-3.5 pb-5 mb-5 border-b border-slate-200 pr-20">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shrink-0">
              <LogIn className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Đăng nhập Không gian Gia đình
              </h2>
              <p className="text-xs font-medium text-slate-600">
                Xác thực tài khoản thành viên đã được Quản trị viên cấp phép
              </p>
            </div>
          </div>

          <div className="card-3d-sm bg-amber-50/80 border-amber-200/80 p-4 mb-5 text-slate-800 text-xs font-medium flex items-start gap-3">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="leading-relaxed">
              <span className="font-bold text-slate-900">Chế độ bảo mật nội bộ:</span>{" "}
              Hệ thống không mở đăng ký tự do. Chỉ Quản trị viên mới có quyền cấp tài khoản cho thành viên trong nhà.
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="card-3d-sm bg-rose-50 border-rose-200 p-3.5 mb-5 text-rose-800 font-semibold text-sm flex items-center gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-username"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Tên đăng nhập (viết liền không dấu) *
              </label>
              <input
                id="login-username"
                type="text"
                required
                autoComplete="username"
                placeholder="Nhập tên đăng nhập..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-3d"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Mật khẩu *
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-3d pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  aria-pressed={showPassword}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-3d w-full py-3.5 text-base bg-blue-600 hover:bg-blue-700 text-white mt-2 shadow-md shadow-blue-600/20"
            >
              <KeyRound className="w-5 h-5" aria-hidden="true" />
              <span>
                {loading
                  ? "Đang xác thực..."
                  : "Đăng nhập vào Không gian Gia đình"}
              </span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-600">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <span>Bảo mật bởi Quản trị viên Gia đình</span>
            </span>
            <span>Soft UI • Tương phản chuẩn WCAG AAA</span>
          </div>
        </div>
      </div>
    </div>
  );
}
