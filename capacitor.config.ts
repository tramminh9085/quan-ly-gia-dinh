import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.giadinh.quanly",
  appName: "Quản Lý Gia Đình",
  webDir: "android-fallback",
  server: {
    androidScheme: "https",
    cleartext: true,
    // Sau khi deploy lên Vercel, bạn có thể điền trực tiếp URL Vercel vào đây
    // hoặc nhập trực tiếp ngay trên màn hình kết nối của ứng dụng Android APK:
    // url: "https://quan-ly-gia-dinh.vercel.app",
  },
};

export default config;
