import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quản Lý Gia Đình - Tổ Ấm Số",
  description:
    "Ứng dụng quản lý gia đình toàn diện: Thu chi định kỳ, Lịch học & đưa đón con, Lịch giỗ Âm/Dương, Tài khoản dùng chung & Giấy tờ cá nhân",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen antialiased selection:bg-yellow-300 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
