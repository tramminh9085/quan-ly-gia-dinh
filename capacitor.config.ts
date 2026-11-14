import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.giadinh.quanly",
  appName: "Quản Lý Gia Đình",
  webDir: "android-fallback",
  server: {
    url: "https://minhtramqlgd.vercel.app",
    androidScheme: "https",
    cleartext: true,
    errorPath: "offline.html",
    allowNavigation: ["minhtramqlgd.vercel.app", "*.vercel.app"],
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#2563EB",
      sound: "beep.wav",
    },
  },
};

export default config;
