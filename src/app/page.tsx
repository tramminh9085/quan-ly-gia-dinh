"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet,
  CalendarClock,
  Sparkles,
  KeyRound,
  FileBadge,
  Users,
  Plus,
  Pencil,
  CheckCircle2,
  Clock,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  LogOut,
  GraduationCap,
  Car,
  Bike,
  Phone,
  MapPin,
  BellRing,
  ArrowUpCircle,
  ArrowDownCircle,
  History,
  Image as ImageIcon,
  X,
  Search,
  Database,
  Smartphone,
  Home,
  Sun,
  Moon,
  Crown,
  Lock,
  AlertCircle,
  Calendar,
  Lightbulb,
  User,
  Flame,
  FileText,
  Trophy,
  School,
  Zap,
  Link2,
  Camera,
  Building2,
  Download,
} from "lucide-react";
import { solarToLunar, getCurrentPeriodKeys } from "@/lib/lunar";
import {
  type NotificationSettings,
  type UpcomingReminderPreview,
  DEFAULT_NOTIFICATION_SETTINGS,
  loadNotificationSettings,
  saveNotificationSettings,
  syncFamilyNotifications,
  checkNotificationPermissionStatus,
  requestNotificationPermission,
  sendTestNotification,
} from "@/lib/notifications";

interface Member {
  id: number;
  username: string;
  fullName: string;
  roleLabel: string;
  isAdmin?: boolean;
  avatarColor: string;
}

interface ExpenseItem {
  id: number;
  title: string;
  amount: number;
  cycle: "monthly" | "yearly";
  dueDay: number;
  dueMonth: number;
  category: string;
  note: string;
  periodKey: string;
  isPaid: boolean;
  payment: {
    id: number;
    paidAmount: number;
    paidByName: string;
    paidAt: string;
    note: string;
  } | null;
  history: Array<{
    id: number;
    periodKey: string;
    paidAmount: number;
    paidByName: string;
    paidAt: string;
  }>;
}

interface IncomeItem {
  id: number;
  title: string;
  amount: number;
  cycle: "monthly" | "quarterly" | "yearly";
  periodKey: string;
  receivedBy: number | null;
  receivedByName: string;
  note: string;
  isReceived: boolean;
  receipt: {
    id: number;
    receivedAmount: number;
    receivedByName: string;
    receivedAt: string;
    note: string;
  } | null;
  history: Array<{
    id: number;
    periodKey: string;
    receivedAmount: number;
    receivedByName: string;
    receivedAt: string;
  }>;
}

interface SharedAccountItem {
  id: number;
  title: string;
  category: "class" | "contest" | "utility" | "entertainment" | "other";
  platformUrl: string;
  accountUsername: string;
  accountPassword: string;
  memberId: number | null;
  ownerName: string;
  note: string;
}

interface PersonalDocumentItem {
  id: number;
  title: string;
  docType:
    | "birth_cert"
    | "health_ins"
    | "id_card"
    | "passport"
    | "school"
    | "other";
  docNumber: string;
  memberId: number | null;
  holderName: string;
  issueDate: string;
  expiryDate: string;
  issuePlace: string;
  frontImage: string;
  backImage: string;
  note: string;
}

interface FamilyEventItem {
  id: number;
  title: string;
  eventType: "ancestor" | "birthday" | "anniversary" | "holiday" | "other";
  calendarType: "lunar" | "solar";
  day: number;
  month: number;
  year: number | null;
  isRecurring: boolean;
  remindDaysBefore: number;
  note: string;
  solarDateStr: string;
  daysUntil: number;
  lunarDisplay: string;
  isUpcomingSoon: boolean;
}

interface KidsScheduleItem {
  id: number;
  childId: number | null;
  childName: string;
  subject: string;
  scheduleType: "main" | "extra" | "activity";
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location: string;
  teacherInfo: string;
  dropoffBy: number | null;
  dropoffName: string;
  pickupBy: number | null;
  pickupName: string;
  note: string;
}

const DAY_NAMES: Record<number, string> = {
  1: "Thứ 2",
  2: "Thứ 3",
  3: "Thứ 4",
  4: "Thứ 5",
  5: "Thứ 6",
  6: "Thứ 7",
  7: "Chủ Nhật",
};

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
}

// Hàm chuyển đổi ảnh (kể cả định dạng .HEIC / .HEIF trên iPhone) sang JPEG và nén ngay trên trình duyệt
async function compressImageFile(file: File): Promise<string> {
  let targetBlob: Blob = file;
  const isHeicByNameOrType =
    /\.(heic|heif)$/i.test(file.name) ||
    file.type.toLowerCase().includes("heic") ||
    file.type.toLowerCase().includes("heif");

  let shouldConvertHeic = isHeicByNameOrType;
  if (!shouldConvertHeic) {
    try {
      const { isHeic } = await import("heic-to/next");
      shouldConvertHeic = await isHeic(file);
    } catch {
      shouldConvertHeic = false;
    }
  }

  if (shouldConvertHeic) {
    try {
      const { heicTo } = await import("heic-to/next");
      targetBlob = await heicTo({
        blob: file,
        type: "image/jpeg",
        quality: 0.82,
      });
    } catch {
      try {
        const heic2anyModule = await import("heic2any");
        const heic2any = heic2anyModule.default || heic2anyModule;
        const converted = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.82,
        });
        targetBlob = Array.isArray(converted) ? converted[0] : converted;
      } catch (err) {
        console.error("Không thể chuyển đổi file HEIC:", err);
        throw new Error(
          "Không thể đọc định dạng ảnh HEIC này. Vui lòng thử lại hoặc chọn ảnh JPG/PNG."
        );
      }
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 1000;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(String(ev.target?.result || ""));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      img.onerror = () =>
        reject(new Error("Định dạng ảnh không được trình duyệt hỗ trợ hiển thị."));
      img.src = String(ev.target?.result || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(targetBlob);
  });
}

export default function FamilyHubPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "finance" | "schedule" | "events" | "vault" | "members"
  >("finance");
  const [vaultSubTab, setVaultSubTab] = useState<"accounts" | "documents">(
    "accounts"
  );

  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [dbMode, setDbMode] = useState<"neon" | "local">("local");

  const defaultPeriods = useMemo(() => getCurrentPeriodKeys(), []);
  const [monthlyKey, setMonthlyKey] = useState(defaultPeriods.monthly);
  const [yearlyKey, setYearlyKey] = useState(defaultPeriods.yearly);

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [incomes, setIncomes] = useState<IncomeItem[]>([]);
  const [accounts, setAccounts] = useState<SharedAccountItem[]>([]);
  const [documents, setDocuments] = useState<PersonalDocumentItem[]>([]);
  const [events, setEvents] = useState<FamilyEventItem[]>([]);
  const [schedules, setSchedules] = useState<KidsScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [expenseCycleFilter, setExpenseCycleFilter] = useState<
    "all" | "monthly" | "yearly"
  >("all");
  const [scheduleChildFilter, setScheduleChildFilter] = useState<string>("all");
  const [scheduleDayFilter, setScheduleDayFilter] = useState<number>(0); // 0 = Tất cả
  const [accountCategoryFilter, setAccountCategoryFilter] =
    useState<string>("all");
  const [vaultSearch, setVaultSearch] = useState("");
  const [docHolderFilter, setDocHolderFilter] = useState<string>("all");

  // UI States
  const [isTopbarHidden, setIsTopbarHidden] = useState(false);
  const lastScrollYRef = useRef(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<
    Record<number, boolean>
  >({});
  const [historyModalExpense, setHistoryModalExpense] =
    useState<ExpenseItem | null>(null);
  const [historyModalIncome, setHistoryModalIncome] =
    useState<IncomeItem | null>(null);
  const [previewDoc, setPreviewDoc] = useState<PersonalDocumentItem | null>(
    null
  );
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS
  );
  const [notifPermission, setNotifPermission] = useState<
    "granted" | "denied" | "prompt"
  >("prompt");
  const [upcomingReminders, setUpcomingReminders] = useState<
    UpcomingReminderPreview[]
  >([]);
  const [notifStatusMsg, setNotifStatusMsg] = useState("");
  const [isAppShell, setIsAppShell] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isCapacitor = Boolean(
      (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
        .Capacitor?.isNativePlatform?.()
    );
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const isAndroidWV = /wv|Android.*Version\/[\d.]+/i.test(navigator.userAgent);
    if (isCapacitor || isStandalone || isAndroidWV) {
      setIsAppShell(true);
    }
  }, []);

  // Modal Form toggles & Editing IDs
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);

  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<number | null>(null);

  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(
    null
  );

  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);

  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null);

  const [showDocForm, setShowDocForm] = useState(false);
  const [editingDocId, setEditingDocId] = useState<number | null>(null);

  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);

  // Form states - Expense
  const [expTitle, setExpTitle] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCycle, setExpCycle] = useState<"monthly" | "yearly">("monthly");
  const [expDueDay, setExpDueDay] = useState(5);
  const [expDueMonth, setExpDueMonth] = useState(11);
  const [expCategory, setExpCategory] = useState("Sinh hoạt");
  const [expNote, setExpNote] = useState("");

  // Form states - Income
  const [incTitle, setIncTitle] = useState("");
  const [incAmount, setIncAmount] = useState("");
  const [incCycle, setIncCycle] = useState<"monthly" | "quarterly" | "yearly">(
    "monthly"
  );
  const [incReceivedBy, setIncReceivedBy] = useState<number>(1);
  const [incNote, setIncNote] = useState("");

  // Form states - Kids Schedule
  const [schChildName, setSchChildName] = useState("Bé Minh Khôi");
  const [schSubject, setSchSubject] = useState("");
  const [schType, setSchType] = useState<"main" | "extra" | "activity">(
    "extra"
  );
  const [schDay, setSchDay] = useState<number>(1);
  const [schStart, setSchStart] = useState("17:30");
  const [schEnd, setSchEnd] = useState("19:00");
  const [schLocation, setSchLocation] = useState("");
  const [schTeacher, setSchTeacher] = useState("");
  const [schDropoffName, setSchDropoffName] = useState("Bố Minh");
  const [schPickupName, setSchPickupName] = useState("Mẹ Lan");
  const [schNote, setSchNote] = useState("");

  // Form states - Family Event
  const [evTitle, setEvTitle] = useState("");
  const [evType, setEvType] = useState<
    "ancestor" | "birthday" | "anniversary" | "holiday" | "other"
  >("ancestor");
  const [evCalType, setEvCalType] = useState<"lunar" | "solar">("lunar");
  const [evDay, setEvDay] = useState(15);
  const [evMonth, setEvMonth] = useState(7);
  const [evRemind, setEvRemind] = useState(7);
  const [evNote, setEvNote] = useState("");

  // Form states - Shared Account
  const [accTitle, setAccTitle] = useState("");
  const [accCategory, setAccCategory] = useState<
    "class" | "contest" | "utility" | "entertainment" | "other"
  >("contest");
  const [accUrl, setAccUrl] = useState("");
  const [accUser, setAccUser] = useState("");
  const [accPass, setAccPass] = useState("");
  const [accOwner, setAccOwner] = useState("Bé Minh Khôi");
  const [accNote, setAccNote] = useState("");

  // Form states - Personal Document
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState<
    "birth_cert" | "health_ins" | "id_card" | "passport" | "school" | "other"
  >("birth_cert");
  const [docNumber, setDocNumber] = useState("");
  const [docHolder, setDocHolder] = useState("Bé Minh Khôi");
  const [docIssueDate, setDocIssueDate] = useState("");
  const [docExpiryDate, setDocExpiryDate] = useState("");
  const [docIssuePlace, setDocIssuePlace] = useState("");
  const [docFrontImg, setDocFrontImg] = useState("");
  const [docBackImg, setDocBackImg] = useState("");
  const [docNote, setDocNote] = useState("");
  const [docImgLoading, setDocImgLoading] = useState(false);
  const [docFormError, setDocFormError] = useState("");

  // Form states - Member (Create & Edit)
  const [memUsername, setMemUsername] = useState("");
  const [memFullName, setMemFullName] = useState("");
  const [memRole, setMemRole] = useState("Mẹ");
  const [memPassword, setMemPassword] = useState("123456");
  const [memColor, setMemColor] = useState("#E11D48");
  const [editMemUsername, setEditMemUsername] = useState("");
  const [editMemFullName, setEditMemFullName] = useState("");
  const [editMemRole, setEditMemRole] = useState("");
  const [editMemColor, setEditMemColor] = useState("#2563EB");
  const [editMemNewPassword, setEditMemNewPassword] = useState("");
  const [memberError, setMemberError] = useState("");
  const [memberSuccess, setMemberSuccess] = useState("");

  // Thông tin ngày Âm - Dương hôm nay
  const todayInfo = useMemo(() => {
    const now = new Date();
    const lunar = solarToLunar(
      now.getDate(),
      now.getMonth() + 1,
      now.getFullYear()
    );
    const jsDay = now.getDay(); // 0=CN, 1=T2...
    const isoDay = jsDay === 0 ? 7 : jsDay;
    return {
      solarStr: `${DAY_NAMES[isoDay]}, ${String(now.getDate()).padStart(
        2,
        "0"
      )}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`,
      lunarStr: `Ngày ${String(lunar.day).padStart(2, "0")}/${String(
        lunar.month
      ).padStart(2, "0")} Âm lịch (Năm ${lunar.canChiYear})`,
      isoDay,
    };
  }, []);

  async function loadAllData() {
    try {
      const authRes = await fetch("/api/auth").then((r) => r.json());
      if (!authRes.user) {
        router.replace("/login");
        return;
      }

      setCurrentUser(authRes.user);
      if (authRes.members) setMembers(authRes.members);
      if (authRes.dbMode) setDbMode(authRes.dbMode);

      const [expRes, incRes, accRes, docRes, evRes, schRes] =
        await Promise.all([
          fetch(
            `/api/expenses?monthlyKey=${monthlyKey}&yearlyKey=${yearlyKey}`
          ).then((r) => r.json()),
          fetch(
            `/api/incomes?monthlyKey=${monthlyKey}&yearlyKey=${yearlyKey}`
          ).then((r) => r.json()),
          fetch("/api/accounts").then((r) => r.json()),
          fetch("/api/documents").then((r) => r.json()),
          fetch("/api/events").then((r) => r.json()),
          fetch("/api/schedules").then((r) => r.json()),
        ]);

      if (expRes.expenses) setExpenses(expRes.expenses);
      if (incRes.incomes) setIncomes(incRes.incomes);
      if (accRes.accounts) setAccounts(accRes.accounts);
      if (docRes.documents) setDocuments(docRes.documents);
      if (evRes.events) setEvents(evRes.events);
      if (schRes.schedules) setSchedules(schRes.schedules);
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthlyKey, yearlyKey]);

  // Khởi tạo cấu hình thông báo và kiểm tra quyền trên Android APK / Web
  useEffect(() => {
    const saved = loadNotificationSettings();
    setNotifSettings(saved);
    checkNotificationPermissionStatus().then((status) => {
      setNotifPermission(status);
      if (status === "prompt") {
        requestNotificationPermission().then((newStatus) =>
          setNotifPermission(newStatus)
        );
      }
    });
  }, []);

  // Tự động đồng bộ lịch hẹn thông báo (Đón trẻ • Đóng tiền • Ngày giỗ) khi dữ liệu thay đổi
  useEffect(() => {
    if (loading || !currentUser) return;
    syncFamilyNotifications({
      expenses,
      schedules,
      events,
      settings: notifSettings,
    }).then((previews) => {
      setUpcomingReminders(previews);
    });
  }, [expenses, schedules, events, notifSettings, loading, currentUser]);

  function handleUpdateNotifSettings(patch: Partial<NotificationSettings>) {
    setNotifSettings((prev) => {
      const next = { ...prev, ...patch };
      saveNotificationSettings(next);
      return next;
    });
    setNotifStatusMsg("Đã lưu cài đặt và cập nhật lịch hẹn thông báo!");
    setTimeout(() => setNotifStatusMsg(""), 3000);
  }

  async function handleEnableNotifications() {
    const status = await requestNotificationPermission();
    setNotifPermission(status);
    if (status === "granted") {
      const previews = await syncFamilyNotifications({
        expenses,
        schedules,
        events,
        settings: notifSettings,
      });
      setUpcomingReminders(previews);
      setNotifStatusMsg(
        `Đã bật quyền thông báo và kích hoạt ${previews.length} lịch nhắc tự động!`
      );
    } else {
      setNotifStatusMsg(
        "Chưa cấp quyền thông báo. Vui lòng bật quyền Thông báo trong Cài đặt ứng dụng trên điện thoại!"
      );
    }
  }

  async function handleTestNotificationNow() {
    const res = await sendTestNotification(upcomingReminders.length);
    const status = await checkNotificationPermissionStatus();
    setNotifPermission(status);
    setNotifStatusMsg(res.message);
  }

  // Tự động ẩn Topbar khi cuộn trang xuống hoặc xem chi tiết, hiện lại khi cuộn lên đầu trang
  useEffect(() => {
    function handleScroll() {
      const currentY = window.scrollY;
      const prevY = lastScrollYRef.current;

      if (currentY <= 24) {
        setIsTopbarHidden(false);
      } else if (currentY > prevY + 6 && currentY > 48) {
        setIsTopbarHidden(true);
      } else if (currentY < prevY - 10) {
        setIsTopbarHidden(false);
      }

      lastScrollYRef.current = currentY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const hasActiveDetailView = Boolean(
    historyModalExpense ||
      historyModalIncome ||
      previewDoc ||
      showNotificationModal ||
      showExpenseForm ||
      showIncomeForm ||
      showScheduleForm ||
      showEventForm ||
      showAccountForm ||
      showDocForm ||
      showMemberForm ||
      editingMemberId
  );

  const shouldHideTopbar = isTopbarHidden || hasActiveDetailView;

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  }

  // Các con số tổng hợp Thu - Chi
  const financeSummary = useMemo(() => {
    const monthlyIncomeTotal = incomes
      .filter((i) => i.cycle === "monthly")
      .reduce((s, i) => s + Number(i.amount), 0);
    const quarterlyIncomeTotal = incomes
      .filter((i) => i.cycle === "quarterly")
      .reduce((s, i) => s + Number(i.amount), 0);
    const yearlyIncomeTotal = incomes
      .filter((i) => i.cycle === "yearly")
      .reduce((s, i) => s + Number(i.amount), 0);

    const totalDue = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const totalPaid = expenses
      .filter((e) => e.isPaid)
      .reduce((s, e) => s + Number(e.payment?.paidAmount || e.amount), 0);
    const totalUnpaid = Math.max(0, totalDue - totalPaid);
    const paidCount = expenses.filter((e) => e.isPaid).length;
    const unpaidCount = expenses.length - paidCount;
    const progressPercent =
      expenses.length > 0 ? Math.round((paidCount / expenses.length) * 100) : 0;

    return {
      monthlyIncomeTotal,
      quarterlyIncomeTotal,
      yearlyIncomeTotal,
      totalDue,
      totalPaid,
      totalUnpaid,
      paidCount,
      unpaidCount,
      progressPercent,
    };
  }, [expenses, incomes]);

  // Ca học hôm nay của các con
  const todaySchedules = useMemo(() => {
    return schedules.filter((s) => s.dayOfWeek === todayInfo.isoDay);
  }, [schedules, todayInfo.isoDay]);

  // Toggle Đã đóng / Chưa đóng
  async function handleTogglePay(exp: ExpenseItem) {
    if (exp.isPaid) {
      await fetch(
        `/api/expenses/pay?expenseId=${exp.id}&periodKey=${exp.periodKey}`,
        { method: "DELETE" }
      );
    } else {
      await fetch("/api/expenses/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenseId: exp.id,
          periodKey: exp.periodKey,
          paidAmount: exp.amount,
          paidBy: currentUser?.id || 1,
          note: `${currentUser?.fullName || "Thành viên"} đánh dấu đã đóng`,
        }),
      });
    }
    await loadAllData();
  }

  // Toggle Đã thu / Chưa thu theo kỳ
  async function handleToggleReceiveIncome(inc: IncomeItem) {
    if (inc.isReceived) {
      await fetch(
        `/api/incomes/receive?incomeId=${inc.id}&periodKey=${inc.periodKey}`,
        { method: "DELETE" }
      );
    } else {
      await fetch("/api/incomes/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incomeId: inc.id,
          periodKey: inc.periodKey,
          receivedAmount: inc.amount,
          receivedBy: currentUser?.id || inc.receivedBy || 1,
          note: `${currentUser?.fullName || "Thành viên"} đánh dấu đã thu`,
        }),
      });
    }
    await loadAllData();
  }

  // Thêm hoặc sửa khoản đóng định kỳ (Tháng / Năm)
  function startEditExpense(exp: ExpenseItem) {
    setEditingExpenseId(exp.id);
    setExpTitle(exp.title);
    setExpAmount(String(exp.amount));
    setExpCycle(exp.cycle === "yearly" ? "yearly" : "monthly");
    setExpDueDay(exp.dueDay);
    setExpDueMonth(exp.dueMonth || 1);
    setExpCategory(exp.category);
    setExpNote(exp.note || "");
    setShowExpenseForm(true);
  }

  function resetExpenseForm() {
    setEditingExpenseId(null);
    setExpTitle("");
    setExpAmount("");
    setExpCycle("monthly");
    setExpDueDay(5);
    setExpDueMonth(11);
    setExpCategory("Sinh hoạt");
    setExpNote("");
    setShowExpenseForm(false);
  }

  async function handleCreateExpense(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/expenses", {
      method: editingExpenseId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingExpenseId,
        title: expTitle,
        amount: Number(expAmount),
        cycle: expCycle,
        dueDay: Number(expDueDay),
        dueMonth: Number(expDueMonth),
        category: expCategory,
        note: expNote,
      }),
    });
    if (res.ok) {
      resetExpenseForm();
      await loadAllData();
    }
  }

  // Thêm hoặc sửa khoản thu
  function startEditIncome(inc: IncomeItem) {
    setEditingIncomeId(inc.id);
    setIncTitle(inc.title);
    setIncAmount(String(inc.amount));
    setIncCycle(inc.cycle);
    setIncReceivedBy(inc.receivedBy || currentUser?.id || 1);
    setIncNote(inc.note || "");
    setShowIncomeForm(true);
  }

  function resetIncomeForm() {
    setEditingIncomeId(null);
    setIncTitle("");
    setIncAmount("");
    setIncCycle("monthly");
    setIncNote("");
    setShowIncomeForm(false);
  }

  async function handleCreateIncome(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/incomes", {
      method: editingIncomeId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingIncomeId,
        title: incTitle,
        amount: Number(incAmount),
        cycle: incCycle,
        periodKey:
          incCycle === "monthly"
            ? monthlyKey
            : incCycle === "quarterly"
            ? defaultPeriods.quarterly
            : yearlyKey,
        receivedBy: incReceivedBy,
        note: incNote,
      }),
    });
    if (res.ok) {
      resetIncomeForm();
      await loadAllData();
    }
  }

  // Thêm hoặc sửa lịch học & đưa đón con
  function startEditSchedule(s: KidsScheduleItem) {
    setEditingScheduleId(s.id);
    setSchChildName(s.childName);
    setSchSubject(s.subject);
    setSchType(s.scheduleType);
    setSchDay(s.dayOfWeek);
    setSchStart(s.startTime);
    setSchEnd(s.endTime);
    setSchLocation(s.location || "");
    setSchTeacher(s.teacherInfo || "");
    setSchDropoffName(s.dropoffName || "");
    setSchPickupName(s.pickupName || "");
    setSchNote(s.note || "");
    setShowScheduleForm(true);
  }

  function resetScheduleForm() {
    setEditingScheduleId(null);
    setSchSubject("");
    setSchLocation("");
    setSchTeacher("");
    setSchNote("");
    setShowScheduleForm(false);
  }

  async function handleCreateSchedule(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/schedules", {
      method: editingScheduleId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingScheduleId,
        childName: schChildName,
        subject: schSubject,
        scheduleType: schType,
        dayOfWeek: schDay,
        startTime: schStart,
        endTime: schEnd,
        location: schLocation,
        teacherInfo: schTeacher,
        dropoffName: schDropoffName,
        pickupName: schPickupName,
        note: schNote,
      }),
    });
    if (res.ok) {
      resetScheduleForm();
      await loadAllData();
    }
  }

  // Thêm hoặc sửa lịch giỗ / sự kiện
  function startEditEvent(ev: FamilyEventItem) {
    setEditingEventId(ev.id);
    setEvTitle(ev.title);
    setEvType(ev.eventType);
    setEvCalType(ev.calendarType);
    setEvDay(ev.day);
    setEvMonth(ev.month);
    setEvRemind(ev.remindDaysBefore || 7);
    setEvNote(ev.note || "");
    setShowEventForm(true);
  }

  function resetEventForm() {
    setEditingEventId(null);
    setEvTitle("");
    setEvNote("");
    setShowEventForm(false);
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/events", {
      method: editingEventId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingEventId,
        title: evTitle,
        eventType: evType,
        calendarType: evCalType,
        day: Number(evDay),
        month: Number(evMonth),
        remindDaysBefore: Number(evRemind),
        note: evNote,
      }),
    });
    if (res.ok) {
      resetEventForm();
      await loadAllData();
    }
  }

  // Thêm hoặc sửa tài khoản dùng chung
  function startEditAccount(acc: SharedAccountItem) {
    setEditingAccountId(acc.id);
    setAccTitle(acc.title);
    setAccCategory(acc.category);
    setAccUrl(acc.platformUrl || "");
    setAccUser(acc.accountUsername);
    setAccPass(acc.accountPassword);
    setAccOwner(acc.ownerName || "Cả gia đình");
    setAccNote(acc.note || "");
    setShowAccountForm(true);
  }

  function resetAccountForm() {
    setEditingAccountId(null);
    setAccTitle("");
    setAccUrl("");
    setAccUser("");
    setAccPass("");
    setAccNote("");
    setShowAccountForm(false);
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/accounts", {
      method: editingAccountId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingAccountId,
        title: accTitle,
        category: accCategory,
        platformUrl: accUrl,
        accountUsername: accUser,
        accountPassword: accPass,
        ownerName: accOwner,
        note: accNote,
      }),
    });
    if (res.ok) {
      resetAccountForm();
      await loadAllData();
    }
  }

  // Thêm hoặc sửa giấy tờ cá nhân
  function startEditDocument(doc: PersonalDocumentItem) {
    setEditingDocId(doc.id);
    setDocTitle(doc.title);
    setDocType(doc.docType);
    setDocNumber(doc.docNumber || "");
    setDocHolder(doc.holderName);
    setDocIssueDate(doc.issueDate || "");
    setDocExpiryDate(doc.expiryDate || "");
    setDocIssuePlace(doc.issuePlace || "");
    setDocFrontImg(doc.frontImage || "");
    setDocBackImg(doc.backImage || "");
    setDocNote(doc.note || "");
    setDocFormError("");
    setShowDocForm(true);
  }

  function resetDocumentForm() {
    setEditingDocId(null);
    setDocTitle("");
    setDocNumber("");
    setDocIssueDate("");
    setDocExpiryDate("");
    setDocIssuePlace("");
    setDocFrontImg("");
    setDocBackImg("");
    setDocNote("");
    setDocFormError("");
    setShowDocForm(false);
  }

  async function handleCreateDocument(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/documents", {
      method: editingDocId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingDocId,
        title: docTitle,
        docType,
        docNumber,
        holderName: docHolder,
        issueDate: docIssueDate,
        expiryDate: docExpiryDate,
        issuePlace: docIssuePlace,
        frontImage: docFrontImg,
        backImage: docBackImg,
        note: docNote,
      }),
    });
    if (res.ok) {
      resetDocumentForm();
      await loadAllData();
    }
  }

  // Thêm thành viên mới (Chỉ dành cho Admin)
  async function handleCreateMember(e: React.FormEvent) {
    e.preventDefault();
    setMemberError("");
    setMemberSuccess("");
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: memUsername,
        fullName: memFullName,
        roleLabel: memRole,
        password: memPassword,
        avatarColor: memColor,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMemberError(data.error || "Không thể tạo thành viên!");
      return;
    }
    setMemUsername("");
    setMemFullName("");
    setMemPassword("123456");
    setShowMemberForm(false);
    setMemberSuccess(
      `Đã tạo tài khoản thành công cho ${data.member?.fullName || "thành viên mới"} (@${data.member?.username})!`
    );
    await loadAllData();
  }

  // Sửa thông tin thành viên & đổi mật khẩu
  function startEditMember(m: Member) {
    setShowMemberForm(false);
    setMemberError("");
    setMemberSuccess("");
    setEditingMemberId(m.id);
    setEditMemFullName(m.fullName);
    setEditMemUsername(m.username);
    setEditMemRole(m.roleLabel);
    setEditMemColor(m.avatarColor);
    setEditMemNewPassword("");
  }

  async function handleUpdateMember(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMemberId) return;
    setMemberError("");
    setMemberSuccess("");

    const res = await fetch("/api/members", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingMemberId,
        fullName: editMemFullName,
        username: editMemUsername,
        roleLabel: editMemRole,
        avatarColor: editMemColor,
        newPassword: editMemNewPassword,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMemberError(data.error || "Không thể cập nhật thông tin thành viên!");
      return;
    }
    setEditingMemberId(null);
    setEditMemNewPassword("");
    setMemberSuccess(
      `Đã cập nhật thông tin${editMemNewPassword ? " & mật khẩu mới" : ""} cho ${data.member?.fullName || "thành viên"}!`
    );
    await loadAllData();
  }

  async function handleDeleteItem(endpoint: string, id: number) {
    await fetch(`/api/${endpoint}?id=${id}`, { method: "DELETE" });
    await loadAllData();
  }

  async function handleLogout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.push("/login");
  }

  const filteredExpenses = useMemo(() => {
    if (expenseCycleFilter === "all") return expenses;
    return expenses.filter((e) => e.cycle === expenseCycleFilter);
  }, [expenses, expenseCycleFilter]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (scheduleChildFilter !== "all" && s.childName !== scheduleChildFilter)
        return false;
      if (scheduleDayFilter !== 0 && s.dayOfWeek !== scheduleDayFilter)
        return false;
      return true;
    });
  }, [schedules, scheduleChildFilter, scheduleDayFilter]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => {
      if (
        accountCategoryFilter !== "all" &&
        a.category !== accountCategoryFilter
      )
        return false;
      if (vaultSearch.trim()) {
        const q = vaultSearch.toLowerCase();
        return (
          a.title.toLowerCase().includes(q) ||
          a.accountUsername.toLowerCase().includes(q) ||
          a.ownerName.toLowerCase().includes(q) ||
          a.note.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [accounts, accountCategoryFilter, vaultSearch]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((d) => {
      if (docHolderFilter !== "all" && d.holderName !== docHolderFilter)
        return false;
      if (vaultSearch.trim()) {
        const q = vaultSearch.toLowerCase();
        return (
          d.title.toLowerCase().includes(q) ||
          d.docNumber.toLowerCase().includes(q) ||
          d.holderName.toLowerCase().includes(q) ||
          d.note.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [documents, docHolderFilter, vaultSearch]);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="card-3d bg-white px-6 py-4 font-bold text-slate-800 text-sm flex items-center gap-2.5 shadow-lg">
          <Lock className="w-4 h-4 text-blue-600" aria-hidden="true" />
          <span>Đang kiểm tra phiên đăng nhập bảo mật...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 md:pb-12">
      {/* TOP BAR GỌN NHẸ (TỰ ĐỘNG ẨN KHI CUỘN HOẶC XEM CHI TIẾT) */}
      <header
        style={{
          paddingTop: isAppShell
            ? "max(env(safe-area-inset-top, 0px), 38px)"
            : "max(env(safe-area-inset-top, 0px), 0px)",
        }}
        className={`sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all duration-300 ease-in-out ${
          shouldHideTopbar
            ? "-translate-y-full opacity-0 pointer-events-none"
            : "translate-y-0 opacity-100"
        }`}
      >
        <div className="max-w-7xl mx-auto px-3.5 md:px-4 py-2 md:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl md:rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shadow-blue-600/20 shrink-0">
              <Home className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-base md:text-xl font-extrabold tracking-tight text-slate-900 truncate">
                Quản Lý Gia Đình
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/80 rounded-full shrink-0">
                <Sparkles className="w-3 h-3 text-blue-600" aria-hidden="true" />
                <span>Tổ Ấm Số</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setNotifStatusMsg("");
                setShowNotificationModal(true);
              }}
              aria-label="Cài đặt thông báo nhắc lịch"
              title="Cài đặt chuông thông báo nhắc lịch (Giỗ, Đóng tiền, Đón trẻ)"
              className={`btn-3d px-2.5 py-1.5 md:px-3.5 md:py-2 text-xs md:text-sm relative ${
                notifSettings.enabled && notifPermission === "granted"
                  ? "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
              }`}
            >
              <BellRing className="w-4 h-4 text-amber-600" aria-hidden="true" />
              <span className="hidden sm:inline">Nhắc lịch</span>
              {notifSettings.enabled && upcomingReminders.length > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[10px] font-extrabold tabular-nums">
                  {upcomingReminders.length}
                </span>
              )}
            </button>

            {currentUser && (
              <div className="badge-3d bg-slate-50 border-slate-200 px-2.5 py-1 md:px-3 md:py-1.5 flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                <span
                  className="w-5 h-5 md:w-6 md:h-6 rounded-full text-white flex items-center justify-center font-bold text-[11px] md:text-xs shadow-xs shrink-0"
                  style={{ backgroundColor: currentUser.avatarColor }}
                >
                  {currentUser.fullName.charAt(0)}
                </span>
                <span className="font-bold text-slate-900 max-w-[110px] sm:max-w-none truncate">
                  {currentUser.fullName}
                </span>
                {currentUser.isAdmin && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold uppercase">
                    <Crown className="w-3 h-3 text-amber-600" aria-hidden="true" />
                    <span>Admin</span>
                  </span>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Đăng xuất tài khoản"
              className="btn-3d bg-white hover:bg-rose-50 text-rose-600 border-slate-200 hover:border-rose-200 px-2.5 py-1.5 md:px-3.5 md:py-2 text-xs md:text-sm"
              title="Đăng xuất tài khoản"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-6">
        {/* BENTO QUICK REMINDERS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab("finance")}
            className="card-3d card-3d-interactive p-5 bg-gradient-to-br from-white via-white to-amber-50/70 border-amber-200/80 text-left flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase text-amber-800 tracking-wider">
                Khoản đóng định kỳ
              </div>
              <div className="text-base md:text-lg font-extrabold text-slate-900 mt-1">
                {financeSummary.unpaidCount > 0
                  ? `Còn ${financeSummary.unpaidCount} khoản chưa đóng`
                  : "Đã hoàn tất mọi khoản!"}
              </div>
              <div className="text-xs font-semibold text-slate-600 mt-1 tabular-nums">
                Cần đóng:{" "}
                <span className="font-bold text-amber-900">
                  {formatVND(financeSummary.totalUnpaid)}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
              <Wallet className="w-6 h-6" aria-hidden="true" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("schedule")}
            className="card-3d card-3d-interactive p-5 bg-gradient-to-br from-white via-white to-sky-50/70 border-sky-200/80 text-left flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase text-sky-800 tracking-wider">
                Lịch con hôm nay ({DAY_NAMES[todayInfo.isoDay]})
              </div>
              <div className="text-base md:text-lg font-extrabold text-slate-900 mt-1">
                {todaySchedules.length > 0
                  ? `${todaySchedules.length} ca học cần đưa đón`
                  : "Hôm nay không có ca học"}
              </div>
              <div className="text-xs font-semibold text-slate-600 mt-1 truncate">
                {todaySchedules[0]
                  ? `${todaySchedules[0].startTime}: ${todaySchedules[0].childName} (${todaySchedules[0].dropoffName} đưa)${
                      todaySchedules[0].location
                        ? ` • ${todaySchedules[0].location}`
                        : ""
                    }`
                  : "Chạm để xem thời khóa biểu tuần"}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 border border-sky-200 flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6" aria-hidden="true" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("events")}
            className="card-3d card-3d-interactive p-5 bg-gradient-to-br from-white via-white to-rose-50/70 border-rose-200/80 text-left flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase text-rose-800 tracking-wider">
                Lịch giỗ & Sự kiện sắp tới
              </div>
              <div className="text-base md:text-lg font-extrabold text-slate-900 mt-1 truncate">
                {events[0] ? events[0].title : "Chưa có sự kiện"}
              </div>
              <div className="text-xs font-semibold text-rose-700 mt-1 inline-flex items-center gap-1 tabular-nums">
                {events[0] ? (
                  <>
                    <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>
                      Còn {events[0].daysUntil} ngày ({events[0].solarDateStr} Dương)
                    </span>
                  </>
                ) : (
                  <span>Chạm để thêm lịch Âm / Dương</span>
                )}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0">
              <BellRing className="w-6 h-6" aria-hidden="true" />
            </div>
          </button>
        </div>

        {/* THANH ĐIỀU HƯỚNG 5 PHÂN HỆ TRÊN DESKTOP */}
        <nav
          aria-label="Phân hệ quản lý chính"
          className="hidden md:grid grid-cols-5 gap-2.5 mb-6 p-1.5 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/90 shadow-xs"
        >
          {[
            {
              id: "finance",
              label: "Thu - Chi Định Kỳ",
              icon: Wallet,
              activeColor: "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20",
            },
            {
              id: "schedule",
              label: "Lịch Học & Đưa Đón",
              icon: GraduationCap,
              activeColor: "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20",
            },
            {
              id: "events",
              label: "Lịch Giỗ & Sự Kiện",
              icon: CalendarClock,
              activeColor: "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20",
            },
            {
              id: "vault",
              label: "Tài Khoản & Giấy Tờ",
              icon: KeyRound,
              activeColor: "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20",
            },
            {
              id: "members",
              label: "Thành Viên Gia Đình",
              icon: Users,
              activeColor: "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20",
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() =>
                  setActiveTab(
                    tab.id as
                      | "finance"
                      | "schedule"
                      | "events"
                      | "vault"
                      | "members"
                  )
                }
                className={`btn-3d py-3 px-3.5 text-sm ${
                  isActive
                    ? tab.activeColor
                    : "bg-transparent border-transparent shadow-none hover:bg-slate-100 text-slate-700"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* =====================================================================
            PHÂN HỆ 1: QUẢN LÝ THU - CHI & CÁC KHOẢN ĐÓNG ĐỊNH KỲ (TUẦN/THÁNG/NĂM)
           ===================================================================== */}
        {activeTab === "finance" && (
          <div className="space-y-6">
            {/* 4 Thẻ thống kê Bento Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card-3d p-5 bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-emerald-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                    Tổng thu tháng này
                  </span>
                  <ArrowUpCircle className="w-5 h-5 text-emerald-200" aria-hidden="true" />
                </div>
                <div className="text-2xl font-extrabold mt-2 tabular-nums">
                  {formatVND(financeSummary.monthlyIncomeTotal)}
                </div>
                <div className="text-xs font-medium mt-1.5 text-emerald-100 tabular-nums">
                  + Quý: {formatVND(financeSummary.quarterlyIncomeTotal)} • Năm:{" "}
                  {formatVND(financeSummary.yearlyIncomeTotal)}
                </div>
              </div>

              <div className="card-3d p-5 bg-white text-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Tổng khoản phải đóng
                  </span>
                  <ArrowDownCircle className="w-5 h-5 text-blue-600" aria-hidden="true" />
                </div>
                <div className="text-2xl font-extrabold mt-2 text-slate-900 tabular-nums">
                  {formatVND(financeSummary.totalDue)}
                </div>
                <div className="text-xs font-medium mt-1.5 text-slate-600">
                  Tổng cộng {expenses.length} khoản định kỳ
                </div>
              </div>

              <div className="card-3d p-5 bg-gradient-to-br from-white to-sky-50/80 border-sky-200/80 text-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-800">
                    Đã đóng trong kỳ
                  </span>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                </div>
                <div className="text-2xl font-extrabold mt-2 text-emerald-700 tabular-nums">
                  {formatVND(financeSummary.totalPaid)}
                </div>
                <div className="text-xs font-semibold mt-1.5 text-slate-600 tabular-nums">
                  Hoàn thành {financeSummary.paidCount}/{expenses.length} khoản (
                  {financeSummary.progressPercent}%)
                </div>
              </div>

              <div className="card-3d p-5 bg-gradient-to-br from-white to-amber-50/80 border-amber-200/80 text-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    Còn phải đóng
                  </span>
                  <Clock className="w-5 h-5 text-amber-600" aria-hidden="true" />
                </div>
                <div className="text-2xl font-extrabold mt-2 text-rose-600 tabular-nums">
                  {formatVND(financeSummary.totalUnpaid)}
                </div>
                <div className="text-xs font-semibold mt-1.5 text-slate-600">
                  Còn {financeSummary.unpaidCount} khoản chờ thanh toán
                </div>
              </div>
            </div>

            {/* Thanh tiến độ đóng tiền định kỳ */}
            <div className="card-3d p-5 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span className="font-bold text-slate-900 text-sm md:text-base tabular-nums">
                  Tiến độ thanh toán các khoản định kỳ ({financeSummary.progressPercent}%)
                </span>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold tabular-nums">
                  <input
                    type="month"
                    aria-label="Chọn kỳ tháng"
                    value={monthlyKey}
                    onChange={(e) => {
                      if (e.target.value) setMonthlyKey(e.target.value);
                    }}
                    className="badge-3d bg-blue-50 text-blue-800 border-blue-200 px-3 py-1 cursor-pointer"
                  />
                  <span className="badge-3d bg-slate-100 text-slate-700 border-slate-200 px-3 py-1">
                    Năm: {yearlyKey}
                  </span>
                </div>
              </div>
              <div
                role="progressbar"
                aria-valuenow={financeSummary.progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                className="w-full h-3.5 rounded-full bg-slate-100 border border-slate-200 overflow-hidden"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-300"
                  style={{ width: `${financeSummary.progressPercent}%` }}
                />
              </div>
            </div>

            {/* KHU VỰC DANH SÁCH KHOẢN ĐÓNG ĐỊNH KỲ (THÁNG / NĂM) */}
            <div className="card-3d p-5 md:p-6 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-slate-900">
                    Các khoản phải đóng định kỳ (Tháng / Năm)
                  </h2>
                  <p className="text-xs md:text-sm font-medium text-slate-600 mt-0.5">
                    Bấm &ldquo;Đánh dấu Đã đóng&rdquo; khi thanh toán xong hoặc bấm biểu tượng bút chì để cập nhật
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (showExpenseForm && editingExpenseId) {
                      resetExpenseForm();
                    } else {
                      setEditingExpenseId(null);
                      setShowExpenseForm(!showExpenseForm);
                    }
                  }}
                  className="btn-3d bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-sm"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>Thêm Khoản Đóng</span>
                </button>
              </div>

              {/* Bộ lọc Tháng / Năm */}
              <div className="flex flex-wrap gap-2 mb-5">
                {[
                  { id: "all", label: `Tất cả (${expenses.length})` },
                  {
                    id: "monthly",
                    label: `Theo Tháng (${
                      expenses.filter((e) => e.cycle === "monthly").length
                    })`,
                  },
                  {
                    id: "yearly",
                    label: `Theo Năm (${
                      expenses.filter((e) => e.cycle === "yearly").length
                    })`,
                  },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() =>
                      setExpenseCycleFilter(
                        f.id as "all" | "monthly" | "yearly"
                      )
                    }
                    className={`btn-3d px-4 py-2 text-xs md:text-sm ${
                      expenseCycleFilter === f.id
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Form Thêm / Sửa Khoản Đóng Định Kỳ */}
              {showExpenseForm && (
                <form
                  onSubmit={handleCreateExpense}
                  className="card-3d-sm bg-slate-50/90 border-blue-200 p-4 md:p-5 mb-6 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      {editingExpenseId ? (
                        <>
                          <Pencil className="w-4 h-4 text-blue-600" aria-hidden="true" />
                          <span>Chỉnh sửa khoản phải đóng định kỳ</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 text-blue-600" aria-hidden="true" />
                          <span>Thêm khoản phải đóng định kỳ mới (Tháng / Năm)</span>
                        </>
                      )}
                    </h3>
                    <button
                      type="button"
                      onClick={resetExpenseForm}
                      aria-label="Đóng biểu mẫu"
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200/70"
                    >
                      <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Tên khoản đóng *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Tiền điện, Học phí, Quỹ lớp..."
                        value={expTitle}
                        onChange={(e) => setExpTitle(e.target.value)}
                        className="input-3d"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Số tiền dự kiến (VNĐ) *
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="VD: 1500000"
                        value={expAmount}
                        onChange={(e) => setExpAmount(e.target.value)}
                        className="input-3d tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Chu kỳ định kỳ *
                      </label>
                      <select
                        value={expCycle}
                        onChange={(e) =>
                          setExpCycle(e.target.value as "monthly" | "yearly")
                        }
                        className="input-3d"
                      >
                        <option value="monthly">Hàng Tháng (Monthly)</option>
                        <option value="yearly">Hàng Năm (Yearly)</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div className={expCycle === "yearly" ? "" : "col-span-2"}>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Ngày hạn đóng (1-31)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          value={expDueDay}
                          onChange={(e) => setExpDueDay(Number(e.target.value))}
                          className="input-3d tabular-nums"
                        />
                      </div>
                      {expCycle === "yearly" && (
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                            Tháng đóng (1-12)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={12}
                            value={expDueMonth}
                            onChange={(e) =>
                              setExpDueMonth(Number(e.target.value))
                            }
                            className="input-3d tabular-nums"
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Danh mục
                      </label>
                      <select
                        value={expCategory}
                        onChange={(e) => setExpCategory(e.target.value)}
                        className="input-3d"
                      >
                        <option value="Sinh hoạt">Sinh hoạt / Đi chợ</option>
                        <option value="Điện nước">Điện / Nước / Internet</option>
                        <option value="Học tập">Học phí / Quỹ lớp con</option>
                        <option value="Bảo hiểm">Bảo hiểm / Y tế</option>
                        <option value="Nhà cửa">Phí chung cư / Nhà cửa</option>
                        <option value="Tiện ích">Tiện ích</option>
                        <option value="Khác">Khoản khác</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Ghi chú (Mã KH, Số TK...)
                      </label>
                      <input
                        type="text"
                        placeholder="VD: Mã KH điện PD1200..."
                        value={expNote}
                        onChange={(e) => setExpNote(e.target.value)}
                        className="input-3d"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    {editingExpenseId && (
                      <button
                        type="button"
                        onClick={resetExpenseForm}
                        className="btn-3d bg-white text-slate-700 border-slate-300 px-4 py-2.5 text-sm"
                      >
                        Hủy
                      </button>
                    )}
                    <button
                      type="submit"
                      className="btn-3d bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 text-sm"
                    >
                      {editingExpenseId
                        ? "Cập Nhật Khoản Đóng"
                        : "Lưu Khoản Đóng Định Kỳ"}
                    </button>
                  </div>
                </form>
              )}

              {/* Danh sách thẻ Khoản đóng */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredExpenses.map((exp) => {
                  const cycleBadge =
                    exp.cycle === "monthly"
                      ? {
                          text: "Định kỳ tháng",
                          bg: "bg-sky-50 text-sky-800 border-sky-200",
                          dueText: `Ngày ${exp.dueDay} hàng tháng`,
                        }
                      : {
                          text: "Định kỳ năm",
                          bg: "bg-amber-50 text-amber-900 border-amber-200",
                          dueText: `Ngày ${exp.dueDay}/${exp.dueMonth} hàng năm`,
                        };

                  return (
                    <div
                      key={exp.id}
                      className={`card-3d-sm p-4 md:p-5 flex flex-col justify-between gap-3.5 ${
                        exp.isPaid
                          ? "bg-emerald-50/40 border-emerald-200/90"
                          : "bg-white"
                      }`}
                    >
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`badge-3d px-2.5 py-0.5 text-xs ${cycleBadge.bg}`}
                            >
                              {cycleBadge.text}
                            </span>
                            <span className="badge-3d px-2.5 py-0.5 text-xs bg-slate-100 text-slate-700 border-slate-200">
                              {exp.category}
                            </span>
                          </div>
                          <span
                            className={`badge-3d px-3 py-0.5 text-xs ${
                              exp.isPaid
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {exp.isPaid ? (
                              <>
                                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Đã đóng</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Chưa đóng</span>
                              </>
                            )}
                          </span>
                        </div>

                        <h3 className="text-base md:text-lg font-bold text-slate-900">
                          {exp.title}
                        </h3>
                        <div className="text-2xl font-extrabold text-blue-600 mt-1 tabular-nums">
                          {formatVND(exp.amount)}
                        </div>
                        <div className="text-xs font-medium text-slate-600 mt-1.5 flex items-center gap-1.5 tabular-nums">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                          <span>
                            Hạn đóng: {cycleBadge.dueText} • Kỳ:{" "}
                            <span className="font-bold text-slate-800">{exp.periodKey}</span>
                          </span>
                        </div>
                        {exp.note && (
                          <div className="text-xs font-medium text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-start gap-1.5">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
                            <span>{exp.note}</span>
                          </div>
                        )}
                        {exp.isPaid && exp.payment && (
                          <div className="mt-2.5 text-xs font-semibold text-emerald-900 bg-emerald-100/70 px-3 py-2 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                            <span>
                              Đã đóng bởi: <strong>{exp.payment.paidByName}</strong> (Kỳ{" "}
                              {exp.periodKey})
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200/80">
                        <button
                          type="button"
                          onClick={() => handleTogglePay(exp)}
                          className={`btn-3d flex-1 py-2 px-3 text-xs md:text-sm ${
                            exp.isPaid
                              ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                          <span>
                            {exp.isPaid
                              ? "Hoàn tác (Chưa đóng)"
                              : "Đánh dấu Đã đóng"}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setHistoryModalExpense(exp)}
                          aria-label={`Lịch sử đóng ${exp.title}`}
                          className="btn-3d bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200 py-2 px-3 text-xs tabular-nums"
                          title="Lịch sử các kỳ đã đóng"
                        >
                          <History className="w-4 h-4" aria-hidden="true" />
                          <span>({exp.history.length})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => startEditExpense(exp)}
                          aria-label={`Sửa ${exp.title}`}
                          className="btn-3d bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border-slate-200 py-2 px-3 text-xs"
                          title="Sửa khoản đóng"
                        >
                          <Pencil className="w-4 h-4" aria-hidden="true" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteItem("expenses", exp.id)}
                          aria-label={`Xóa ${exp.title}`}
                          className="btn-3d bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border-slate-200 py-2 px-3 text-xs"
                          title="Xóa khoản đóng"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* KHU VỰC CÁC KHOẢN THU (THÁNG / NĂM) */}
            <div className="card-3d p-5 md:p-6 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-slate-900">
                    Các khoản thu gia đình (Tháng / Năm)
                  </h2>
                  <p className="text-xs md:text-sm font-medium text-slate-600 mt-0.5">
                    Quản lý nguồn thu nhập hàng tháng và các khoản thưởng/thu nhập hàng năm
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (showIncomeForm && editingIncomeId) {
                      resetIncomeForm();
                    } else {
                      setEditingIncomeId(null);
                      setShowIncomeForm(!showIncomeForm);
                    }
                  }}
                  className="btn-3d bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-sm"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>Thêm Khoản Thu</span>
                </button>
              </div>

              {showIncomeForm && (
                <form
                  onSubmit={handleCreateIncome}
                  className="card-3d-sm bg-emerald-50/60 border-emerald-200 p-4 md:p-5 mb-6 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      {editingIncomeId ? (
                        <>
                          <Pencil className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                          <span>Chỉnh sửa khoản thu</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                          <span>Thêm khoản thu mới (Tháng / Năm)</span>
                        </>
                      )}
                    </h3>
                    <button
                      type="button"
                      onClick={resetIncomeForm}
                      aria-label="Đóng biểu mẫu"
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200/70"
                    >
                      <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Tên khoản thu *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Lương tháng, Thưởng năm..."
                        value={incTitle}
                        onChange={(e) => setIncTitle(e.target.value)}
                        className="input-3d"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Số tiền thu (VNĐ) *
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="VD: 20000000"
                        value={incAmount}
                        onChange={(e) => setIncAmount(e.target.value)}
                        className="input-3d tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Chu kỳ thu
                      </label>
                      <select
                        value={incCycle}
                        onChange={(e) =>
                          setIncCycle(
                            e.target.value as "monthly" | "quarterly" | "yearly"
                          )
                        }
                        className="input-3d"
                      >
                        <option value="monthly">Thu Hàng Tháng</option>
                        <option value="quarterly">Thu Theo Quý</option>
                        <option value="yearly">Thu Hàng Năm</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Thành viên đóng góp
                      </label>
                      <select
                        value={incReceivedBy}
                        onChange={(e) =>
                          setIncReceivedBy(Number(e.target.value))
                        }
                        className="input-3d"
                      >
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.fullName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    {editingIncomeId && (
                      <button
                        type="button"
                        onClick={resetIncomeForm}
                        className="btn-3d bg-white text-slate-700 border-slate-300 px-4 py-2.5 text-sm"
                      >
                        Hủy
                      </button>
                    )}
                    <button
                      type="submit"
                      className="btn-3d bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 text-sm"
                    >
                      {editingIncomeId ? "Cập Nhật Khoản Thu" : "Lưu Khoản Thu"}
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {incomes.map((inc) => (
                  <div
                    key={inc.id}
                    className={`card-3d-sm p-4 md:p-5 flex flex-col justify-between gap-3.5 ${
                      inc.isReceived
                        ? "bg-emerald-50/50 border-emerald-200/90"
                        : "bg-white"
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                        <span
                          className={`badge-3d px-2.5 py-0.5 text-xs ${
                            inc.cycle === "monthly"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : inc.cycle === "quarterly"
                              ? "bg-sky-100 text-sky-800 border-sky-200"
                              : "bg-amber-100 text-amber-900 border-amber-200"
                          }`}
                        >
                          {inc.cycle === "monthly"
                            ? "Thu hàng tháng"
                            : inc.cycle === "quarterly"
                            ? "Thu theo quý"
                            : "Thu hàng năm"}
                        </span>
                        <span
                          className={`badge-3d px-3 py-0.5 text-xs ${
                            inc.isReceived
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {inc.isReceived ? (
                            <>
                              <Check className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Đã thu</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Chưa thu</span>
                            </>
                          )}
                        </span>
                      </div>
                      <h3 className="font-bold text-base md:text-lg text-slate-900">
                        {inc.title}
                      </h3>
                      <div className="text-2xl font-extrabold text-emerald-700 mt-1 tabular-nums">
                        +{formatVND(inc.amount)}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-600 tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                          <span>Người thu: {inc.receivedByName}</span>
                        </span>
                        <span>
                          Kỳ: <strong className="text-slate-800">{inc.periodKey}</strong>
                        </span>
                      </div>
                      {inc.note && (
                        <div className="text-xs font-medium text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-start gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
                          <span>{inc.note}</span>
                        </div>
                      )}
                      {inc.isReceived && inc.receipt && (
                        <div className="mt-2.5 text-xs font-semibold text-emerald-900 bg-emerald-100/70 px-3 py-2 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                          <span>
                            Đã xác nhận thu bởi:{" "}
                            <strong>{inc.receipt.receivedByName}</strong> (Kỳ{" "}
                            {inc.periodKey})
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => handleToggleReceiveIncome(inc)}
                        className={`btn-3d flex-1 py-2 px-3 text-xs md:text-sm ${
                          inc.isReceived
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                        <span>
                          {inc.isReceived
                            ? "Hoàn tác (Chưa thu)"
                            : "Đánh dấu Đã thu"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setHistoryModalIncome(inc)}
                        aria-label={`Lịch sử thu ${inc.title}`}
                        className="btn-3d bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200 py-2 px-3 text-xs tabular-nums"
                        title="Lịch sử các kỳ đã thu"
                      >
                        <History className="w-4 h-4" aria-hidden="true" />
                        <span>({inc.history?.length || 0})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => startEditIncome(inc)}
                        aria-label={`Sửa ${inc.title}`}
                        className="btn-3d bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border-slate-200 py-2 px-3 text-xs"
                        title="Sửa khoản thu"
                      >
                        <Pencil className="w-4 h-4" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteItem("incomes", inc.id)}
                        aria-label={`Xóa ${inc.title}`}
                        className="btn-3d bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border-slate-200 py-2 px-3 text-xs"
                        title="Xóa khoản thu"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            PHÂN HỆ 2: THỜI KHÓA BIỂU, LỊCH HỌC THÊM & LỊCH ĐƯA ĐÓN TRẺ CON
           ===================================================================== */}
        {activeTab === "schedule" && (
          <div className="space-y-6">
            {/* Banner Lịch đưa đón hôm nay */}
            <div className="card-3d p-5 md:p-6 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 text-white border-blue-500/30">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="badge-3d bg-white/15 text-sky-100 border-white/20 px-3 py-0.5 text-xs">
                    <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Lịch đưa đón hôm nay • {DAY_NAMES[todayInfo.isoDay]}</span>
                  </span>
                  <h2 className="text-xl md:text-2xl font-extrabold mt-1.5 text-white">
                    {todaySchedules.length > 0
                      ? `Hôm nay có ${todaySchedules.length} ca học của các con`
                      : "Hôm nay các con không có lịch học đã đăng ký"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (showScheduleForm && editingScheduleId) {
                      resetScheduleForm();
                    } else {
                      setEditingScheduleId(null);
                      setShowScheduleForm(!showScheduleForm);
                    }
                  }}
                  className="btn-3d bg-white hover:bg-blue-50 text-blue-700 border-white px-4 py-2.5 text-sm shadow-md"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>Thêm Ca Học / Lịch Đưa Đón</span>
                </button>
              </div>

              {todaySchedules.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-4">
                  {todaySchedules.map((s) => (
                    <div
                      key={s.id}
                      className="card-3d-sm bg-white text-slate-900 p-4 flex flex-col gap-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                          <GraduationCap className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
                          <span>
                            {s.childName} — {s.subject}
                          </span>
                        </span>
                        <span className="badge-3d bg-amber-50 text-amber-900 border-amber-200 px-2.5 py-0.5 text-xs tabular-nums">
                          {s.startTime} - {s.endTime}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-rose-500 shrink-0" aria-hidden="true" />
                        <span>
                          Địa điểm:{" "}
                          <strong className="text-slate-900">
                            {s.location || "Chưa cập nhật địa điểm"}
                          </strong>
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-xs font-bold flex items-center gap-1.5">
                          <Car className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
                          <span>
                            Đưa đi: <strong className="text-blue-900">{s.dropoffName}</strong>
                          </span>
                        </div>
                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs font-bold flex items-center gap-1.5">
                          <Bike className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
                          <span>
                            Đón về: <strong className="text-rose-900">{s.pickupName}</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form thêm lịch học & đưa đón */}
            {showScheduleForm && (
              <form
                onSubmit={handleCreateSchedule}
                className="card-3d p-5 md:p-6 bg-white space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                    {editingScheduleId ? (
                      <>
                        <Pencil className="w-4 h-4 text-blue-600" aria-hidden="true" />
                        <span>Chỉnh sửa lịch học & phân công đưa đón</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 text-blue-600" aria-hidden="true" />
                        <span>Thêm thời khóa biểu / lịch học thêm & phân công đưa đón</span>
                      </>
                    )}
                  </h3>
                  <button
                    type="button"
                    onClick={resetScheduleForm}
                    aria-label="Đóng biểu mẫu"
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Tên bé *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Bé Minh Khôi"
                      value={schChildName}
                      onChange={(e) => setSchChildName(e.target.value)}
                      className="input-3d"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Môn học / Hoạt động *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Tiếng Anh ILA, Toán thầy Nam..."
                      value={schSubject}
                      onChange={(e) => setSchSubject(e.target.value)}
                      className="input-3d"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Loại lịch học
                    </label>
                    <select
                      value={schType}
                      onChange={(e) =>
                        setSchType(
                          e.target.value as "main" | "extra" | "activity"
                        )
                      }
                      className="input-3d"
                    >
                      <option value="main">Học chính khóa ở trường</option>
                      <option value="extra">Học thêm / Trung tâm</option>
                      <option value="activity">Năng khiếu / Thể thao</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Thứ trong tuần
                    </label>
                    <select
                      value={schDay}
                      onChange={(e) => setSchDay(Number(e.target.value))}
                      className="input-3d"
                    >
                      {Object.entries(DAY_NAMES).map(([k, label]) => (
                        <option key={k} value={Number(k)}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Giờ vào học
                    </label>
                    <input
                      type="time"
                      value={schStart}
                      onChange={(e) => setSchStart(e.target.value)}
                      className="input-3d tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Giờ tan học (đón)
                    </label>
                    <input
                      type="time"
                      value={schEnd}
                      onChange={(e) => setSchEnd(e.target.value)}
                      className="input-3d tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Ai đưa đi?
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Bố Minh"
                      value={schDropoffName}
                      onChange={(e) => setSchDropoffName(e.target.value)}
                      className="input-3d"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Ai đón về?
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Mẹ Lan"
                      value={schPickupName}
                      onChange={(e) => setSchPickupName(e.target.value)}
                      className="input-3d"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Địa điểm học / Phòng học
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Trung tâm ILA - 146 Nguyễn Đình Chiểu"
                      value={schLocation}
                      onChange={(e) => setSchLocation(e.target.value)}
                      className="input-3d"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Tên & SĐT Giáo viên
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Cô Hạnh: 0908.111.222"
                      value={schTeacher}
                      onChange={(e) => setSchTeacher(e.target.value)}
                      className="input-3d"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Ghi chú đồ dùng cần mang
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Mang sách Workbook, áo khoác..."
                      value={schNote}
                      onChange={(e) => setSchNote(e.target.value)}
                      className="input-3d"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  {editingScheduleId && (
                    <button
                      type="button"
                      onClick={resetScheduleForm}
                      className="btn-3d bg-white text-slate-700 border-slate-300 px-4 py-2.5 text-sm"
                    >
                      Hủy
                    </button>
                  )}
                  <button
                    type="submit"
                    className="btn-3d bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 text-sm"
                  >
                    {editingScheduleId
                      ? "Cập Nhật Lịch Học & Đưa Đón"
                      : "Lưu Lịch Học & Đưa Đón"}
                  </button>
                </div>
              </form>
            )}

            {/* Bộ lọc theo Bé & theo Thứ */}
            <div className="card-3d p-5 md:p-6 bg-white space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {["all", ...Array.from(new Set(schedules.map((s) => s.childName)))].map(
                    (name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setScheduleChildFilter(name)}
                        className={`btn-3d px-3.5 py-2 text-xs md:text-sm ${
                          scheduleChildFilter === name
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200"
                        }`}
                      >
                        {name === "all" ? (
                          <>
                            <Users className="w-4 h-4" aria-hidden="true" />
                            <span>Tất cả các con</span>
                          </>
                        ) : (
                          <>
                            <GraduationCap className="w-4 h-4" aria-hidden="true" />
                            <span>{name}</span>
                          </>
                        )}
                      </button>
                    )
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setScheduleDayFilter(0)}
                    className={`btn-3d px-3 py-1.5 text-xs ${
                      scheduleDayFilter === 0
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200"
                    }`}
                  >
                    Cả tuần
                  </button>
                  {Object.entries(DAY_NAMES).map(([dayNum, label]) => (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => setScheduleDayFilter(Number(dayNum))}
                      className={`btn-3d px-3 py-1.5 text-xs ${
                        scheduleDayFilter === Number(dayNum)
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSchedules.map((item) => {
                  const typeBadge =
                    item.scheduleType === "main"
                      ? { label: "Chính khóa", bg: "bg-sky-50 text-sky-800 border-sky-200" }
                      : item.scheduleType === "extra"
                      ? { label: "Học thêm", bg: "bg-amber-50 text-amber-900 border-amber-200" }
                      : { label: "Ngoại khóa / Năng khiếu", bg: "bg-emerald-50 text-emerald-800 border-emerald-200" };

                  return (
                    <div
                      key={item.id}
                      className="card-3d-sm p-4 md:p-5 bg-white flex flex-col justify-between gap-3.5"
                    >
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="badge-3d bg-slate-900 text-white px-3 py-0.5 text-xs">
                              {DAY_NAMES[item.dayOfWeek]}
                            </span>
                            <span
                              className={`badge-3d px-2.5 py-0.5 text-xs ${typeBadge.bg}`}
                            >
                              {typeBadge.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEditSchedule(item)}
                              aria-label={`Sửa lịch học ${item.subject}`}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Sửa lịch học"
                            >
                              <Pencil className="w-4 h-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteItem("schedules", item.id)
                              }
                              aria-label={`Xóa lịch học ${item.subject}`}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Xóa lịch học"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </div>
                        </div>

                        <div className="text-xs font-bold uppercase text-blue-600 flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{item.childName}</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                          {item.subject}
                        </h3>
                        <div className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-1 rounded-lg bg-amber-50 border border-amber-200 font-bold text-xs text-amber-900 tabular-nums">
                          <Clock className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                          <span>
                            {item.startTime} — {item.endTime}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1.5 text-xs font-medium text-slate-700">
                          {item.location && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" aria-hidden="true" />
                              <span>{item.location}</span>
                            </div>
                          )}
                          {item.teacherInfo && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                              <span>GV: {item.teacherInfo}</span>
                            </div>
                          )}
                          {item.note && (
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 mt-1.5 flex items-start gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                              <span>{item.note}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Khối phân công Đưa - Đón nổi bật */}
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/80">
                        <div className="card-3d-sm bg-blue-50/70 border-blue-200/80 p-2.5">
                          <div className="text-[11px] font-bold uppercase text-blue-800 flex items-center gap-1">
                            <Car className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                            <span>Người đưa đi</span>
                          </div>
                          <div className="text-sm font-bold text-slate-900 mt-0.5">
                            {item.dropoffName}
                          </div>
                        </div>
                        <div className="card-3d-sm bg-rose-50/70 border-rose-200/80 p-2.5">
                          <div className="text-[11px] font-bold uppercase text-rose-800 flex items-center gap-1">
                            <Bike className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />
                            <span>Người đón về</span>
                          </div>
                          <div className="text-sm font-bold text-slate-900 mt-0.5">
                            {item.pickupName}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            PHÂN HỆ 3: LỊCH GIỖ & SỰ KIỆN GIA ĐÌNH (THEO LỊCH ÂM / DƯƠNG)
           ===================================================================== */}
        {activeTab === "events" && (
          <div className="space-y-6">
            <div className="card-3d p-5 md:p-6 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-slate-900">
                    Lịch giỗ & Sự kiện riêng của gia đình (Âm lịch & Dương lịch)
                  </h2>
                  <p className="text-xs md:text-sm font-medium text-slate-600 mt-0.5">
                    Tự động quy đổi ngày Âm lịch sang ngày Dương lịch của năm hiện tại và đếm ngược
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (showEventForm && editingEventId) {
                      resetEventForm();
                    } else {
                      setEditingEventId(null);
                      setShowEventForm(!showEventForm);
                    }
                  }}
                  className="btn-3d bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 text-sm"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>Thêm Lịch Giỗ / Sự Kiện</span>
                </button>
              </div>

              {showEventForm && (
                <form
                  onSubmit={handleCreateEvent}
                  className="card-3d-sm bg-rose-50/50 border-rose-200 p-4 md:p-5 mb-6 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      {editingEventId ? (
                        <>
                          <Pencil className="w-4 h-4 text-rose-600" aria-hidden="true" />
                          <span>Chỉnh sửa ngày giỗ hoặc sự kiện gia đình</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 text-rose-600" aria-hidden="true" />
                          <span>Thêm ngày giỗ hoặc sự kiện gia đình</span>
                        </>
                      )}
                    </h3>
                    <button
                      type="button"
                      onClick={resetEventForm}
                      aria-label="Đóng biểu mẫu"
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200/70"
                    >
                      <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Tên ngày giỗ / sự kiện *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Giỗ Ông Nội, Sinh nhật Mẹ..."
                        value={evTitle}
                        onChange={(e) => setEvTitle(e.target.value)}
                        className="input-3d"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Loại sự kiện
                      </label>
                      <select
                        value={evType}
                        onChange={(e) =>
                          setEvType(
                            e.target.value as
                              | "ancestor"
                              | "birthday"
                              | "anniversary"
                              | "holiday"
                              | "other"
                          )
                        }
                        className="input-3d"
                      >
                        <option value="ancestor">Lịch Giỗ Gia Tiên</option>
                        <option value="birthday">Sinh nhật Thành viên</option>
                        <option value="anniversary">Kỷ niệm Gia đình</option>
                        <option value="holiday">Lễ Tết / Họp họ</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Tính theo lịch nào? *
                      </label>
                      <select
                        value={evCalType}
                        onChange={(e) =>
                          setEvCalType(e.target.value as "lunar" | "solar")
                        }
                        className="input-3d"
                      >
                        <option value="lunar">Theo Âm Lịch (Tự quy ra Dương)</option>
                        <option value="solar">Theo Dương Lịch</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Ngày (1-30/31) *
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          value={evDay}
                          onChange={(e) => setEvDay(Number(e.target.value))}
                          className="input-3d tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Tháng (1-12) *
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={12}
                          value={evMonth}
                          onChange={(e) => setEvMonth(Number(e.target.value))}
                          className="input-3d tabular-nums"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Nhắc trước bao nhiêu ngày?
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={evRemind}
                        onChange={(e) => setEvRemind(Number(e.target.value))}
                        className="input-3d tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Ghi chú chuẩn bị cỗ / lễ vật
                      </label>
                      <input
                        type="text"
                        placeholder="VD: Mua hoa sen, đặt cỗ, về quê..."
                        value={evNote}
                        onChange={(e) => setEvNote(e.target.value)}
                        className="input-3d"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    {editingEventId && (
                      <button
                        type="button"
                        onClick={resetEventForm}
                        className="btn-3d bg-white text-slate-700 border-slate-300 px-4 py-2.5 text-sm"
                      >
                        Hủy
                      </button>
                    )}
                    <button
                      type="submit"
                      className="btn-3d bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 text-sm"
                    >
                      {editingEventId
                        ? "Cập Nhật Lịch Giỗ / Sự Kiện"
                        : "Lưu Lịch Giỗ / Sự Kiện"}
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.map((ev) => {
                  const isAncestor = ev.eventType === "ancestor";
                  return (
                    <div
                      key={ev.id}
                      className={`card-3d-sm p-5 flex flex-col justify-between gap-3.5 ${
                        ev.isUpcomingSoon
                          ? "bg-amber-50/40 border-amber-200/90"
                          : "bg-white"
                      }`}
                    >
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                          <span
                            className={`badge-3d px-3 py-0.5 text-xs tabular-nums ${
                              ev.calendarType === "lunar"
                                ? "bg-amber-100 text-amber-900 border-amber-200"
                                : "bg-sky-100 text-sky-900 border-sky-200"
                            }`}
                          >
                            {ev.calendarType === "lunar" ? (
                              <>
                                <Moon className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />
                                <span>
                                  Âm lịch: {String(ev.day).padStart(2, "0")}/
                                  {String(ev.month).padStart(2, "0")}
                                </span>
                              </>
                            ) : (
                              <>
                                <Sun className="w-3.5 h-3.5 text-sky-700" aria-hidden="true" />
                                <span>
                                  Dương lịch: {String(ev.day).padStart(2, "0")}/
                                  {String(ev.month).padStart(2, "0")}
                                </span>
                              </>
                            )}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <span
                              className={`badge-3d px-3 py-1 text-xs tabular-nums ${
                                ev.daysUntil === 0
                                  ? "bg-rose-600 text-white border-rose-600"
                                  : ev.daysUntil <= 14
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>
                                {ev.daysUntil === 0
                                  ? "Hôm nay!"
                                  : `Còn ${ev.daysUntil} ngày nữa`}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => startEditEvent(ev)}
                              aria-label={`Sửa sự kiện ${ev.title}`}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Sửa sự kiện"
                            >
                              <Pencil className="w-4 h-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem("events", ev.id)}
                              aria-label={`Xóa sự kiện ${ev.title}`}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Xóa sự kiện"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </div>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          {isAncestor ? (
                            <Flame className="w-5 h-5 text-amber-600 shrink-0" aria-hidden="true" />
                          ) : (
                            <Sparkles className="w-5 h-5 text-rose-500 shrink-0" aria-hidden="true" />
                          )}
                          <span>{ev.title}</span>
                        </h3>

                        <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs md:text-sm font-semibold tabular-nums">
                          <div className="text-blue-700 flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
                            <span>
                              Ngày Dương lịch năm nay:{" "}
                              <strong className="font-extrabold underline decoration-blue-300">
                                {ev.solarDateStr}
                              </strong>
                            </span>
                          </div>
                          <div className="text-slate-600 flex items-center gap-1.5">
                            <Moon className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
                            <span>Đối chiếu Âm lịch: {ev.lunarDisplay}</span>
                          </div>
                        </div>

                        {ev.note && (
                          <div className="text-xs font-medium text-amber-950 mt-2.5 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/80 flex items-start gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                            <span>Chuẩn bị: {ev.note}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            PHÂN HỆ 4: KHO TÀI KHOẢN DÙNG CHUNG & GIẤY TỜ CÁ NHÂN
           ===================================================================== */}
        {activeTab === "vault" && (
          <div className="space-y-6">
            {/* Chuyển đổi giữa Kho Tài khoản & Hồ sơ Giấy tờ */}
            <div className="card-3d p-4 bg-white flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => setVaultSubTab("accounts")}
                  className={`btn-3d px-4 py-2.5 text-sm ${
                    vaultSubTab === "accounts"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200"
                  }`}
                >
                  <KeyRound className="w-4 h-4" aria-hidden="true" />
                  <span>
                    Kho Tài Khoản (Lớp học, Cuộc thi...) ({accounts.length})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setVaultSubTab("documents")}
                  className={`btn-3d px-4 py-2.5 text-sm ${
                    vaultSubTab === "documents"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200"
                  }`}
                >
                  <FileBadge className="w-4 h-4" aria-hidden="true" />
                  <span>
                    Giấy Tờ Cá Nhân (Khai sinh, BHYT, CCCD...) ({documents.length})
                  </span>
                </button>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="text"
                  aria-label="Tìm nhanh tài khoản hoặc mã thẻ"
                  placeholder="Tìm nhanh tài khoản, mã thẻ..."
                  value={vaultSearch}
                  onChange={(e) => setVaultSearch(e.target.value)}
                  className="input-3d pl-9 py-2 text-sm"
                />
              </div>
            </div>

            {/* SUB-TAB 1: KHO TÀI KHOẢN DÙNG CHUNG */}
            {vaultSubTab === "accounts" && (
              <div className="card-3d p-5 md:p-6 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-slate-900">
                      Kho tài khoản dùng chung trong gia đình
                    </h2>
                    <p className="text-xs md:text-sm font-medium text-slate-600 mt-0.5">
                      Lưu trữ User/Password các lớp học, cuộc thi (Violympic, IOE, Trạng Nguyên), Wifi...
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (showAccountForm && editingAccountId) {
                        resetAccountForm();
                      } else {
                        setEditingAccountId(null);
                        setShowAccountForm(!showAccountForm);
                      }
                    }}
                    className="btn-3d bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-sm"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    <span>Thêm Tài Khoản Mới</span>
                  </button>
                </div>

                {/* Bộ lọc danh mục tài khoản */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {[
                    { id: "all", label: "Tất cả", icon: null },
                    { id: "contest", label: "Cuộc thi (Violympic, IOE...)", icon: Trophy },
                    { id: "class", label: "Lớp học & Sổ liên lạc", icon: School },
                    { id: "utility", label: "Tiện ích nhà (Wifi, Điện...)", icon: Zap },
                  ].map((c) => {
                    const CatIcon = c.icon;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setAccountCategoryFilter(c.id)}
                        className={`btn-3d px-3.5 py-2 text-xs ${
                          accountCategoryFilter === c.id
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200"
                        }`}
                      >
                        {CatIcon && <CatIcon className="w-3.5 h-3.5" aria-hidden="true" />}
                        <span>{c.label}</span>
                      </button>
                    );
                  })}
                </div>

                {showAccountForm && (
                  <form
                    onSubmit={handleCreateAccount}
                    className="card-3d-sm bg-slate-50 border-blue-200 p-4 md:p-5 mb-6 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                        {editingAccountId ? (
                          <>
                            <Pencil className="w-4 h-4 text-blue-600" aria-hidden="true" />
                            <span>Chỉnh sửa tài khoản dùng chung</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 text-blue-600" aria-hidden="true" />
                            <span>Thêm tài khoản lớp học / cuộc thi / tiện ích</span>
                          </>
                        )}
                      </h3>
                      <button
                        type="button"
                        onClick={resetAccountForm}
                        aria-label="Đóng biểu mẫu"
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200/70"
                      >
                        <X className="w-5 h-5" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Tên tài khoản / cuộc thi *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="VD: Violympic Toán, IOE, Zoom Lớp 5A..."
                          value={accTitle}
                          onChange={(e) => setAccTitle(e.target.value)}
                          className="input-3d"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Phân loại
                        </label>
                        <select
                          value={accCategory}
                          onChange={(e) =>
                            setAccCategory(
                              e.target.value as
                                | "class"
                                | "contest"
                                | "utility"
                                | "entertainment"
                                | "other"
                            )
                          }
                          className="input-3d"
                        >
                          <option value="contest">Tài khoản Cuộc thi</option>
                          <option value="class">Tài khoản Lớp học</option>
                          <option value="utility">Tiện ích Gia đình</option>
                          <option value="other">Khác</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Của thành viên nào?
                        </label>
                        <input
                          type="text"
                          placeholder="VD: Bé Minh Khôi, Bé Bảo An, Cả nhà..."
                          value={accOwner}
                          onChange={(e) => setAccOwner(e.target.value)}
                          className="input-3d"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Tên đăng nhập (Username / ID) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Nhập username..."
                          value={accUser}
                          onChange={(e) => setAccUser(e.target.value)}
                          className="input-3d"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Mật khẩu (Password) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Nhập mật khẩu..."
                          value={accPass}
                          onChange={(e) => setAccPass(e.target.value)}
                          className="input-3d"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Trang web / Link đăng nhập
                        </label>
                        <input
                          type="text"
                          placeholder="VD: https://violympic.vn"
                          value={accUrl}
                          onChange={(e) => setAccUrl(e.target.value)}
                          className="input-3d"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Ghi chú (Mã học sinh, SBD, SĐT đăng ký...)
                      </label>
                      <input
                        type="text"
                        placeholder="VD: ID học sinh: 8829102 - Trường Tiểu học..."
                        value={accNote}
                        onChange={(e) => setAccNote(e.target.value)}
                        className="input-3d"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      {editingAccountId && (
                        <button
                          type="button"
                          onClick={resetAccountForm}
                          className="btn-3d bg-white text-slate-700 border-slate-300 px-5 py-2.5 text-sm"
                        >
                          Hủy
                        </button>
                      )}
                      <button
                        type="submit"
                        className="btn-3d bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 text-sm"
                      >
                        {editingAccountId
                          ? "Lưu Thay Đổi"
                          : "Lưu Vào Kho Tài Khoản"}
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredAccounts.map((acc) => {
                    const showPass = Boolean(visiblePasswords[acc.id]);
                    return (
                      <div
                        key={acc.id}
                        className="card-3d-sm p-4 md:p-5 bg-white flex flex-col justify-between gap-3.5"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2.5">
                            <span className="badge-3d bg-blue-50 text-blue-800 border-blue-200 px-3 py-0.5 text-xs">
                              <User className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                              <span>{acc.ownerName}</span>
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => startEditAccount(acc)}
                                aria-label={`Sửa tài khoản ${acc.title}`}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Sửa tài khoản"
                              >
                                <Pencil className="w-4 h-4" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteItem("accounts", acc.id)
                                }
                                aria-label={`Xóa tài khoản ${acc.title}`}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Xóa tài khoản"
                              >
                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                              </button>
                            </div>
                          </div>

                          <h3 className="text-lg font-bold text-slate-900">
                            {acc.title}
                          </h3>
                          {acc.platformUrl && (
                            <div className="text-xs font-medium text-blue-600 truncate mt-0.5 flex items-center gap-1">
                              <Link2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              <span className="truncate">{acc.platformUrl}</span>
                            </div>
                          )}

                          {/* Khối Copy nhanh Username & Password */}
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                  Tên đăng nhập / User
                                </div>
                                <div className="font-bold text-sm text-slate-900 select-all">
                                  {acc.accountUsername}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  copyToClipboard(
                                    acc.accountUsername,
                                    `u-${acc.id}`
                                  )
                                }
                                className="btn-3d bg-white hover:bg-slate-50 text-slate-700 border-slate-200 px-3 py-1.5 text-xs"
                              >
                                {copiedKey === `u-${acc.id}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                                    <span>Đã chép</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>Chép</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <div className="flex items-center justify-between bg-amber-50/70 border border-amber-200/80 rounded-xl px-3.5 py-2.5">
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                                  Mật khẩu / Password
                                </div>
                                <div className="font-bold text-sm text-slate-900 select-all tabular-nums">
                                  {showPass
                                    ? acc.accountPassword
                                    : "••••••••••"}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  aria-label={showPass ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                  aria-pressed={showPass}
                                  onClick={() =>
                                    setVisiblePasswords((p) => ({
                                      ...p,
                                      [acc.id]: !p[acc.id],
                                    }))
                                  }
                                  className="btn-3d bg-white hover:bg-slate-50 text-slate-700 border-slate-200 px-2.5 py-1.5 text-xs"
                                  title="Hiện/Ẩn mật khẩu"
                                >
                                  {showPass ? (
                                    <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                                  ) : (
                                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyToClipboard(
                                      acc.accountPassword,
                                      `p-${acc.id}`
                                    )
                                  }
                                  className="btn-3d bg-white hover:bg-slate-50 text-slate-700 border-slate-200 px-3 py-1.5 text-xs"
                                >
                                  {copiedKey === `p-${acc.id}` ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                                      <span>Đã chép</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                                      <span>Chép</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          {acc.note && (
                            <div className="text-xs font-medium text-slate-600 mt-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-start gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                              <span>{acc.note}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SUB-TAB 2: HỒ SƠ GIẤY TỜ CÁ NHÂN (GIẤY KHAI SINH, THẺ BHYT, CCCD...) */}
            {vaultSubTab === "documents" && (
              <div className="card-3d p-5 md:p-6 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-slate-900">
                      Hồ sơ giấy tờ cá nhân của các thành viên
                    </h2>
                    <p className="text-xs md:text-sm font-medium text-slate-600 mt-0.5">
                      Tra cứu nhanh Giấy khai sinh, Mã thẻ BHYT, CCCD, Hộ chiếu kèm ảnh chụp
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (showDocForm && editingDocId) {
                        resetDocumentForm();
                      } else {
                        setEditingDocId(null);
                        setShowDocForm(!showDocForm);
                      }
                    }}
                    className="btn-3d bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-sm"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    <span>Thêm Giấy Tờ Cá Nhân</span>
                  </button>
                </div>

                {/* Lọc theo thành viên */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {[
                    "all",
                    ...Array.from(new Set(documents.map((d) => d.holderName))),
                  ].map((holder) => (
                    <button
                      key={holder}
                      type="button"
                      onClick={() => setDocHolderFilter(holder)}
                      className={`btn-3d px-3.5 py-2 text-xs ${
                        docHolderFilter === holder
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200"
                      }`}
                    >
                      {holder === "all" ? (
                        <span>Tất cả thành viên</span>
                      ) : (
                        <>
                          <User className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{holder}</span>
                        </>
                      )}
                    </button>
                  ))}
                </div>

                {showDocForm && (
                  <form
                    onSubmit={handleCreateDocument}
                    className="card-3d-sm bg-slate-50 border-blue-200 p-4 md:p-5 mb-6 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                        {editingDocId ? (
                          <>
                            <Pencil className="w-4 h-4 text-blue-600" aria-hidden="true" />
                            <span>Chỉnh sửa hồ sơ giấy tờ cá nhân</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 text-blue-600" aria-hidden="true" />
                            <span>Thêm giấy tờ cá nhân mới (có thể đính kèm ảnh chụp)</span>
                          </>
                        )}
                      </h3>
                      <button
                        type="button"
                        onClick={resetDocumentForm}
                        aria-label="Đóng biểu mẫu"
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200/70"
                      >
                        <X className="w-5 h-5" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Tên giấy tờ *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="VD: Giấy khai sinh, Thẻ BHYT..."
                          value={docTitle}
                          onChange={(e) => setDocTitle(e.target.value)}
                          className="input-3d"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Loại giấy tờ
                        </label>
                        <select
                          value={docType}
                          onChange={(e) =>
                            setDocType(
                              e.target.value as
                                | "birth_cert"
                                | "health_ins"
                                | "id_card"
                                | "passport"
                                | "school"
                                | "other"
                            )
                          }
                          className="input-3d"
                        >
                          <option value="birth_cert">Giấy khai sinh</option>
                          <option value="health_ins">Thẻ Bảo hiểm Y tế</option>
                          <option value="id_card">Căn cước công dân / Định danh</option>
                          <option value="passport">Hộ chiếu (Passport)</option>
                          <option value="school">Hồ sơ học bạ / Chứng chỉ</option>
                          <option value="other">Giấy tờ khác</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Của thành viên nào? *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="VD: Bé Minh Khôi, Bố Minh..."
                          value={docHolder}
                          onChange={(e) => setDocHolder(e.target.value)}
                          className="input-3d"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Số giấy tờ / Mã số thẻ (Tùy chọn)
                        </label>
                        <input
                          type="text"
                          placeholder="VD: HS4797938291... (Có thể bỏ trống)"
                          value={docNumber}
                          onChange={(e) => setDocNumber(e.target.value)}
                          className="input-3d tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Ngày cấp
                        </label>
                        <input
                          type="text"
                          placeholder="VD: 15/05/2016"
                          value={docIssueDate}
                          onChange={(e) => setDocIssueDate(e.target.value)}
                          className="input-3d tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Hạn sử dụng (nếu có)
                        </label>
                        <input
                          type="text"
                          placeholder="VD: 31/12/2026 hoặc Vĩnh viễn"
                          value={docExpiryDate}
                          onChange={(e) => setDocExpiryDate(e.target.value)}
                          className="input-3d"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Nơi cấp / Nơi ĐK khám chữa bệnh
                        </label>
                        <input
                          type="text"
                          placeholder="VD: BV Nhi Đồng 2 / UBND Phường..."
                          value={docIssuePlace}
                          onChange={(e) => setDocIssuePlace(e.target.value)}
                          className="input-3d"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                          <span>Ảnh mặt trước (JPG, PNG, .HEIC)</span>
                        </label>
                        <input
                          type="file"
                          accept="image/*,.heic,.heif"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              setDocFormError("");
                              setDocImgLoading(true);
                              try {
                                const dataUrl = await compressImageFile(f);
                                setDocFrontImg(dataUrl);
                              } catch (err) {
                                setDocFormError(
                                  err instanceof Error
                                    ? err.message
                                    : "Không thể xử lý ảnh mặt trước."
                                );
                              } finally {
                                setDocImgLoading(false);
                              }
                            }
                          }}
                          className="input-3d text-xs"
                        />
                        {docFrontImg && (
                          <div className="mt-2 relative inline-block">
                            <img
                              src={docFrontImg}
                              alt="Xem trước mặt trước"
                              className="h-24 w-auto rounded-xl border border-slate-200 object-cover shadow-xs"
                            />
                            <button
                              type="button"
                              onClick={() => setDocFrontImg("")}
                              className="badge-3d bg-rose-600 text-white px-2.5 py-0.5 text-[10px] mt-1 cursor-pointer"
                            >
                              Xóa ảnh mặt trước
                            </button>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                          <span>Ảnh mặt sau (JPG, PNG, .HEIC)</span>
                        </label>
                        <input
                          type="file"
                          accept="image/*,.heic,.heif"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              setDocFormError("");
                              setDocImgLoading(true);
                              try {
                                const dataUrl = await compressImageFile(f);
                                setDocBackImg(dataUrl);
                              } catch (err) {
                                setDocFormError(
                                  err instanceof Error
                                    ? err.message
                                    : "Không thể xử lý ảnh mặt sau."
                                );
                              } finally {
                                setDocImgLoading(false);
                              }
                            }
                          }}
                          className="input-3d text-xs"
                        />
                        {docBackImg && (
                          <div className="mt-2 relative inline-block">
                            <img
                              src={docBackImg}
                              alt="Xem trước mặt sau"
                              className="h-24 w-auto rounded-xl border border-slate-200 object-cover shadow-xs"
                            />
                            <button
                              type="button"
                              onClick={() => setDocBackImg("")}
                              className="badge-3d bg-rose-600 text-white px-2.5 py-0.5 text-[10px] mt-1 cursor-pointer"
                            >
                              Xóa ảnh mặt sau
                            </button>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Ghi chú vị trí cất giữ bản gốc
                        </label>
                        <input
                          type="text"
                          placeholder="VD: Cất ở ngăn tủ số 1, bìa xanh..."
                          value={docNote}
                          onChange={(e) => setDocNote(e.target.value)}
                          className="input-3d"
                        />
                      </div>
                    </div>

                    {docImgLoading && (
                      <div className="card-3d-sm bg-sky-50 border-sky-200 p-3 text-xs font-semibold text-sky-900 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-sky-600 shrink-0" aria-hidden="true" />
                        <span>
                          Đang chuyển đổi & nén ảnh (hỗ trợ cả định dạng .HEIC)... Vui lòng đợi trong giây lát!
                        </span>
                      </div>
                    )}

                    {docFormError && (
                      <div
                        role="alert"
                        className="card-3d-sm bg-rose-50 border-rose-200 p-3 text-xs font-semibold text-rose-800 flex items-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
                        <span>{docFormError}</span>
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      {editingDocId && (
                        <button
                          type="button"
                          onClick={resetDocumentForm}
                          className="btn-3d bg-white text-slate-700 border-slate-300 px-5 py-2.5 text-sm"
                        >
                          Hủy
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={docImgLoading}
                        className="btn-3d bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 text-sm disabled:opacity-50"
                      >
                        {docImgLoading
                          ? "Đang xử lý ảnh..."
                          : editingDocId
                          ? "Lưu Thay Đổi"
                          : "Lưu Hồ Sơ Giấy Tờ"}
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="card-3d-sm p-4 md:p-5 bg-white flex flex-col justify-between gap-3.5"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <span className="badge-3d bg-amber-50 text-amber-900 border-amber-200 px-3 py-0.5 text-xs">
                            <User className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                            <span>{doc.holderName}</span>
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEditDocument(doc)}
                              aria-label={`Sửa giấy tờ ${doc.title}`}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Sửa giấy tờ"
                            >
                              <Pencil className="w-4 h-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteItem("documents", doc.id)
                              }
                              aria-label={`Xóa giấy tờ ${doc.title}`}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Xóa giấy tờ"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </div>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900">
                          {doc.title}
                        </h3>

                        <div className="mt-2.5 flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              Số giấy tờ / Mã số thẻ
                            </div>
                            <div className="font-bold text-base text-blue-700 select-all tabular-nums">
                              {doc.docNumber || "Chưa cập nhật"}
                            </div>
                          </div>
                          {doc.docNumber && (
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(doc.docNumber, `doc-${doc.id}`)
                              }
                              className="btn-3d bg-white hover:bg-slate-50 text-slate-700 border-slate-200 px-3 py-1.5 text-xs"
                            >
                              {copiedKey === `doc-${doc.id}` ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                                  <span>Đã chép</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Chép số</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-medium text-slate-700 tabular-nums">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                            <span>Ngày cấp: {doc.issueDate || "—"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                            <span>Hạn dùng: {doc.expiryDate || "—"}</span>
                          </div>
                          <div className="col-span-2 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                            <span>Nơi cấp / KCB: {doc.issuePlace || "—"}</span>
                          </div>
                        </div>

                        {doc.note && (
                          <div className="text-xs font-medium text-slate-600 mt-2.5 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/80 flex items-start gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                            <span>{doc.note}</span>
                          </div>
                        )}
                      </div>

                      {(doc.frontImage || doc.backImage) && (
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className="btn-3d bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 py-2 text-xs w-full"
                        >
                          <ImageIcon className="w-4 h-4" aria-hidden="true" />
                          <span>Xem Ảnh Chụp Giấy Tờ Đính Kèm</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            PHÂN HỆ 5: QUẢN LÝ THÀNH VIÊN GIA ĐÌNH & TRẠNG THÁI HỆ THỐNG
           ===================================================================== */}
        {activeTab === "members" && (
          <div className="space-y-6">
            <div className="card-3d p-5 md:p-6 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-slate-900">
                    Danh sách thành viên trong gia đình
                  </h2>
                  <p className="text-xs md:text-sm font-medium text-slate-600 mt-0.5">
                    {currentUser?.isAdmin
                      ? "Bạn đang đăng nhập với quyền Quản trị viên (Admin) — có thể tạo và quản lý tài khoản cho các thành viên gia đình."
                      : "Danh sách thành viên gia đình. Chỉ Quản trị viên (Admin: Bố Minh) mới có quyền tạo hoặc xóa tài khoản."}
                  </p>
                </div>
                {currentUser?.isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMemberId(null);
                      setShowMemberForm(!showMemberForm);
                      setMemberError("");
                      setMemberSuccess("");
                    }}
                    className="btn-3d bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-sm"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    <span>Tạo Thành Viên Mới (Admin)</span>
                  </button>
                )}
              </div>

              {!currentUser?.isAdmin && (
                <div className="card-3d-sm bg-amber-50/80 border-amber-200 p-4 mb-5 text-xs font-medium text-slate-800 flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    Để đảm bảo bảo mật gia đình, tính năng tự tạo tài khoản đã được khóa. Chỉ tài khoản Quản trị viên (
                    <strong className="underline">Bố Minh - @bominh</strong>) mới có quyền cấp tài khoản mới. Bạn có thể tự sửa thông tin hoặc đổi mật khẩu tài khoản của mình bên dưới.
                  </div>
                </div>
              )}

              {memberError && (
                <div
                  role="alert"
                  className="card-3d-sm bg-rose-50 border-rose-200 p-3.5 mb-5 text-rose-800 font-semibold text-sm flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
                  <span>{memberError}</span>
                </div>
              )}

              {memberSuccess && (
                <div
                  role="status"
                  className="card-3d-sm bg-emerald-50 border-emerald-200 p-3.5 mb-5 text-emerald-900 font-semibold text-sm flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                  <span>{memberSuccess}</span>
                </div>
              )}

              {currentUser?.isAdmin && showMemberForm && (
                <form
                  onSubmit={handleCreateMember}
                  className="card-3d-sm bg-slate-50 border-blue-200 p-4 md:p-5 mb-6 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <Plus className="w-4 h-4 text-blue-600" aria-hidden="true" />
                      <span>Cấp tài khoản mới cho thành viên gia đình (Quyền Admin)</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowMemberForm(false)}
                      aria-label="Đóng biểu mẫu"
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200/70"
                    >
                      <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Tên hiển thị *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Mẹ Lan, Bé Minh Khôi, Ông Nội..."
                        value={memFullName}
                        onChange={(e) => setMemFullName(e.target.value)}
                        className="input-3d"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Tên đăng nhập (viết liền) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: melan, minhkhoi, baoan..."
                        value={memUsername}
                        onChange={(e) => setMemUsername(e.target.value)}
                        className="input-3d"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Vai trò trong nhà
                      </label>
                      <input
                        type="text"
                        placeholder="VD: Mẹ, Con trai, Ông Nội..."
                        value={memRole}
                        onChange={(e) => setMemRole(e.target.value)}
                        className="input-3d"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Mật khẩu khởi tạo *
                      </label>
                      <input
                        type="text"
                        required
                        value={memPassword}
                        onChange={(e) => setMemPassword(e.target.value)}
                        className="input-3d"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Màu đại diện:
                      </span>
                      {[
                        "#2563EB",
                        "#E11D48",
                        "#10B981",
                        "#F59E0B",
                        "#7C3AED",
                        "#0D9488",
                      ].map((color) => (
                        <button
                          key={color}
                          type="button"
                          aria-label={`Chọn màu ${color}`}
                          onClick={() => setMemColor(color)}
                          className={`w-7 h-7 rounded-full border-2 border-white shadow-xs transition-transform cursor-pointer ${
                            memColor === color
                              ? "scale-125 ring-2 ring-blue-600"
                              : "opacity-75 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <button
                      type="submit"
                      className="btn-3d bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 text-sm"
                    >
                      Tạo Tài Khoản Thành Viên
                    </button>
                  </div>
                </form>
              )}

              {editingMemberId && (
                <form
                  onSubmit={handleUpdateMember}
                  className="card-3d-sm bg-sky-50/70 border-sky-200 p-4 md:p-5 mb-6 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <Pencil className="w-4 h-4 text-blue-600" aria-hidden="true" />
                      <span>Chỉnh sửa thông tin & đổi mật khẩu thành viên</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingMemberId(null)}
                      aria-label="Đóng biểu mẫu"
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200/70"
                    >
                      <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Tên hiển thị *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Bố Minh, Mẹ Lan..."
                        value={editMemFullName}
                        onChange={(e) => setEditMemFullName(e.target.value)}
                        className="input-3d"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Tên đăng nhập (ID) *
                      </label>
                      <input
                        type="text"
                        required
                        disabled={!currentUser?.isAdmin}
                        value={editMemUsername}
                        onChange={(e) => setEditMemUsername(e.target.value)}
                        className="input-3d disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Vai trò trong nhà
                      </label>
                      <input
                        type="text"
                        disabled={!currentUser?.isAdmin}
                        value={editMemRole}
                        onChange={(e) => setEditMemRole(e.target.value)}
                        className="input-3d disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Đổi mật khẩu mới (để trống nếu giữ nguyên)
                      </label>
                      <input
                        type="text"
                        placeholder="Nhập mật khẩu mới nếu muốn đổi..."
                        value={editMemNewPassword}
                        onChange={(e) => setEditMemNewPassword(e.target.value)}
                        className="input-3d"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Màu đại diện:
                      </span>
                      {[
                        "#2563EB",
                        "#E11D48",
                        "#10B981",
                        "#F59E0B",
                        "#7C3AED",
                        "#0D9488",
                      ].map((color) => (
                        <button
                          key={color}
                          type="button"
                          aria-label={`Chọn màu ${color}`}
                          onClick={() => setEditMemColor(color)}
                          className={`w-7 h-7 rounded-full border-2 border-white shadow-xs transition-transform cursor-pointer ${
                            editMemColor === color
                              ? "scale-125 ring-2 ring-blue-600"
                              : "opacity-75 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingMemberId(null)}
                        className="btn-3d bg-white text-slate-700 border-slate-300 px-5 py-2.5 text-sm"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="btn-3d bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 text-sm"
                      >
                        Lưu Cập Nhật / Mật Khẩu
                      </button>
                    </div>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {members.map((m) => {
                  const isMemberAdmin =
                    Boolean(m.isAdmin) || m.username === "bominh";
                  const canEditMember =
                    Boolean(currentUser?.isAdmin) || currentUser?.id === m.id;
                  return (
                    <div
                      key={m.id}
                      className="card-3d-sm p-5 bg-white flex flex-col items-center text-center justify-between gap-3"
                    >
                      <div className="flex flex-col items-center gap-2 w-full">
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center text-white font-extrabold text-2xl shadow-md"
                          style={{ backgroundColor: m.avatarColor }}
                        >
                          {m.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="font-bold text-lg text-slate-900">
                          {m.fullName}
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          <span className="badge-3d bg-slate-100 text-slate-700 border-slate-200 px-3 py-0.5 text-xs">
                            {m.roleLabel}
                          </span>
                          {isMemberAdmin && (
                            <span className="badge-3d bg-amber-100 text-amber-900 border-amber-300 px-2.5 py-0.5 text-xs">
                              <Crown className="w-3 h-3 text-amber-600" aria-hidden="true" />
                              <span>Admin</span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-medium text-slate-500">
                          ID đăng nhập: @{m.username}
                        </div>
                      </div>

                      <div className="w-full pt-3 mt-1 border-t border-slate-200/80 flex flex-col gap-2">
                        {currentUser?.id === m.id && (
                          <div className="badge-3d w-full py-1.5 text-xs bg-emerald-50 text-emerald-800 border-emerald-200 justify-center">
                            <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                            <span>Đang đăng nhập</span>
                          </div>
                        )}
                        {canEditMember && (
                          <button
                            type="button"
                            onClick={() => startEditMember(m)}
                            className="btn-3d w-full py-2 text-xs bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border-slate-200"
                          >
                            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Sửa / Đổi mật khẩu</span>
                          </button>
                        )}
                        {currentUser?.isAdmin &&
                          !isMemberAdmin &&
                          currentUser?.id !== m.id && (
                            <button
                              type="button"
                              onClick={() => handleDeleteItem("members", m.id)}
                              className="btn-3d w-full py-2 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Xóa tài khoản này</span>
                            </button>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Thông tin hạ tầng Vercel + Neon + Android APK */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card-3d p-5 bg-gradient-to-br from-white to-emerald-50/60 border-emerald-200/80">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Database className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      Cơ sở dữ liệu: Neon PostgreSQL & Drizzle ORM
                    </h3>
                    <p className="text-xs font-medium text-slate-600 mt-1 leading-relaxed">
                      Trạng thái hiện tại:{" "}
                      {dbMode === "neon"
                        ? "Đang kết nối trực tiếp Neon Cloud PostgreSQL"
                        : "Đang chạy kho dữ liệu cục bộ (.data/family-db.json) — Gắn DATABASE_URL từ neon.com trên Vercel để tự động đồng bộ 8 bảng đám mây."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card-3d p-5 bg-gradient-to-br from-white to-sky-50/60 border-sky-200/80 flex flex-col justify-between gap-3.5">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      Ứng dụng Android APK (Capacitor Native)
                    </h3>
                    <p className="text-xs font-medium text-slate-600 mt-1">
                      Mã gói: com.giadinh.quanly • Tương thích mọi điện thoại Android trong gia đình.
                    </p>
                  </div>
                </div>
                <a
                  href="/quan-ly-gia-dinh.apk"
                  download="quan-ly-gia-dinh.apk"
                  className="btn-3d bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 text-xs md:text-sm w-full text-center"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  <span>Tải File Cài Đặt Android (quan-ly-gia-dinh.apk)</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL XEM LỊCH SỬ ĐÓNG TIỀN CÁC KỲ */}
      {historyModalExpense && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="history-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="card-3d bg-white w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3
                id="history-modal-title"
                className="text-lg font-bold text-slate-900 flex items-center gap-2"
              >
                <History className="w-5 h-5 text-blue-600" aria-hidden="true" />
                <span>Lịch sử đóng: {historyModalExpense.title}</span>
              </h3>
              <button
                type="button"
                aria-label="Đóng hộp thoại lịch sử"
                onClick={() => setHistoryModalExpense(null)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            {historyModalExpense.history.length === 0 ? (
              <p className="text-sm font-medium text-slate-500 py-6 text-center">
                Chưa có lịch sử thanh toán cho khoản này.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto">
                {historyModalExpense.history.map((h) => (
                  <div
                    key={h.id}
                    className="card-3d-sm p-3.5 bg-emerald-50/60 border-emerald-200 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-900 tabular-nums">
                        Kỳ: {h.periodKey} — {formatVND(h.paidAmount)}
                      </div>
                      <div className="text-xs font-medium text-slate-600">
                        Người đóng: {h.paidByName}
                      </div>
                    </div>
                    <span className="badge-3d bg-emerald-100 text-emerald-800 border-emerald-300 px-2.5 py-0.5 text-xs">
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Đã đóng</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL XEM LỊCH SỬ THU TIỀN CÁC KỲ */}
      {historyModalIncome && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="history-income-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="card-3d bg-white w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3
                id="history-income-modal-title"
                className="text-lg font-bold text-slate-900 flex items-center gap-2"
              >
                <History className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                <span>Lịch sử thu: {historyModalIncome.title}</span>
              </h3>
              <button
                type="button"
                aria-label="Đóng hộp thoại lịch sử thu"
                onClick={() => setHistoryModalIncome(null)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            {!historyModalIncome.history ||
            historyModalIncome.history.length === 0 ? (
              <p className="text-sm font-medium text-slate-500 py-6 text-center">
                Chưa có kỳ nào được đánh dấu đã thu cho khoản này.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto">
                {historyModalIncome.history.map((h) => (
                  <div
                    key={h.id}
                    className="card-3d-sm p-3.5 bg-emerald-50/60 border-emerald-200 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-900 tabular-nums">
                        Kỳ: {h.periodKey} — +{formatVND(h.receivedAmount)}
                      </div>
                      <div className="text-xs font-medium text-slate-600">
                        Người thu: {h.receivedByName}
                      </div>
                    </div>
                    <span className="badge-3d bg-emerald-100 text-emerald-800 border-emerald-300 px-2.5 py-0.5 text-xs">
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Đã thu</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL XEM ẢNH GIẤY TỜ CÁ NHÂN */}
      {previewDoc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-doc-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="card-3d bg-white w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3
                id="preview-doc-title"
                className="text-lg font-bold text-slate-900 flex items-center gap-2"
              >
                <FileBadge className="w-5 h-5 text-blue-600" aria-hidden="true" />
                <span>
                  {previewDoc.title} ({previewDoc.holderName})
                </span>
              </h3>
              <button
                type="button"
                aria-label="Đóng xem trước ảnh"
                onClick={() => setPreviewDoc(null)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-4">
              {previewDoc.frontImage && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Ảnh mặt trước:
                  </div>
                  <img
                    src={previewDoc.frontImage}
                    alt="Mặt trước"
                    className="w-full rounded-xl border border-slate-200"
                  />
                </div>
              )}
              {previewDoc.backImage && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Ảnh mặt sau:
                  </div>
                  <img
                    src={previewDoc.backImage}
                    alt="Mặt sau"
                    className="w-full rounded-xl border border-slate-200"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CÀI ĐẶT THÔNG BÁO NHẮC LỊCH TỰ ĐỘNG (GIỖ • ĐÓNG TIỀN • ĐƯA ĐÓN TRẺ) */}
      {showNotificationModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="notification-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="card-3d bg-white w-full max-w-2xl p-5 md:p-6 max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                  <BellRing className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h3
                    id="notification-modal-title"
                    className="text-base md:text-lg font-extrabold text-slate-900"
                  >
                    Chuông Thông Báo Nhắc Lịch Gia Đình
                  </h3>
                  <p className="text-xs font-medium text-slate-600">
                    Tự động báo trên điện thoại Android cho Lịch đón trẻ, Lịch đóng tiền và Ngày giỗ/lễ
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Đóng cài đặt thông báo"
                onClick={() => setShowNotificationModal(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Trạng thái cấp quyền thông báo trên điện thoại */}
            <div
              className={`card-3d-sm p-4 flex flex-wrap items-center justify-between gap-3 ${
                notifPermission === "granted"
                  ? "bg-emerald-50/80 border-emerald-200"
                  : "bg-amber-50/90 border-amber-300"
              }`}
            >
              <div className="space-y-0.5">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-blue-600" aria-hidden="true" />
                  <span>
                    Quyền thông báo trên thiết bị:{" "}
                    {notifPermission === "granted"
                      ? "ĐÃ KÍCH HOẠT"
                      : "CHƯA CẤP QUYỀN"}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-600">
                  {notifPermission === "granted"
                    ? `Đang đặt hẹn giờ tự động ${upcomingReminders.length} mốc nhắc lịch sắp tới.`
                    : "Bấm nút 'Cấp Quyền Chuông Báo' bên cạnh để ứng dụng được phép đổ chuông nhắc trên điện thoại."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {notifPermission !== "granted" && (
                  <button
                    type="button"
                    onClick={handleEnableNotifications}
                    className="btn-3d bg-blue-600 hover:bg-blue-700 text-white border-blue-600 px-3.5 py-2 text-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    <span>Cấp Quyền Chuông Báo</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleTestNotificationNow}
                  className="btn-3d bg-amber-500 hover:bg-amber-600 text-white border-amber-600 px-3.5 py-2 text-xs"
                >
                  <BellRing className="w-4 h-4" aria-hidden="true" />
                  <span>Bắn thử thông báo ngay</span>
                </button>
              </div>
            </div>

            {notifStatusMsg && (
              <div
                role="status"
                className="card-3d-sm bg-blue-50 border-blue-200 p-3 text-xs font-bold text-blue-900 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
                <span>{notifStatusMsg}</span>
              </div>
            )}

            {/* Bật / Tắt từng nhóm nhắc lịch */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                <div>
                  <div className="font-bold text-sm text-slate-900">
                    Bật tính năng Tự động Nhắc lịch Gia đình
                  </div>
                  <div className="text-xs font-medium text-slate-600">
                    Khi bật, điện thoại sẽ tự động hẹn giờ báo cho 3 mục bên dưới
                  </div>
                </div>
                <input
                  type="checkbox"
                  aria-label="Bật tính năng Tự động Nhắc lịch Gia đình"
                  checked={notifSettings.enabled}
                  onChange={(e) =>
                    handleUpdateNotifSettings({ enabled: e.target.checked })
                  }
                  className="w-5 h-5 accent-blue-600 cursor-pointer"
                />
              </div>

              {/* 1. Nhắc lịch đưa đón trẻ */}
              <div className="card-3d-sm p-4 bg-white space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-sky-600 shrink-0" aria-hidden="true" />
                    <span className="font-bold text-sm text-slate-900">
                      1. Nhắc lịch Đưa & Đón trẻ đi học
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    aria-label="Bật nhắc lịch đưa đón trẻ"
                    checked={notifSettings.enableSchedules}
                    disabled={!notifSettings.enabled}
                    onChange={(e) =>
                      handleUpdateNotifSettings({
                        enableSchedules: e.target.checked,
                      })
                    }
                    className="w-5 h-5 accent-blue-600 cursor-pointer"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-600">
                  <span>
                    Báo trước giờ vào học (đưa đi) và trước giờ tan học (đón về):
                  </span>
                  <select
                    aria-label="Số phút báo trước giờ đưa đón trẻ"
                    value={notifSettings.scheduleLeadMinutes}
                    disabled={
                      !notifSettings.enabled || !notifSettings.enableSchedules
                    }
                    onChange={(e) =>
                      handleUpdateNotifSettings({
                        scheduleLeadMinutes: Number(e.target.value),
                      })
                    }
                    className="badge-3d bg-sky-50 text-sky-900 border-sky-200 px-3 py-1.5 font-bold cursor-pointer"
                  >
                    <option value={10}>Trước 10 phút</option>
                    <option value={15}>Trước 15 phút</option>
                    <option value={20}>Trước 20 phút</option>
                    <option value={30}>Trước 30 phút</option>
                    <option value={45}>Trước 45 phút</option>
                  </select>
                </div>
              </div>

              {/* 2. Nhắc lịch đóng tiền định kỳ */}
              <div className="card-3d-sm p-4 bg-white space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
                    <span className="font-bold text-sm text-slate-900">
                      2. Nhắc lịch Đóng tiền định kỳ (Các khoản chưa đóng)
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    aria-label="Bật nhắc lịch đóng tiền định kỳ"
                    checked={notifSettings.enableExpenses}
                    disabled={!notifSettings.enabled}
                    onChange={(e) =>
                      handleUpdateNotifSettings({
                        enableExpenses: e.target.checked,
                      })
                    }
                    className="w-5 h-5 accent-blue-600 cursor-pointer"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-600">
                  <span>
                    Tự động nhắc trước 3 ngày, 1 ngày và đúng ngày hạn đóng vào lúc:
                  </span>
                  <select
                    aria-label="Giờ nhắc đóng tiền định kỳ"
                    value={notifSettings.expenseNotifyHour}
                    disabled={
                      !notifSettings.enabled || !notifSettings.enableExpenses
                    }
                    onChange={(e) =>
                      handleUpdateNotifSettings({
                        expenseNotifyHour: Number(e.target.value),
                      })
                    }
                    className="badge-3d bg-amber-50 text-amber-900 border-amber-200 px-3 py-1.5 font-bold cursor-pointer"
                  >
                    <option value={7}>07:00 sáng</option>
                    <option value={8}>08:00 sáng</option>
                    <option value={9}>09:00 sáng</option>
                    <option value={19}>19:00 tối</option>
                    <option value={20}>20:00 tối</option>
                  </select>
                </div>
              </div>

              {/* 3. Nhắc lịch Giỗ & Sự kiện Âm/Dương */}
              <div className="card-3d-sm p-4 bg-white space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
                    <span className="font-bold text-sm text-slate-900">
                      3. Nhắc lịch Giỗ & Sự kiện Âm/Dương
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    aria-label="Bật nhắc lịch giỗ và sự kiện"
                    checked={notifSettings.enableEvents}
                    disabled={!notifSettings.enabled}
                    onChange={(e) =>
                      handleUpdateNotifSettings({
                        enableEvents: e.target.checked,
                      })
                    }
                    className="w-5 h-5 accent-blue-600 cursor-pointer"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-600">
                  <span>
                    Quy đổi Âm sang Dương, nhắc trước ngày giỗ và sáng ngày giỗ lúc:
                  </span>
                  <select
                    aria-label="Giờ nhắc lịch giỗ và sự kiện"
                    value={notifSettings.eventNotifyHour}
                    disabled={
                      !notifSettings.enabled || !notifSettings.enableEvents
                    }
                    onChange={(e) =>
                      handleUpdateNotifSettings({
                        eventNotifyHour: Number(e.target.value),
                      })
                    }
                    className="badge-3d bg-rose-50 text-rose-900 border-rose-200 px-3 py-1.5 font-bold cursor-pointer"
                  >
                    <option value={6}>06:30 sáng</option>
                    <option value={7}>07:30 sáng</option>
                    <option value={8}>08:30 sáng</option>
                    <option value={18}>18:30 chiều</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Danh sách các thông báo sắp đổ chuông gần nhất */}
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
                Danh sách chuông báo sắp tới ({upcomingReminders.length} lịch hẹn)
              </div>
              {upcomingReminders.length === 0 ? (
                <div className="card-3d-sm p-4 bg-slate-50 text-center text-xs font-medium text-slate-500">
                  Hiện chưa có lịch hẹn nào trong thời gian tới (hoặc tính năng nhắc lịch đang tắt).
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {upcomingReminders.slice(0, 15).map((item) => (
                    <div
                      key={item.id}
                      className="card-3d-sm p-3 bg-slate-50/90 border-slate-200 flex items-start justify-between gap-2.5"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs md:text-sm text-slate-900">
                          {item.title}
                        </div>
                        <div className="text-xs font-medium text-slate-600 mt-0.5">
                          {item.body}
                        </div>
                      </div>
                      <span className="badge-3d bg-white text-blue-700 border-blue-200 px-2.5 py-1 text-[11px] shrink-0 tabular-nums">
                        {item.timeLabel}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* THANH ĐIỀU HƯỚNG ĐÁY (BOTTOM NAV) CHUẨN ANDROID APK / MOBILE */}
      <nav
        style={{
          paddingBottom: isAppShell
            ? "max(env(safe-area-inset-bottom, 0px), 16px)"
            : "max(env(safe-area-inset-bottom, 0px), 8px)",
        }}
        aria-label="Điều hướng di động"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 py-2 grid grid-cols-5 gap-1 shadow-lg"
      >
        {[
          { id: "finance", label: "Thu-Chi", icon: Wallet },
          { id: "schedule", label: "Lịch Con", icon: GraduationCap },
          { id: "events", label: "Giỗ/Lễ", icon: CalendarClock },
          { id: "vault", label: "Lưu Trữ", icon: KeyRound },
          { id: "members", label: "Gia Đình", icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() =>
                setActiveTab(
                  tab.id as
                    | "finance"
                    | "schedule"
                    | "events"
                    | "vault"
                    | "members"
                )
              }
              className={`flex flex-col items-center justify-center py-2 rounded-xl font-bold text-[11px] transition-colors cursor-pointer ${
                isActive
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span className="mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {loading && (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-50 badge-3d bg-blue-600 text-white border-blue-600 px-4 py-2 text-xs shadow-lg"
        >
          <span>Đang đồng bộ dữ liệu gia đình...</span>
        </div>
      )}
    </div>
  );
}
