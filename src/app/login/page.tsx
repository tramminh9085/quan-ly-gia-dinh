"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  LogIn,
  UserPlus,
  ShieldCheck,
  Sparkles,
  KeyRound,
  UserCheck,
} from "lucide-react";

interface MemberItem {
  id: number;
  username: string;
  fullName: string;
  roleLabel: string;
  avatarColor: string;
}

const AVATAR_COLORS = [
  { label: "Xanh Dương", value: "#2563EB" },
  { label: "Đỏ Hồng", value: "#E11D48" },
  { label: "Xanh Ngọc", value: "#10B981" },
  { label: "Cam Vàng", value: "#F59E0B" },
  { label: "Tím Đậm", value: "#7C3AED" },
  { label: "Xanh Cổ Vịt", value: "#0D9488" },
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [username, setUsername] = useState("bominh");
  const [password, setPassword] = useState("123456");
  const [fullName, setFullName] = useState("");
  const [roleLabel, setRoleLabel] = useState("Bố");
  const [avatarColor, setAvatarColor] = useState("#2563EB");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((data) => {
        if (data.members) setMembers(data.members);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "login"
            ? { action: "login", username, password }
            : {
                action: "register",
                username,
                password,
                fullName,
                roleLabel,
                avatarColor,
              }
        ),
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

  async function handleQuickLogin(m: MemberItem) {
    setUsername(m.username);
    setPassword("123456");
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          username: m.username,
          password: "123456",
        }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
        return;
      }
      setMode("login");
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

        {/* Chọn nhanh thành viên gia đình có sẵn */}
        {members.length > 0 && mode === "login" && (
          <div className="card-3d p-5 mb-6 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                Chạm để vào nhanh theo Thành viên (Mật khẩu mẫu: 123456)
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleQuickLogin(m)}
                  className="btn-3d flex-col py-3 px-2 bg-slate-50 hover:bg-blue-50 text-center"
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-lg border-2 border-slate-950 shadow-[0_2px_0_#0f172a]"
                    style={{ backgroundColor: m.avatarColor }}
                  >
                    {m.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="font-black text-slate-950 text-sm leading-tight mt-1">
                    {m.fullName}
                  </div>
                  <div className="text-xs font-bold text-slate-600">
                    {m.roleLabel}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Khối Form Đăng nhập / Tạo mới thành viên */}
        <div className="card-3d p-6 md:p-8 bg-white">
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`btn-3d py-3 text-base ${
                mode === "login"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-800"
              }`}
            >
              <LogIn className="w-5 h-5" />
              Đăng Nhập
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setUsername("");
                setPassword("");
                setError("");
              }}
              className={`btn-3d py-3 text-base ${
                mode === "register"
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-100 text-slate-800"
              }`}
            >
              <UserPlus className="w-5 h-5" />
              Tạo Thành Viên Mới
            </button>
          </div>

          {error && (
            <div className="card-3d-sm bg-rose-100 border-rose-900 p-3.5 mb-5 text-rose-950 font-extrabold text-sm flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <>
                <div>
                  <label className="block text-sm font-black text-slate-950 mb-1.5">
                    TÊN HIỂN THỊ TRONG GIA ĐÌNH *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Bố Minh, Mẹ Lan, Ông Nội, Bé An..."
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input-3d"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-black text-slate-950 mb-1.5">
                      VAI TRÒ TRONG NHÀ
                    </label>
                    <select
                      value={roleLabel}
                      onChange={(e) => setRoleLabel(e.target.value)}
                      className="input-3d"
                    >
                      <option value="Bố">Bố</option>
                      <option value="Mẹ">Mẹ</option>
                      <option value="Con">Con</option>
                      <option value="Ông / Bà">Ông / Bà</option>
                      <option value="Thành viên">Thành viên khác</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-black text-slate-950 mb-1.5">
                      MÀU ĐẠI DIỆN NỔI BẬT
                    </label>
                    <div className="flex items-center gap-2 pt-1">
                      {AVATAR_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setAvatarColor(c.value)}
                          className={`w-9 h-9 rounded-full border-2 border-slate-950 transition-transform ${
                            avatarColor === c.value
                              ? "scale-125 ring-2 ring-offset-2 ring-slate-950"
                              : "opacity-75"
                          }`}
                          style={{ backgroundColor: c.value }}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-black text-slate-950 mb-1.5">
                TÊN ĐĂNG NHẬP (VIẾT LIỀN KHÔNG DẤU) *
              </label>
              <input
                type="text"
                required
                placeholder="VD: bominh, melan, baoan..."
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
              {loading
                ? "Đang xử lý..."
                : mode === "login"
                ? "VÀO KHÔNG GIAN GIA ĐÌNH"
                : "TẠO TÀI KHOẢN & ĐĂNG NHẬP NGAY"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t-2 border-dashed border-slate-300 flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Đồng bộ Neon PostgreSQL & Android APK
            </span>
            <span>Tương phản cao • Dễ nhìn</span>
          </div>
        </div>
      </div>
    </div>
  );
}
