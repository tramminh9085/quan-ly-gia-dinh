import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

export interface NotificationSettings {
  enabled: boolean;
  enableSchedules: boolean;
  scheduleLeadMinutes: number; // Phút báo trước giờ đưa / đón trẻ (VD: 15, 20, 30)
  enableExpenses: boolean;
  expenseNotifyHour: number; // Giờ báo đóng tiền buổi sáng (VD: 8h)
  enableEvents: boolean;
  eventNotifyHour: number; // Giờ báo lịch giỗ buổi sáng (VD: 7h)
}

export interface UpcomingReminderPreview {
  id: number;
  category: "schedule" | "expense" | "event";
  title: string;
  body: string;
  triggerAt: Date;
  timeLabel: string;
}

const SETTINGS_STORAGE_KEY = "FAMILY_NOTIFICATION_SETTINGS_V1";
const CHANNEL_ID = "family_hub_high_priority_channel";

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  enableSchedules: true,
  scheduleLeadMinutes: 20,
  enableExpenses: true,
  expenseNotifyHour: 8,
  enableEvents: true,
  eventNotifyHour: 7,
};

export function loadNotificationSettings(): NotificationSettings {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_SETTINGS;
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export function saveNotificationSettings(
  settings: NotificationSettings
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage error
  }
}

export function isNativeAndroidApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      Capacitor.isNativePlatform() ||
      Boolean(
        (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
          .Capacitor?.isNativePlatform?.()
      )
    );
  } catch {
    return false;
  }
}

export async function checkNotificationPermissionStatus(): Promise<
  "granted" | "denied" | "prompt"
> {
  if (typeof window === "undefined") return "prompt";
  try {
    if (isNativeAndroidApp()) {
      const status = await LocalNotifications.checkPermissions();
      if (status.display === "granted") return "granted";
      if (status.display === "denied") return "denied";
      return "prompt";
    }
    if ("Notification" in window) {
      if (Notification.permission === "granted") return "granted";
      if (Notification.permission === "denied") return "denied";
      return "prompt";
    }
  } catch (e) {
    console.warn("Check notification permission warning:", e);
  }
  return "prompt";
}

export async function requestNotificationPermission(): Promise<
  "granted" | "denied" | "prompt"
> {
  if (typeof window === "undefined") return "prompt";
  try {
    if (isNativeAndroidApp()) {
      const res = await LocalNotifications.requestPermissions();
      await ensureAndroidNotificationChannel();
      if (res.display === "granted") return "granted";
      if (res.display === "denied") return "denied";
      return "prompt";
    }
    if ("Notification" in window) {
      const res = await Notification.requestPermission();
      if (res === "granted") return "granted";
      if (res === "denied") return "denied";
      return "prompt";
    }
  } catch (e) {
    console.warn("Request notification permission warning:", e);
  }
  return "prompt";
}

async function ensureAndroidNotificationChannel() {
  if (!isNativeAndroidApp()) return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: "Nhắc Lịch Gia Đình (Giỗ • Đóng Tiền • Đón Con)",
      description:
        "Thông báo nhắc lịch đưa đón con, hạn đóng tiền định kỳ và ngày giỗ/sự kiện gia đình",
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: "#2563EB",
    });
  } catch {
    // Channel may already exist or not supported on web
  }
}

function formatMoneyVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
}

function formatDateTimeVN(dt: Date): string {
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  const mo = String(dt.getMonth() + 1).padStart(2, "0");
  return `${hh}:${mm} - Ngày ${dd}/${mo}`;
}

function parseTimeHHMM(timeStr: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((timeStr || "").trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/**
 * Tính các thời điểm diễn ra trong 14 ngày tới cho một thứ trong tuần (isoDayOfWeek: 1=Thứ 2 ... 7=CN)
 */
function getUpcomingOccurrencesForWeekday(
  isoDayOfWeek: number,
  hour: number,
  minute: number,
  offsetMinutes: number,
  now: Date
): Date[] {
  const results: Date[] = [];
  const jsDayNow = now.getDay(); // 0=CN, 1=T2..6=T7
  const currentIsoDay = jsDayNow === 0 ? 7 : jsDayNow;

  for (let weekOffset = 0; weekOffset < 2; weekOffset++) {
    let dayDiff = isoDayOfWeek - currentIsoDay + weekOffset * 7;
    if (dayDiff < 0) dayDiff += 7;
    const target = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + dayDiff,
      hour,
      minute,
      0,
      0
    );
    target.setMinutes(target.getMinutes() - offsetMinutes);
    if (target.getTime() > now.getTime() + 15 * 1000) {
      results.push(target);
    }
  }
  return results;
}

export interface SyncNotificationsInput {
  expenses: Array<{
    id: number;
    title: string;
    amount: number;
    cycle: "monthly" | "yearly";
    dueDay: number;
    dueMonth: number;
    isPaid: boolean;
    note?: string;
  }>;
  schedules: Array<{
    id: number;
    childName: string;
    subject: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    location: string;
    dropoffName: string;
    pickupName: string;
  }>;
  events: Array<{
    id: number;
    title: string;
    solarDateStr: string;
    daysUntil: number;
    remindDaysBefore: number;
    lunarDisplay: string;
    note?: string;
  }>;
  settings?: NotificationSettings;
}

/**
 * Xây dựng danh sách thông báo nhắc lịch sắp tới (Đưa đón trẻ, Đóng tiền, Ngày giỗ/lễ)
 */
export function buildUpcomingReminders(
  input: SyncNotificationsInput
): UpcomingReminderPreview[] {
  const settings = input.settings || loadNotificationSettings();
  if (!settings.enabled) return [];

  const now = new Date();
  const previews: UpcomingReminderPreview[] = [];

  // 1. NHẮC LỊCH ĐƯA & ĐÓN TRẺ (Lặp cho 14 ngày tới)
  if (settings.enableSchedules) {
    const leadMins = Math.max(5, Number(settings.scheduleLeadMinutes || 20));
    for (const s of input.schedules) {
      const startParsed = parseTimeHHMM(s.startTime);
      if (startParsed) {
        const dates = getUpcomingOccurrencesForWeekday(
          s.dayOfWeek,
          startParsed.hour,
          startParsed.minute,
          leadMins,
          now
        );
        dates.forEach((dt, idx) => {
          previews.push({
            id: 100000 + s.id * 10 + idx * 2,
            category: "schedule",
            title: `🚗 Sắp đến giờ đưa ${s.childName} đi học`,
            body: `${s.subject} lúc ${s.startTime}${
              s.location ? ` tại ${s.location}` : ""
            } • Người đưa: ${s.dropoffName}`,
            triggerAt: dt,
            timeLabel: formatDateTimeVN(dt),
          });
        });
      }

      const endParsed = parseTimeHHMM(s.endTime);
      if (endParsed) {
        const dates = getUpcomingOccurrencesForWeekday(
          s.dayOfWeek,
          endParsed.hour,
          endParsed.minute,
          leadMins,
          now
        );
        dates.forEach((dt, idx) => {
          previews.push({
            id: 100000 + s.id * 10 + idx * 2 + 1,
            category: "schedule",
            title: `🛵 Đến giờ chuẩn bị đón ${s.childName}`,
            body: `Tan học ${s.subject} lúc ${s.endTime}${
              s.location ? ` tại ${s.location}` : ""
            } • Người đón: ${s.pickupName}`,
            triggerAt: dt,
            timeLabel: formatDateTimeVN(dt),
          });
        });
      }
    }
  }

  // 2. NHẮC LỊCH ĐÓNG TIỀN ĐỊNH KỲ (Chỉ nhắc khoản chưa đóng)
  if (settings.enableExpenses) {
    const notifyHour = Number(settings.expenseNotifyHour || 8);
    for (const exp of input.expenses) {
      if (exp.isPaid) continue;

      const year = now.getFullYear();
      const month =
        exp.cycle === "yearly" ? (exp.dueMonth || 1) - 1 : now.getMonth();
      const maxDayInMonth = new Date(year, month + 1, 0).getDate();
      const safeDueDay = Math.min(Math.max(1, exp.dueDay || 1), maxDayInMonth);

      let dueDate = new Date(year, month, safeDueDay, notifyHour, 0, 0, 0);
      // Nếu đã qua hạn trong tháng/năm nhưng chưa đóng, tạo 1 lịch nhắc vào sáng mai
      if (dueDate.getTime() < now.getTime()) {
        const tomorrow = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1,
          notifyHour,
          0,
          0,
          0
        );
        previews.push({
          id: 200000 + exp.id * 10 + 9,
          category: "expense",
          title: `💳 Khoản đóng tiền đến hạn: ${exp.title}`,
          body: `Số tiền: ${formatMoneyVND(exp.amount)} (Hạn đóng ngày ${
            exp.dueDay
          }). Đừng quên thanh toán và tích Đã đóng nhé!`,
          triggerAt: tomorrow,
          timeLabel: formatDateTimeVN(tomorrow),
        });

        // Đồng thời đặt lịch cho kỳ tiếp theo
        dueDate =
          exp.cycle === "yearly"
            ? new Date(year + 1, month, safeDueDay, notifyHour, 0, 0, 0)
            : new Date(year, month + 1, safeDueDay, notifyHour, 0, 0, 0);
      }

      // Nhắc trước 3 ngày, trước 1 ngày và đúng ngày hạn đóng
      [3, 1, 0].forEach((daysBefore, idx) => {
        const remindDt = new Date(dueDate.getTime());
        remindDt.setDate(remindDt.getDate() - daysBefore);
        if (remindDt.getTime() > now.getTime() + 15 * 1000) {
          const prefix =
            daysBefore === 0
              ? "Hôm nay đến hạn đóng"
              : `Còn ${daysBefore} ngày đến hạn đóng`;
          previews.push({
            id: 200000 + exp.id * 10 + idx,
            category: "expense",
            title: `💳 ${prefix}: ${exp.title}`,
            body: `Số tiền: ${formatMoneyVND(exp.amount)} • Hạn đóng: ngày ${
              exp.dueDay
            }${exp.cycle === "yearly" ? `/${exp.dueMonth}` : " hàng tháng"}`,
            triggerAt: remindDt,
            timeLabel: formatDateTimeVN(remindDt),
          });
        }
      });
    }
  }

  // 3. NHẮC LỊCH GIỖ & SỰ KIỆN ÂM/DƯƠNG
  if (settings.enableEvents) {
    const notifyHour = Number(settings.eventNotifyHour || 7);
    for (const ev of input.events) {
      const parts = (ev.solarDateStr || "").split("/");
      if (parts.length !== 3) continue;
      const sDay = Number(parts[0]);
      const sMonth = Number(parts[1]);
      const sYear = Number(parts[2]);
      if (!sDay || !sMonth || !sYear) continue;

      const eventMorning = new Date(
        sYear,
        sMonth - 1,
        sDay,
        notifyHour,
        30,
        0,
        0
      );

      const offsets = Array.from(
        new Set([ev.remindDaysBefore || 7, 3, 1, 0])
      ).filter((d) => d >= 0);

      offsets.forEach((daysBefore, idx) => {
        const remindDt = new Date(eventMorning.getTime());
        remindDt.setDate(remindDt.getDate() - daysBefore);
        if (remindDt.getTime() > now.getTime() + 15 * 1000) {
          const label =
            daysBefore === 0
              ? "Hôm nay diễn ra"
              : `Còn ${daysBefore} ngày tới`;
          previews.push({
            id: 300000 + ev.id * 10 + idx,
            category: "event",
            title: `🕯️ ${label}: ${ev.title}`,
            body: `Ngày ${ev.solarDateStr} (${ev.lunarDisplay})${
              ev.note ? ` • ${ev.note}` : ""
            }`,
            triggerAt: remindDt,
            timeLabel: formatDateTimeVN(remindDt),
          });
        }
      });
    }
  }

  return previews.sort((a, b) => a.triggerAt.getTime() - b.triggerAt.getTime());
}

/**
 * Đồng bộ toàn bộ thông báo nhắc lịch với hệ điều hành Android (Capacitor LocalNotifications)
 */
export async function syncFamilyNotifications(
  input: SyncNotificationsInput
): Promise<UpcomingReminderPreview[]> {
  const settings = input.settings || loadNotificationSettings();
  const previews = buildUpcomingReminders({ ...input, settings });

  if (!isNativeAndroidApp()) {
    return previews;
  }

  try {
    const perm = await checkNotificationPermissionStatus();
    if (perm !== "granted") {
      return previews;
    }

    await ensureAndroidNotificationChannel();

    // Xóa các thông báo hẹn giờ cũ trước khi nạp danh sách mới
    const pending = await LocalNotifications.getPending();
    if (pending.notifications && pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      });
    }

    if (!settings.enabled || previews.length === 0) {
      return previews;
    }

    // Giới hạn tối đa 60 lịch hẹn gần nhất để tối ưu AlarmManager trên Android
    const toSchedule = previews.slice(0, 60).map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      channelId: CHANNEL_ID,
      schedule: {
        at: item.triggerAt,
        allowWhileIdle: true,
      },
    }));

    await LocalNotifications.schedule({
      notifications: toSchedule,
    });
  } catch (err) {
    console.warn("Không thể đồng bộ LocalNotifications trên thiết bị:", err);
  }

  return previews;
}

/**
 * Gửi ngay 1 thông báo kiểm tra (sau 2 giây) lên thanh trạng thái điện thoại Android / Trình duyệt
 */
export async function sendTestNotification(
  totalScheduledCount: number
): Promise<{ ok: boolean; message: string }> {
  try {
    const perm = await requestNotificationPermission();
    if (perm !== "granted") {
      return {
        ok: false,
        message:
          "Vui lòng cấp quyền Thông báo cho ứng dụng Quản Lý Gia Đình trong phần Cài đặt điện thoại!",
      };
    }

    const title = "🔔 Chuông nhắc Tổ Ấm Số đã sẵn sàng!";
    const body = `Hệ thống đang hẹn giờ tự động ${totalScheduledCount} lịch nhắc (Đón trẻ • Đóng tiền • Ngày giỗ).`;

    if (isNativeAndroidApp()) {
      await ensureAndroidNotificationChannel();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: 999999,
            title,
            body,
            channelId: CHANNEL_ID,
            schedule: {
              at: new Date(Date.now() + 1500),
              allowWhileIdle: true,
            },
          },
        ],
      });
      return {
        ok: true,
        message:
          "Đã gửi thông báo thử nghiệm! Hãy nhìn lên thanh thông báo điện thoại của bạn.",
      };
    }

    if (typeof window !== "undefined" && "Notification" in window) {
      new Notification(title, {
        body,
        icon: "/icon-192.png",
      });
      return {
        ok: true,
        message: "Đã hiển thị thông báo thử nghiệm thành công!",
      };
    }

    return {
      ok: false,
      message: "Thiết bị hiện tại chưa hỗ trợ hiển thị thông báo.",
    };
  } catch (err) {
    console.error("Test notification error:", err);
    return {
      ok: false,
      message: "Có lỗi khi gửi thông báo thử nghiệm. Vui lòng kiểm tra quyền thông báo!",
    };
  }
}
