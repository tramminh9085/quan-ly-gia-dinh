import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-be-vietnam",
});

export const metadata: Metadata = {
  title: "Quản Lý Gia Đình - Tổ Ấm Số",
  description:
    "Ứng dụng quản lý gia đình toàn diện: Thu chi định kỳ, Lịch học & đưa đón con, Lịch giỗ Âm/Dương, Tài khoản dùng chung & Giấy tờ cá nhân",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFFFFF",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} dark`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                // Nhận diện Android / Capacitor ngay lập tức để chèn Safe-Area Status Bar
                if (/Android/i.test(navigator.userAgent) || Boolean(window.Capacitor)) {
                  document.documentElement.classList.add('is-android');
                }
                const savedTheme = localStorage.getItem('family_theme_mode');
                if (savedTheme === 'light') {
                  document.documentElement.classList.remove('dark');
                } else {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
