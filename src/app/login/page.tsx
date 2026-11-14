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
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen flex flex-col justify-center items-center p-4 md:p-8 bg-[#f4f6fb]">
      <div className="w-full max-w-xl">
        {/* Header Banner Nổi Khối */}
        <div className="card-3d bg-amber-300 p-6 mb-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-950 text-amber-300 flex items-center justify-center border-2 border-slate-950 shadow-[0_4px_0_#1e293b] shrink-0">
            <Home className="w-9 h-9" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-950 text-white text-xs font-extrabold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Tổ Ấm Số • Family Hub
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-950 leading-tight">
              QUẢN LÝ GIA ĐÌNH
            </h1>
            <p className="text-sm font-bold text-slate-800 mt-0.5">
              Thu chi định kỳ • Lịch con • Ngày giỗ Âm/Dương • Tài khoản & Giấy tờ
            </p>
          </div>
        </div>

        {/* Khối Form Đăng nhập Bảo mật */}
        <div className="card-3d p-6 md:p-8 bg-white">
          <div className="flex items-center gap-3 pb-4 mb-5 border-b-2 border-slate-950">
            <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center border-2 border-slate-950 shadow-[0_3px_0_#0f172a]">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-950 uppercase">
                ĐĂNG NHẬP HỆ THỐNG GIA ĐÌNH
              </h2>
              <p className="text-xs font-bold text-slate-600">
                Yêu cầu xác thực tài khoản thành viên đã được Admin cấp phép
              </p>
            </div>
          </div>

          <div className="card-3d-sm bg-amber-50 border-slate-950 p-3.5 mb-5 text-slate-900 text-xs font-bold flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-black text-slate-950">Chế độ bảo mật gia đình:</span>{" "}
              Hệ thống không cho phép tự đăng ký tài khoản bên ngoài. Chỉ Quản trị viên{" "}
              <span className="font-black underline">Admin (Bố Minh - bominh)</span> mới có quyền khởi tạo tài khoản cho các thành viên trong gia đình.
            </div>
          </div>

          {error && (
            <div className="card-3d-sm bg-rose-100 border-rose-900 p-3.5 mb-5 text-rose-950 font-extrabold text-sm flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-black text-slate-950 mb-1.5">
                TÊN ĐĂNG NHẬP (VIẾT LIỀN KHÔNG DẤU) *
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="Nhập tên đăng nhập (VD: bominh)..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-3d"
              />
            </div>

            <div>
              <label className="block text-sm font-black text-slate-950 mb-1.5">
                MẬT KHẨU *
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-3d"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-3d w-full py-4 text-lg bg-amber-400 hover:bg-amber-300 text-slate-950 mt-2"
            >
              <KeyRound className="w-5 h-5" />
              {loading ? "Đang xác thực..." : "ĐĂNG NHẬP VÀO KHÔNG GIAN GIA ĐÌNH"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t-2 border-dashed border-slate-300 flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Bảo mật bởi Quản trị viên Gia đình
            </span>
            <span>Tương phản cao • Dễ nhìn</span>
          </div>
        </div>
      </div>
    </div>
  );
}
