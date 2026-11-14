"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  LogIn,
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
} from "lucide-react";
import { solarToLunar, getCurrentPeriodKeys } from "@/lib/lunar";

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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<
    Record<number, boolean>
  >({});
  const [historyModalExpense, setHistoryModalExpense] =
    useState<ExpenseItem | null>(null);
  const [previewDoc, setPreviewDoc] = useState<PersonalDocumentItem | null>(
    null
  );

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
          fetch("/api/incomes").then((r) => r.json()),
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
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#f4f6fb]">
        <div className="card-3d bg-amber-300 px-6 py-4 font-black text-slate-950 text-base">
          🔒 Đang kiểm tra phiên đăng nhập bảo mật...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 md:pb-12">
      {/* TOP BAR NỔI KHỐI */}
      <header className="sticky top-0 z-30 bg-amber-300 border-b-[3px] border-slate-950 shadow-[0_4px_0_#0f172a]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 text-amber-300 flex items-center justify-center font-black text-xl border-2 border-slate-950 shadow-[0_3px_0_#334155]">
              🏠
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-950">
                  QUẢN LÝ GIA ĐÌNH
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-extrabold bg-slate-950 text-amber-300 rounded-full">
                  <Sparkles className="w-3 h-3" /> Tổ Ấm Số
                </span>
              </div>
              <p className="text-xs md:text-sm font-extrabold text-slate-900">
                ☀️ {todayInfo.solarStr} • 🌙 {todayInfo.lunarStr}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser && (
              <div className="badge-3d bg-white px-3 py-1.5 flex items-center gap-2 text-xs md:text-sm">
                <span
                  className="w-6 h-6 rounded-full text-white flex items-center justify-center font-black text-xs border border-slate-950"
                  style={{ backgroundColor: currentUser.avatarColor }}
                >
                  {currentUser.fullName.charAt(0)}
                </span>
                <span className="font-black text-slate-950">
                  {currentUser.fullName}
                </span>
                {currentUser.isAdmin && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-950 text-amber-300 text-[10px] font-black uppercase">
                    👑 ADMIN
                  </span>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="btn-3d bg-rose-500 hover:bg-rose-400 text-white px-3 py-1.5 text-xs md:text-sm"
              title="Đăng xuất tài khoản"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-5">
        {/* THANH NHẮC VIỆC KHẨN CẤP TRONG NGÀY (QUICK REMINDERS) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab("finance")}
            className="card-3d card-3d-interactive p-4 bg-amber-100 text-left flex items-center justify-between"
          >
            <div>
              <div className="text-xs font-black uppercase text-amber-900 tracking-wider">
                Khoản đóng định kỳ
              </div>
              <div className="text-lg font-black text-slate-950 mt-0.5">
                {financeSummary.unpaidCount > 0
                  ? `Còn ${financeSummary.unpaidCount} khoản chưa đóng`
                  : "Đã hoàn tất mọi khoản!"}
              </div>
              <div className="text-xs font-bold text-slate-800 mt-0.5">
                Cần đóng: {formatVND(financeSummary.totalUnpaid)}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-400 border-2 border-slate-950 flex items-center justify-center shadow-[0_3px_0_#0f172a]">
              <Wallet className="w-6 h-6 text-slate-950" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("schedule")}
            className="card-3d card-3d-interactive p-4 bg-sky-100 text-left flex items-center justify-between"
          >
            <div>
              <div className="text-xs font-black uppercase text-sky-900 tracking-wider">
                Lịch con hôm nay ({DAY_NAMES[todayInfo.isoDay]})
              </div>
              <div className="text-lg font-black text-slate-950 mt-0.5">
                {todaySchedules.length > 0
                  ? `${todaySchedules.length} ca học cần đưa đón`
                  : "Hôm nay không có ca học"}
              </div>
              <div className="text-xs font-bold text-slate-800 mt-0.5 truncate max-w-[230px]">
                {todaySchedules[0]
                  ? `${todaySchedules[0].startTime}: ${todaySchedules[0].childName} (${todaySchedules[0].dropoffName} đưa)`
                  : "Chạm để xem thời khóa biểu tuần"}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sky-400 border-2 border-slate-950 flex items-center justify-center shadow-[0_3px_0_#0f172a]">
              <GraduationCap className="w-6 h-6 text-slate-950" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("events")}
            className="card-3d card-3d-interactive p-4 bg-rose-100 text-left flex items-center justify-between"
          >
            <div>
              <div className="text-xs font-black uppercase text-rose-900 tracking-wider">
                Lịch giỗ & Sự kiện sắp tới
              </div>
              <div className="text-lg font-black text-slate-950 mt-0.5 truncate max-w-[230px]">
                {events[0] ? events[0].title : "Chưa có sự kiện"}
              </div>
              <div className="text-xs font-bold text-rose-950 mt-0.5">
                {events[0]
                  ? `⏰ Còn ${events[0].daysUntil} ngày (${events[0].solarDateStr} Dương)`
                  : "Chạm để thêm lịch Âm / Dương"}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-400 border-2 border-slate-950 flex items-center justify-center shadow-[0_3px_0_#0f172a]">
              <BellRing className="w-6 h-6 text-slate-950" />
            </div>
          </button>
        </div>

        {/* THANH ĐIỀU HƯỚNG 5 PHÂN HỆ TRÊN DESKTOP */}
        <nav className="hidden md:grid grid-cols-5 gap-3 mb-6">
          {[
            {
              id: "finance",
              label: "1. Thu - Chi Định Kỳ",
              icon: Wallet,
              activeColor: "bg-emerald-400 text-slate-950",
            },
            {
              id: "schedule",
              label: "2. Lịch Học & Đưa Đón",
              icon: GraduationCap,
              activeColor: "bg-sky-400 text-slate-950",
            },
            {
              id: "events",
              label: "3. Lịch Giỗ & Sự Kiện",
              icon: CalendarClock,
              activeColor: "bg-rose-400 text-slate-950",
            },
            {
              id: "vault",
              label: "4. Tài Khoản & Giấy Tờ",
              icon: KeyRound,
              activeColor: "bg-violet-400 text-slate-950",
            },
            {
              id: "members",
              label: "5. Thành Viên Gia Đình",
              icon: Users,
              activeColor: "bg-amber-400 text-slate-950",
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
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
                className={`btn-3d py-3.5 px-4 text-sm md:text-base ${
                  isActive
                    ? tab.activeColor
                    : "bg-white hover:bg-slate-100 text-slate-900"
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
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
            {/* 4 Thẻ thống kê nổi khối độ tương phản cao */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card-3d p-5 bg-emerald-400 text-slate-950">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider">
                    TỔNG THU THÁNG NÀY
                  </span>
                  <ArrowUpCircle className="w-6 h-6" />
                </div>
                <div className="text-2xl font-black mt-2">
                  {formatVND(financeSummary.monthlyIncomeTotal)}
                </div>
                <div className="text-xs font-extrabold mt-1 text-slate-900">
                  + Quý: {formatVND(financeSummary.quarterlyIncomeTotal)} • Năm:{" "}
                  {formatVND(financeSummary.yearlyIncomeTotal)}
                </div>
              </div>

              <div className="card-3d p-5 bg-white text-slate-950">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                    TỔNG KHOẢN PHẢI ĐÓNG
                  </span>
                  <ArrowDownCircle className="w-6 h-6 text-rose-600" />
                </div>
                <div className="text-2xl font-black mt-2">
                  {formatVND(financeSummary.totalDue)}
                </div>
                <div className="text-xs font-extrabold mt-1 text-slate-700">
                  Tổng cộng {expenses.length} khoản định kỳ
                </div>
              </div>

              <div className="card-3d p-5 bg-sky-300 text-slate-950">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider">
                    ĐÃ ĐÓNG TRONG KỲ
                  </span>
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="text-2xl font-black mt-2">
                  {formatVND(financeSummary.totalPaid)}
                </div>
                <div className="text-xs font-extrabold mt-1">
                  Hoàn thành {financeSummary.paidCount}/{expenses.length} khoản (
                  {financeSummary.progressPercent}%)
                </div>
              </div>

              <div className="card-3d p-5 bg-amber-300 text-slate-950">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider">
                    CÒN PHẢI ĐÓNG
                  </span>
                  <Clock className="w-6 h-6" />
                </div>
                <div className="text-2xl font-black mt-2 text-rose-900">
                  {formatVND(financeSummary.totalUnpaid)}
                </div>
                <div className="text-xs font-extrabold mt-1">
                  Còn {financeSummary.unpaidCount} khoản chờ thanh toán
                </div>
              </div>
            </div>

            {/* Thanh tiến độ đóng tiền định kỳ */}
            <div className="card-3d p-5 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="font-black text-slate-950 text-sm md:text-base">
                  TIẾN ĐỘ ĐÓNG CÁC KHOẢN ĐỊNH KỲ TRONG KỲ ({financeSummary.progressPercent}%)
                </span>
                <div className="flex flex-wrap items-center gap-2 text-xs font-black">
                  <input
                    type="month"
                    value={monthlyKey}
                    onChange={(e) => {
                      if (e.target.value) setMonthlyKey(e.target.value);
                    }}
                    className="badge-3d bg-amber-200 px-2.5 py-1 cursor-pointer"
                  />
                  <span className="badge-3d bg-slate-100 px-3 py-1">
                    Năm: {yearlyKey}
                  </span>
                </div>
              </div>
              <div className="w-full h-6 rounded-full bg-slate-200 border-2 border-slate-950 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${financeSummary.progressPercent}%` }}
                />
              </div>
            </div>

            {/* KHU VỰC DANH SÁCH KHOẢN ĐÓNG ĐỊNH KỲ (THÁNG / NĂM) */}
            <div className="card-3d p-5 md:p-6 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    CÁC KHOẢN PHẢI ĐÓNG ĐỊNH KỲ (THÁNG / NĂM)
                  </h2>
                  <p className="text-xs md:text-sm font-bold text-slate-700">
                    Bấm &ldquo;Đánh dấu Đã đóng&rdquo; khi thanh toán xong hoặc bấm &ldquo;Sửa&rdquo; để cập nhật
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
                  className="btn-3d bg-emerald-400 hover:bg-emerald-300 text-slate-950 px-4 py-2.5 text-sm"
                >
                  <Plus className="w-5 h-5" />
                  Thêm Khoản Đóng
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
                        ? "bg-slate-950 text-amber-300"
                        : "bg-slate-100 text-slate-900"
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
                  className="card-3d-sm bg-amber-50 p-4 md:p-5 mb-6 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-base text-slate-950">
                      {editingExpenseId
                        ? "✏️ CHỈNH SỬA KHOẢN PHẢI ĐÓNG ĐỊNH KỲ"
                        : "➕ THÊM KHOẢN PHẢI ĐÓNG ĐỊNH KỲ MỚI (THÁNG / NĂM)"}
                    </h3>
                    <button
                      type="button"
                      onClick={resetExpenseForm}
                      className="text-slate-700 font-black"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-black mb-1">
                        TÊN KHOẢN ĐÓNG *
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
                      <label className="block text-xs font-black mb-1">
                        SỐ TIỀN DỰ KIẾN (VNĐ) *
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="VD: 1500000"
                        value={expAmount}
                        onChange={(e) => setExpAmount(e.target.value)}
                        className="input-3d"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black mb-1">
                        CHU KỲ ĐỊNH KỲ *
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
                        <label className="block text-xs font-black mb-1">
                          NGÀY HẠN ĐÓNG (1-31)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          value={expDueDay}
                          onChange={(e) => setExpDueDay(Number(e.target.value))}
                          className="input-3d"
                        />
                      </div>
                      {expCycle === "yearly" && (
                        <div>
                          <label className="block text-xs font-black mb-1">
                            THÁNG ĐÓNG (1-12)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={12}
                            value={expDueMonth}
                            onChange={(e) =>
                              setExpDueMonth(Number(e.target.value))
                            }
                            className="input-3d"
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-black mb-1">
                        DANH MỤC
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
                      <label className="block text-xs font-black mb-1">
                        GHI CHÚ (MÃ KH, SỐ TK...)
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
                        className="btn-3d bg-slate-200 text-slate-900 px-4 py-2.5 text-sm"
                      >
                        Hủy
                      </button>
                    )}
                    <button
                      type="submit"
                      className="btn-3d bg-blue-600 text-white px-6 py-2.5 text-sm"
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
                          text: "ĐỊNH KỲ THÁNG",
                          bg: "bg-sky-200 text-slate-950",
                          dueText: `Ngày ${exp.dueDay} hàng tháng`,
                        }
                      : {
                          text: "ĐỊNH KỲ NĂM",
                          bg: "bg-amber-200 text-slate-950",
                          dueText: `Ngày ${exp.dueDay}/${exp.dueMonth} hàng năm`,
                        };

                  return (
                    <div
                      key={exp.id}
                      className={`card-3d-sm p-4 md:p-5 flex flex-col justify-between gap-3 ${
                        exp.isPaid ? "bg-emerald-50" : "bg-white"
                      }`}
                    >
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`badge-3d px-2.5 py-0.5 text-xs ${cycleBadge.bg}`}
                            >
                              {cycleBadge.text}
                            </span>
                            <span className="badge-3d px-2.5 py-0.5 text-xs bg-slate-100 text-slate-900">
                              {exp.category}
                            </span>
                          </div>
                          <span
                            className={`badge-3d px-3 py-0.5 text-xs ${
                              exp.isPaid
                                ? "bg-emerald-500 text-slate-950"
                                : "bg-rose-500 text-white"
                            }`}
                          >
                            {exp.isPaid ? "✓ ĐÃ ĐÓNG" : "⏳ CHƯA ĐÓNG"}
                          </span>
                        </div>

                        <h3 className="text-lg font-black text-slate-950">
                          {exp.title}
                        </h3>
                        <div className="text-2xl font-black text-blue-700 mt-1">
                          {formatVND(exp.amount)}
                        </div>
                        <div className="text-xs font-extrabold text-slate-700 mt-1">
                          📅 Hạn đóng: {cycleBadge.dueText} • Kỳ hiện tại:{" "}
                          <span className="underline">{exp.periodKey}</span>
                        </div>
                        {exp.note && (
                          <p className="text-xs font-bold text-slate-600 mt-1 bg-slate-100 p-2 rounded-lg border border-slate-300">
                            💡 {exp.note}
                          </p>
                        )}
                        {exp.isPaid && exp.payment && (
                          <div className="mt-2 text-xs font-black text-emerald-950 bg-emerald-200/80 px-3 py-1.5 rounded-lg border border-emerald-800">
                            ✅ Đã đóng bởi: {exp.payment.paidByName} (Kỳ{" "}
                            {exp.periodKey})
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t-2 border-dashed border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleTogglePay(exp)}
                          className={`btn-3d flex-1 py-2.5 px-3 text-xs md:text-sm ${
                            exp.isPaid
                              ? "bg-slate-200 hover:bg-slate-300 text-slate-900"
                              : "bg-emerald-400 hover:bg-emerald-300 text-slate-950"
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {exp.isPaid
                            ? "Hoàn tác (Chưa đóng)"
                            : "Đánh dấu ĐÃ ĐÓNG"}
                        </button>

                        <button
                          type="button"
                          onClick={() => setHistoryModalExpense(exp)}
                          className="btn-3d bg-amber-200 hover:bg-amber-300 text-slate-950 py-2.5 px-3 text-xs"
                          title="Lịch sử các kỳ đã đóng"
                        >
                          <History className="w-4 h-4" />
                          <span>({exp.history.length})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => startEditExpense(exp)}
                          className="btn-3d bg-sky-100 hover:bg-sky-200 text-sky-900 py-2.5 px-3 text-xs"
                          title="Sửa khoản đóng"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteItem("expenses", exp.id)}
                          className="btn-3d bg-rose-100 hover:bg-rose-200 text-rose-900 py-2.5 px-3 text-xs"
                          title="Xóa khoản đóng"
                        >
                          <Trash2 className="w-4 h-4" />
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
                  <h2 className="text-xl font-black text-slate-950">
                    CÁC KHOẢN THU GIA ĐÌNH (THÁNG / NĂM)
                  </h2>
                  <p className="text-xs md:text-sm font-bold text-slate-700">
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
                  className="btn-3d bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 text-sm"
                >
                  <Plus className="w-5 h-5" />
                  Thêm Khoản Thu
                </button>
              </div>

              {showIncomeForm && (
                <form
                  onSubmit={handleCreateIncome}
                  className="card-3d-sm bg-blue-50 p-4 md:p-5 mb-6 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-base text-slate-950">
                      {editingIncomeId
                        ? "✏️ CHỈNH SỬA KHOẢN THU"
                        : "➕ THÊM KHOẢN THU MỚI (THÁNG / NĂM)"}
                    </h3>
                    <button
                      type="button"
                      onClick={resetIncomeForm}
                      className="text-slate-700 font-black"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-black mb-1">
                        TÊN KHOẢN THU *
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
                      <label className="block text-xs font-black mb-1">
                        SỐ TIỀN THU (VNĐ) *
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="VD: 20000000"
                        value={incAmount}
                        onChange={(e) => setIncAmount(e.target.value)}
                        className="input-3d"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black mb-1">
                        CHU KỲ THU
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
                      <label className="block text-xs font-black mb-1">
                        THÀNH VIÊN ĐÓNG GÓP
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
                        className="btn-3d bg-slate-200 text-slate-900 px-4 py-2.5 text-sm"
                      >
                        Hủy
                      </button>
                    )}
                    <button
                      type="submit"
                      className="btn-3d bg-emerald-400 text-slate-950 px-6 py-2.5 text-sm"
                    >
                      {editingIncomeId ? "Cập Nhật Khoản Thu" : "Lưu Khoản Thu"}
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {incomes.map((inc) => (
                  <div
                    key={inc.id}
                    className="card-3d-sm p-4 bg-emerald-50/70 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`badge-3d px-2.5 py-0.5 text-xs ${
                            inc.cycle === "monthly"
                              ? "bg-emerald-300 text-slate-950"
                              : inc.cycle === "quarterly"
                              ? "bg-sky-300 text-slate-950"
                              : "bg-amber-300 text-slate-950"
                          }`}
                        >
                          {inc.cycle === "monthly"
                            ? "THU HÀNG THÁNG"
                            : inc.cycle === "quarterly"
                            ? "THU THEO QUÝ"
                            : "THU HÀNG NĂM"}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEditIncome(inc)}
                            className="text-blue-700 hover:text-blue-900"
                            title="Sửa khoản thu"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem("incomes", inc.id)}
                            className="text-rose-700 hover:text-rose-900"
                            title="Xóa khoản thu"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <h3 className="font-black text-base text-slate-950">
                        {inc.title}
                      </h3>
                      <div className="text-xl font-black text-emerald-800 mt-1">
                        +{formatVND(inc.amount)}
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-emerald-300 flex items-center justify-between text-xs font-extrabold text-slate-700">
                      <span>👤 {inc.receivedByName}</span>
                      <span>Kỳ: {inc.periodKey}</span>
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
            <div className="card-3d p-5 bg-sky-300 text-slate-950">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="badge-3d bg-slate-950 text-sky-300 px-3 py-0.5 text-xs">
                    LỊCH ĐƯA ĐÓN HÔM NAY • {DAY_NAMES[todayInfo.isoDay]}
                  </span>
                  <h2 className="text-xl md:text-2xl font-black mt-1">
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
                  className="btn-3d bg-amber-300 hover:bg-amber-200 text-slate-950 px-4 py-2.5 text-sm"
                >
                  <Plus className="w-5 h-5" />
                  Thêm Ca Học / Lịch Đưa Đón
                </button>
              </div>

              {todaySchedules.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  {todaySchedules.map((s) => (
                    <div
                      key={s.id}
                      className="card-3d-sm bg-white p-3.5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-slate-950 text-base">
                          🎒 {s.childName} — {s.subject}
                        </span>
                        <span className="badge-3d bg-amber-300 px-2.5 py-0.5 text-xs">
                          {s.startTime} - {s.endTime}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-blue-100 border-2 border-slate-950 rounded-xl p-2 text-xs font-black">
                          🚗 ĐƯA ĐI: <span className="text-blue-900">{s.dropoffName}</span>
                        </div>
                        <div className="bg-rose-100 border-2 border-slate-950 rounded-xl p-2 text-xs font-black">
                          🛵 ĐÓN VỀ: <span className="text-rose-900">{s.pickupName}</span>
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
                className="card-3d p-5 bg-white space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-lg text-slate-950">
                    {editingScheduleId
                      ? "✏️ CHỈNH SỬA LỊCH HỌC & PHÂN CÔNG ĐƯA ĐÓN"
                      : "➕ THÊM THỜI KHÓA BIỂU / LỊCH HỌC THÊM & PHÂN CÔNG ĐƯA ĐÓN"}
                  </h3>
                  <button
                    type="button"
                    onClick={resetScheduleForm}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-black mb-1">
                      TÊN BÉ *
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
                    <label className="block text-xs font-black mb-1">
                      MÔN HỌC / HOẠT ĐỘNG *
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
                    <label className="block text-xs font-black mb-1">
                      LOẠI LỊCH HỌC
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
                    <label className="block text-xs font-black mb-1">
                      THỨ TRONG TUẦN
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
                    <label className="block text-xs font-black mb-1">
                      GIỜ VÀO HỌC
                    </label>
                    <input
                      type="time"
                      value={schStart}
                      onChange={(e) => setSchStart(e.target.value)}
                      className="input-3d"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black mb-1">
                      GIỜ TAN HỌC (ĐÓN)
                    </label>
                    <input
                      type="time"
                      value={schEnd}
                      onChange={(e) => setSchEnd(e.target.value)}
                      className="input-3d"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black mb-1">
                      🚗 AI ĐƯA ĐI?
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
                    <label className="block text-xs font-black mb-1">
                      🛵 AI ĐÓN VỀ?
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
                    <label className="block text-xs font-black mb-1">
                      ĐỊA ĐIỂM HỌC / PHÒNG HỌC
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
                    <label className="block text-xs font-black mb-1">
                      TÊN & SĐT GIÁO VIÊN
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
                    <label className="block text-xs font-black mb-1">
                      GHI CHÚ ĐỒ DÙNG CẦN MANG
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
                      className="btn-3d bg-slate-200 text-slate-900 px-4 py-2.5 text-sm"
                    >
                      Hủy
                    </button>
                  )}
                  <button
                    type="submit"
                    className="btn-3d bg-blue-600 text-white px-6 py-2.5 text-sm"
                  >
                    {editingScheduleId
                      ? "Cập Nhật Lịch Học & Đưa Đón"
                      : "Lưu Lịch Học & Đưa Đón"}
                  </button>
                </div>
              </form>
            )}

            {/* Bộ lọc theo Bé & theo Thứ */}
            <div className="card-3d p-5 bg-white space-y-4">
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
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-900"
                        }`}
                      >
                        {name === "all" ? "👨‍👩‍👧‍👦 Tất cả các con" : `🎒 ${name}`}
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
                        ? "bg-slate-950 text-amber-300"
                        : "bg-slate-100 text-slate-900"
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
                          ? "bg-slate-950 text-amber-300"
                          : "bg-slate-100 text-slate-900"
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
                      ? { label: "CHÍNH KHÓA", bg: "bg-sky-200" }
                      : item.scheduleType === "extra"
                      ? { label: "HỌC THÊM", bg: "bg-amber-300" }
                      : { label: "NGOẠI KHÓA / NĂNG KHIẾU", bg: "bg-emerald-300" };

                  return (
                    <div
                      key={item.id}
                      className="card-3d-sm p-4 md:p-5 bg-white flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="badge-3d bg-slate-950 text-white px-3 py-0.5 text-xs">
                              {DAY_NAMES[item.dayOfWeek]}
                            </span>
                            <span
                              className={`badge-3d px-2.5 py-0.5 text-xs text-slate-950 ${typeBadge.bg}`}
                            >
                              {typeBadge.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEditSchedule(item)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Sửa lịch học"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteItem("schedules", item.id)
                              }
                              className="text-rose-600 hover:text-rose-800"
                              title="Xóa lịch học"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="text-xs font-black uppercase text-blue-700">
                          🎒 {item.childName}
                        </div>
                        <h3 className="text-lg font-black text-slate-950 mt-0.5">
                          {item.subject}
                        </h3>
                        <div className="inline-flex items-center gap-1.5 mt-1 px-3 py-1 rounded-lg bg-amber-100 border-2 border-slate-950 font-black text-sm text-slate-950">
                          <Clock className="w-4 h-4" />
                          {item.startTime} — {item.endTime}
                        </div>

                        <div className="mt-3 space-y-1 text-xs font-bold text-slate-800">
                          {item.location && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>{item.location}</span>
                            </div>
                          )}
                          {item.teacherInfo && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-4 h-4 text-emerald-700 shrink-0" />
                              <span>GV: {item.teacherInfo}</span>
                            </div>
                          )}
                          {item.note && (
                            <div className="bg-slate-100 p-2 rounded-lg border border-slate-300 mt-1">
                              📌 {item.note}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Khối phân công Đưa - Đón nổi bật */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t-2 border-dashed border-slate-200">
                        <div className="card-3d-sm bg-blue-100 p-2.5">
                          <div className="text-[11px] font-black text-blue-900 flex items-center gap-1">
                            <Car className="w-3.5 h-3.5" /> NGƯỜI ĐƯA ĐI
                          </div>
                          <div className="text-sm font-black text-slate-950 mt-0.5">
                            {item.dropoffName}
                          </div>
                        </div>
                        <div className="card-3d-sm bg-rose-100 p-2.5">
                          <div className="text-[11px] font-black text-rose-900 flex items-center gap-1">
                            <Bike className="w-3.5 h-3.5" /> NGƯỜI ĐÓN VỀ
                          </div>
                          <div className="text-sm font-black text-slate-950 mt-0.5">
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
                  <h2 className="text-xl font-black text-slate-950">
                    LỊCH GIỖ & SỰ KIỆN RIÊNG CỦA GIA ĐÌNH (ÂM LỊCH & DƯƠNG LỊCH)
                  </h2>
                  <p className="text-xs md:text-sm font-bold text-slate-700">
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
                  className="btn-3d bg-rose-500 hover:bg-rose-400 text-white px-4 py-2.5 text-sm"
                >
                  <Plus className="w-5 h-5" />
                  Thêm Lịch Giỗ / Sự Kiện
                </button>
              </div>

              {showEventForm && (
                <form
                  onSubmit={handleCreateEvent}
                  className="card-3d-sm bg-rose-50 p-4 md:p-5 mb-6 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-base text-slate-950">
                      {editingEventId
                        ? "✏️ CHỈNH SỬA NGÀY GIỖ HOẶC SỰ KIỆN GIA ĐÌNH"
                        : "➕ THÊM NGÀY GIỖ HOẶC SỰ KIỆN GIA ĐÌNH"}
                    </h3>
                    <button
                      type="button"
                      onClick={resetEventForm}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-black mb-1">
                        TÊN NGÀY GIỖ / SỰ KIỆN *
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
                      <label className="block text-xs font-black mb-1">
                        LOẠI SỰ KIỆN
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
                        <option value="ancestor">🕯️ Lịch Giỗ Gia Tiên</option>
                        <option value="birthday">🎂 Sinh nhật Thành viên</option>
                        <option value="anniversary">💝 Kỷ niệm Gia đình</option>
                        <option value="holiday">🏮 Lễ Tết / Họp họ</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black mb-1">
                        TÍNH THEO LỊCH NÀO? *
                      </label>
                      <select
                        value={evCalType}
                        onChange={(e) =>
                          setEvCalType(e.target.value as "lunar" | "solar")
                        }
                        className="input-3d"
                      >
                        <option value="lunar">🌙 Theo ÂM LỊCH (Tự quy ra Dương)</option>
                        <option value="solar">☀️ Theo DƯƠNG LỊCH</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-black mb-1">
                          NGÀY (1-30/31) *
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          value={evDay}
                          onChange={(e) => setEvDay(Number(e.target.value))}
                          className="input-3d"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black mb-1">
                          THÁNG (1-12) *
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={12}
                          value={evMonth}
                          onChange={(e) => setEvMonth(Number(e.target.value))}
                          className="input-3d"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black mb-1">
                        NHẮC TRƯỚC BAO NHIÊU NGÀY?
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={evRemind}
                        onChange={(e) => setEvRemind(Number(e.target.value))}
                        className="input-3d"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black mb-1">
                        GHI CHÚ CHUẨN BỊ CỖ / LỄ VẬT
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
                        className="btn-3d bg-slate-200 text-slate-900 px-4 py-2.5 text-sm"
                      >
                        Hủy
                      </button>
                    )}
                    <button
                      type="submit"
                      className="btn-3d bg-rose-500 text-white px-6 py-2.5 text-sm"
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
                      className={`card-3d-sm p-5 flex flex-col justify-between gap-3 ${
                        ev.isUpcomingSoon ? "bg-amber-50" : "bg-white"
                      }`}
                    >
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <span
                            className={`badge-3d px-3 py-0.5 text-xs ${
                              ev.calendarType === "lunar"
                                ? "bg-amber-300 text-slate-950"
                                : "bg-sky-300 text-slate-950"
                            }`}
                          >
                            {ev.calendarType === "lunar"
                              ? `🌙 ÂM LỊCH: ${String(ev.day).padStart(
                                  2,
                                  "0"
                                )}/${String(ev.month).padStart(2, "0")}`
                              : `☀️ DƯƠNG LỊCH: ${String(ev.day).padStart(
                                  2,
                                  "0"
                                )}/${String(ev.month).padStart(2, "0")}`}
                          </span>

                          <div className="flex items-center gap-2">
                            <span
                              className={`badge-3d px-3 py-1 text-xs ${
                                ev.daysUntil === 0
                                  ? "bg-rose-600 text-white"
                                  : ev.daysUntil <= 14
                                  ? "bg-rose-500 text-white"
                                  : "bg-emerald-300 text-slate-950"
                              }`}
                            >
                              {ev.daysUntil === 0
                                ? "🔥 HÔM NAY!"
                                : `⏰ Còn ${ev.daysUntil} ngày nữa`}
                            </span>
                            <button
                              type="button"
                              onClick={() => startEditEvent(ev)}
                              className="text-blue-700 hover:text-blue-900"
                              title="Sửa sự kiện"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem("events", ev.id)}
                              className="text-rose-700 hover:text-rose-900"
                              title="Xóa sự kiện"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <h3 className="text-lg font-black text-slate-950 flex items-center gap-2">
                          <span>{isAncestor ? "🕯️" : "🎉"}</span>
                          {ev.title}
                        </h3>

                        <div className="mt-2 p-3 rounded-xl bg-white border-2 border-slate-950 space-y-1 text-xs md:text-sm font-extrabold">
                          <div className="text-blue-800">
                            📅 Ngày Dương lịch năm nay:{" "}
                            <span className="font-black underline">
                              {ev.solarDateStr}
                            </span>
                          </div>
                          <div className="text-slate-700">
                            🌙 Đối chiếu Âm lịch: {ev.lunarDisplay}
                          </div>
                        </div>

                        {ev.note && (
                          <p className="text-xs font-bold text-slate-800 mt-2 bg-amber-100/80 p-2.5 rounded-lg border border-amber-400">
                            📝 Chuẩn bị: {ev.note}
                          </p>
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
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setVaultSubTab("accounts")}
                  className={`btn-3d px-5 py-3 text-sm ${
                    vaultSubTab === "accounts"
                      ? "bg-violet-500 text-white"
                      : "bg-slate-100 text-slate-900"
                  }`}
                >
                  <KeyRound className="w-5 h-5" />
                  Kho Tài Khoản (Lớp học, Cuộc thi...) ({accounts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVaultSubTab("documents")}
                  className={`btn-3d px-5 py-3 text-sm ${
                    vaultSubTab === "documents"
                      ? "bg-amber-400 text-slate-950"
                      : "bg-slate-100 text-slate-900"
                  }`}
                >
                  <FileBadge className="w-5 h-5" />
                  Giấy Tờ Cá Nhân (Khai sinh, BHYT, CCCD...) ({documents.length})
                </button>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-500" />
                <input
                  type="text"
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
                    <h2 className="text-xl font-black text-slate-950">
                      KHO TÀI KHOẢN DÙNG CHUNG TRONG GIA ĐÌNH
                    </h2>
                    <p className="text-xs md:text-sm font-bold text-slate-700">
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
                    className="btn-3d bg-violet-500 hover:bg-violet-400 text-white px-4 py-2.5 text-sm"
                  >
                    <Plus className="w-5 h-5" />
                    Thêm Tài Khoản Mới
                  </button>
                </div>

                {/* Bộ lọc danh mục tài khoản */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {[
                    { id: "all", label: "Tất cả" },
                    { id: "contest", label: "🏆 Cuộc thi (Violympic, IOE...)" },
                    { id: "class", label: "🏫 Lớp học & Sổ liên lạc" },
                    { id: "utility", label: "⚡ Tiện ích nhà (Wifi, Điện...)" },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setAccountCategoryFilter(c.id)}
                      className={`btn-3d px-3.5 py-2 text-xs ${
                        accountCategoryFilter === c.id
                          ? "bg-slate-950 text-amber-300"
                          : "bg-slate-100 text-slate-900"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                {showAccountForm && (
                  <form
                    onSubmit={handleCreateAccount}
                    className="card-3d-sm bg-violet-50 p-4 md:p-5 mb-6 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-base text-slate-950">
                        {editingAccountId
                          ? "✏️ CHỈNH SỬA TÀI KHOẢN DÙNG CHUNG"
                          : "➕ THÊM TÀI KHOẢN LỚP HỌC / CUỘC THI / TIỆN ÍCH"}
                      </h3>
                      <button
                        type="button"
                        onClick={resetAccountForm}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-black mb-1">
                          TÊN TÀI KHOẢN / CUỘC THI *
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
                        <label className="block text-xs font-black mb-1">
                          PHÂN LOẠI
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
                          <option value="contest">🏆 Tài khoản Cuộc thi</option>
                          <option value="class">🏫 Tài khoản Lớp học</option>
                          <option value="utility">⚡ Tiện ích Gia đình</option>
                          <option value="other">📌 Khác</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-black mb-1">
                          CỦA THÀNH VIÊN NÀO?
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
                        <label className="block text-xs font-black mb-1">
                          TÊN ĐĂNG NHẬP (USERNAME / ID) *
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
                        <label className="block text-xs font-black mb-1">
                          MẬT KHẨU (PASSWORD) *
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
                        <label className="block text-xs font-black mb-1">
                          TRANG WEB / LINK ĐĂNG NHẬP
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
                      <label className="block text-xs font-black mb-1">
                        GHI CHÚ (MÃ HỌC SINH, SBD, SĐT ĐĂNG KÝ...)
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
                          className="btn-3d bg-slate-200 text-slate-900 px-5 py-2.5 text-sm"
                        >
                          Hủy
                        </button>
                      )}
                      <button
                        type="submit"
                        className="btn-3d bg-violet-600 text-white px-6 py-2.5 text-sm"
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
                        className="card-3d-sm p-4 md:p-5 bg-white flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="badge-3d bg-violet-200 text-slate-950 px-3 py-0.5 text-xs">
                              👤 {acc.ownerName}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => startEditAccount(acc)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Sửa tài khoản"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteItem("accounts", acc.id)
                                }
                                className="text-rose-600 hover:text-rose-800"
                                title="Xóa tài khoản"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <h3 className="text-lg font-black text-slate-950">
                            {acc.title}
                          </h3>
                          {acc.platformUrl && (
                            <div className="text-xs font-bold text-blue-700 truncate mt-0.5">
                              🔗 {acc.platformUrl}
                            </div>
                          )}

                          {/* Khối Copy nhanh Username & Password */}
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center justify-between bg-slate-100 border-2 border-slate-950 rounded-xl px-3 py-2">
                              <div>
                                <div className="text-[10px] font-black uppercase text-slate-600">
                                  TÊN ĐĂNG NHẬP / USER
                                </div>
                                <div className="font-black text-sm text-slate-950 select-all">
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
                                className="btn-3d bg-white px-3 py-1.5 text-xs"
                              >
                                {copiedKey === `u-${acc.id}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    Đã chép
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    Chép
                                  </>
                                )}
                              </button>
                            </div>

                            <div className="flex items-center justify-between bg-amber-100 border-2 border-slate-950 rounded-xl px-3 py-2">
                              <div>
                                <div className="text-[10px] font-black uppercase text-slate-700">
                                  MẬT KHẨU / PASSWORD
                                </div>
                                <div className="font-black text-sm text-slate-950 select-all">
                                  {showPass
                                    ? acc.accountPassword
                                    : "••••••••••"}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setVisiblePasswords((p) => ({
                                      ...p,
                                      [acc.id]: !p[acc.id],
                                    }))
                                  }
                                  className="btn-3d bg-white px-2.5 py-1.5 text-xs"
                                  title="Hiện/Ẩn mật khẩu"
                                >
                                  {showPass ? (
                                    <EyeOff className="w-3.5 h-3.5" />
                                  ) : (
                                    <Eye className="w-3.5 h-3.5" />
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
                                  className="btn-3d bg-white px-3 py-1.5 text-xs"
                                >
                                  {copiedKey === `p-${acc.id}` ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      Đã chép
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      Chép
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          {acc.note && (
                            <p className="text-xs font-bold text-slate-700 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-300">
                              📌 {acc.note}
                            </p>
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
                    <h2 className="text-xl font-black text-slate-950">
                      HỒ SƠ GIẤY TỜ CÁ NHÂN CỦA CÁC THÀNH VIÊN
                    </h2>
                    <p className="text-xs md:text-sm font-bold text-slate-700">
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
                    className="btn-3d bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2.5 text-sm"
                  >
                    <Plus className="w-5 h-5" />
                    Thêm Giấy Tờ Cá Nhân
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
                          ? "bg-slate-950 text-amber-300"
                          : "bg-slate-100 text-slate-900"
                      }`}
                    >
                      {holder === "all" ? "Tất cả thành viên" : `👤 ${holder}`}
                    </button>
                  ))}
                </div>

                {showDocForm && (
                  <form
                    onSubmit={handleCreateDocument}
                    className="card-3d-sm bg-amber-50 p-4 md:p-5 mb-6 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-base text-slate-950">
                        {editingDocId
                          ? "✏️ CHỈNH SỬA HỒ SƠ GIẤY TỜ CÁ NHÂN"
                          : "➕ THÊM GIẤY TỜ CÁ NHÂN MỚI (CÓ THỂ ĐÍNH KÈM ẢNH CHỤP)"}
                      </h3>
                      <button
                        type="button"
                        onClick={resetDocumentForm}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-black mb-1">
                          TÊN GIẤY TỜ *
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
                        <label className="block text-xs font-black mb-1">
                          LOẠI GIẤY TỜ
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
                          <option value="birth_cert">👶 Giấy khai sinh</option>
                          <option value="health_ins">🏥 Thẻ Bảo hiểm Y tế</option>
                          <option value="id_card">🪪 Căn cước công dân / Định danh</option>
                          <option value="passport">✈️ Hộ chiếu (Passport)</option>
                          <option value="school">🎓 Hồ sơ học bạ / Chứng chỉ</option>
                          <option value="other">📁 Giấy tờ khác</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-black mb-1">
                          CỦA THÀNH VIÊN NÀO? *
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
                        <label className="block text-xs font-black mb-1">
                          SỐ GIẤY TỜ / MÃ SỐ THẺ (TÙY CHỌN)
                        </label>
                        <input
                          type="text"
                          placeholder="VD: HS4797938291... (Có thể bỏ trống)"
                          value={docNumber}
                          onChange={(e) => setDocNumber(e.target.value)}
                          className="input-3d"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black mb-1">
                          NGÀY CẤP
                        </label>
                        <input
                          type="text"
                          placeholder="VD: 15/05/2016"
                          value={docIssueDate}
                          onChange={(e) => setDocIssueDate(e.target.value)}
                          className="input-3d"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black mb-1">
                          HẠN SỬ DỤNG (NẾU CÓ)
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
                        <label className="block text-xs font-black mb-1">
                          NƠI CẤP / NƠI ĐK KHÁM CHỮA BỆNH
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
                        <label className="block text-xs font-black mb-1">
                          📷 ẢNH MẶT TRƯỚC (HỖ TRỢ JPG, PNG, .HEIC)
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
                              className="h-24 w-auto rounded-lg border-2 border-slate-950 object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setDocFrontImg("")}
                              className="badge-3d bg-rose-500 text-white px-2 py-0.5 text-[10px] mt-1"
                            >
                              Xóa ảnh mặt trước
                            </button>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-black mb-1">
                          📷 ẢNH MẶT SAU (HỖ TRỢ JPG, PNG, .HEIC)
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
                              className="h-24 w-auto rounded-lg border-2 border-slate-950 object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setDocBackImg("")}
                              className="badge-3d bg-rose-500 text-white px-2 py-0.5 text-[10px] mt-1"
                            >
                              Xóa ảnh mặt sau
                            </button>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-black mb-1">
                          GHI CHÚ VỊ TRÍ CẤT GIỮ BẢN GỐC
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
                      <div className="card-3d-sm bg-sky-100 p-3 text-xs font-black text-slate-900">
                        ⏳ Đang chuyển đổi & nén ảnh (hỗ trợ cả định dạng .HEIC)... Vui lòng đợi trong giây lát!
                      </div>
                    )}

                    {docFormError && (
                      <div className="card-3d-sm bg-rose-100 p-3 text-xs font-black text-rose-900">
                        ⚠️ {docFormError}
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      {editingDocId && (
                        <button
                          type="button"
                          onClick={resetDocumentForm}
                          className="btn-3d bg-slate-200 text-slate-900 px-5 py-2.5 text-sm"
                        >
                          Hủy
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={docImgLoading}
                        className="btn-3d bg-blue-600 text-white px-6 py-2.5 text-sm disabled:opacity-50"
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
                      className="card-3d-sm p-4 md:p-5 bg-white flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="badge-3d bg-amber-300 text-slate-950 px-3 py-0.5 text-xs">
                            👤 {doc.holderName}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEditDocument(doc)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Sửa giấy tờ"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteItem("documents", doc.id)
                              }
                              className="text-rose-600 hover:text-rose-800"
                              title="Xóa giấy tờ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <h3 className="text-lg font-black text-slate-950">
                          {doc.title}
                        </h3>

                        <div className="mt-2 flex items-center justify-between bg-slate-100 border-2 border-slate-950 rounded-xl px-3 py-2">
                          <div>
                            <div className="text-[10px] font-black uppercase text-slate-600">
                              SỐ GIẤY TỜ / MÃ SỐ THẺ
                            </div>
                            <div className="font-black text-base text-blue-800 select-all">
                              {doc.docNumber || "Chưa cập nhật"}
                            </div>
                          </div>
                          {doc.docNumber && (
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(doc.docNumber, `doc-${doc.id}`)
                              }
                              className="btn-3d bg-white px-3 py-1.5 text-xs"
                            >
                              {copiedKey === `doc-${doc.id}` ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  Đã chép
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  Chép số
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-bold text-slate-800">
                          <div>📅 Ngày cấp: {doc.issueDate || "—"}</div>
                          <div>⏳ Hạn dùng: {doc.expiryDate || "—"}</div>
                          <div className="col-span-2">
                            🏛️ Nơi cấp / KCB: {doc.issuePlace || "—"}
                          </div>
                        </div>

                        {doc.note && (
                          <p className="text-xs font-bold text-slate-700 mt-2 bg-amber-50 p-2 rounded-lg border border-amber-300">
                            📌 {doc.note}
                          </p>
                        )}
                      </div>

                      {(doc.frontImage || doc.backImage) && (
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className="btn-3d bg-sky-200 hover:bg-sky-300 text-slate-950 py-2 text-xs w-full"
                        >
                          <ImageIcon className="w-4 h-4" />
                          Xem Ảnh Chụp Giấy Tờ Đính Kèm
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
                  <h2 className="text-xl font-black text-slate-950">
                    DANH SÁCH THÀNH VIÊN TRONG GIA ĐÌNH
                  </h2>
                  <p className="text-xs md:text-sm font-bold text-slate-700">
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
                    className="btn-3d bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2.5 text-sm"
                  >
                    <Plus className="w-5 h-5" />
                    Tạo Thành Viên Mới (Admin)
                  </button>
                )}
              </div>

              {!currentUser?.isAdmin && (
                <div className="card-3d-sm bg-amber-50 p-3.5 mb-5 text-xs font-extrabold text-slate-900">
                  🔒 Để đảm bảo bảo mật gia đình, tính năng tự tạo tài khoản đã được khóa. Chỉ tài khoản Quản trị viên (<span className="underline">Bố Minh - @bominh</span>) mới có quyền cấp tài khoản mới. Bạn có thể tự sửa thông tin hoặc đổi mật khẩu tài khoản của mình bên dưới.
                </div>
              )}

              {memberError && (
                <div className="card-3d-sm bg-rose-100 border-rose-900 p-3.5 mb-5 text-rose-950 font-extrabold text-sm">
                  ⚠️ {memberError}
                </div>
              )}

              {memberSuccess && (
                <div className="card-3d-sm bg-emerald-100 border-emerald-900 p-3.5 mb-5 text-emerald-950 font-extrabold text-sm">
                  ✅ {memberSuccess}
                </div>
              )}

              {currentUser?.isAdmin && showMemberForm && (
                <form
                  onSubmit={handleCreateMember}
                  className="card-3d-sm bg-amber-50 p-4 md:p-5 mb-6 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-base text-slate-950">
                      ➕ CẤP TÀI KHOẢN MỚI CHO THÀNH VIÊN GIA ĐÌNH (QUYỀN ADMIN)
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowMemberForm(false)}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-black mb-1">
                        TÊN HIỂN THỊ *
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
                      <label className="block text-xs font-black mb-1">
                        TÊN ĐĂNG NHẬP (VIẾT LIỀN) *
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
                      <label className="block text-xs font-black mb-1">
                        VAI TRÒ TRONG NHÀ
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
                      <label className="block text-xs font-black mb-1">
                        MẬT KHẨU KHỞI TẠO *
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
                      <span className="text-xs font-black text-slate-950">
                        MÀU ĐẠI DIỆN:
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
                          onClick={() => setMemColor(color)}
                          className={`w-7 h-7 rounded-full border-2 border-slate-950 transition-transform ${
                            memColor === color
                              ? "scale-125 ring-2 ring-offset-1 ring-slate-950"
                              : "opacity-75"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <button
                      type="submit"
                      className="btn-3d bg-blue-600 text-white px-6 py-2.5 text-sm"
                    >
                      Tạo Tài Khoản Thành Viên
                    </button>
                  </div>
                </form>
              )}

              {editingMemberId && (
                <form
                  onSubmit={handleUpdateMember}
                  className="card-3d-sm bg-sky-50 p-4 md:p-5 mb-6 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-base text-slate-950">
                      ✏️ CHỈNH SỬA THÔNG TIN & ĐỔI MẬT KHẨU THÀNH VIÊN
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingMemberId(null)}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-black mb-1">
                        TÊN HIỂN THỊ *
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
                      <label className="block text-xs font-black mb-1">
                        TÊN ĐĂNG NHẬP (ID) *
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
                      <label className="block text-xs font-black mb-1">
                        VAI TRÒ TRONG NHÀ
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
                      <label className="block text-xs font-black mb-1">
                        ĐỔI MẬT KHẨU MỚI (ĐỂ TRỐNG NẾU GIỮ NGUYÊN)
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
                      <span className="text-xs font-black text-slate-950">
                        MÀU ĐẠI DIỆN:
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
                          onClick={() => setEditMemColor(color)}
                          className={`w-7 h-7 rounded-full border-2 border-slate-950 transition-transform ${
                            editMemColor === color
                              ? "scale-125 ring-2 ring-offset-1 ring-slate-950"
                              : "opacity-75"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingMemberId(null)}
                        className="btn-3d bg-slate-200 text-slate-900 px-5 py-2.5 text-sm"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="btn-3d bg-blue-600 text-white px-6 py-2.5 text-sm"
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
                      className="card-3d-sm p-4 bg-white flex flex-col items-center text-center justify-between gap-2"
                    >
                      <div className="flex flex-col items-center gap-2 w-full">
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center text-white font-black text-2xl border-2 border-slate-950 shadow-[0_3px_0_#0f172a]"
                          style={{ backgroundColor: m.avatarColor }}
                        >
                          {m.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="font-black text-lg text-slate-950">
                          {m.fullName}
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          <span className="badge-3d bg-slate-100 px-3 py-0.5 text-xs">
                            {m.roleLabel}
                          </span>
                          {isMemberAdmin && (
                            <span className="badge-3d bg-amber-300 text-slate-950 px-2.5 py-0.5 text-xs">
                              👑 ADMIN
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-slate-600">
                          ID đăng nhập: @{m.username}
                        </div>
                      </div>

                      <div className="w-full pt-2 mt-1 border-t border-dashed border-slate-200 flex flex-col gap-2">
                        {currentUser?.id === m.id && (
                          <div className="badge-3d w-full py-1.5 text-xs bg-emerald-400 text-slate-950 text-center">
                            ✓ Đang đăng nhập
                          </div>
                        )}
                        {canEditMember && (
                          <button
                            type="button"
                            onClick={() => startEditMember(m)}
                            className="btn-3d w-full py-2 text-xs bg-sky-100 hover:bg-sky-200 text-slate-950"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Sửa / Đổi mật khẩu
                          </button>
                        )}
                        {currentUser?.isAdmin &&
                          !isMemberAdmin &&
                          currentUser?.id !== m.id && (
                            <button
                              type="button"
                              onClick={() => handleDeleteItem("members", m.id)}
                              className="btn-3d w-full py-2 text-xs bg-rose-100 hover:bg-rose-200 text-rose-900"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Xóa tài khoản này
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
              <div className="card-3d p-5 bg-emerald-100">
                <div className="flex items-center gap-3">
                  <Database className="w-8 h-8 text-emerald-900" />
                  <div>
                    <h3 className="font-black text-base text-slate-950">
                      Cơ sở dữ liệu: Neon PostgreSQL & Drizzle ORM
                    </h3>
                    <p className="text-xs font-bold text-slate-800">
                      Trạng thái hiện tại:{" "}
                      {dbMode === "neon"
                        ? "Đang kết nối trực tiếp Neon Cloud PostgreSQL"
                        : "Đang chạy kho dữ liệu cục bộ (.data/family-db.json) — Gắn DATABASE_URL từ neon.com trên Vercel để tự động đồng bộ 8 bảng đám mây."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card-3d p-5 bg-sky-100 flex flex-col justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-8 h-8 text-sky-900 shrink-0" />
                  <div>
                    <h3 className="font-black text-base text-slate-950">
                      Ứng dụng Android APK (Capacitor Native)
                    </h3>
                    <p className="text-xs font-bold text-slate-800">
                      Mã gói: com.giadinh.quanly • Tương thích mọi điện thoại Android trong gia đình.
                    </p>
                  </div>
                </div>
                <a
                  href="/quan-ly-gia-dinh.apk"
                  download="quan-ly-gia-dinh.apk"
                  className="btn-3d bg-amber-300 hover:bg-amber-200 text-slate-950 py-2.5 px-4 text-xs md:text-sm w-full text-center"
                >
                  📲 Tải File Cài Đặt Android (quan-ly-gia-dinh.apk)
                </a>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL XEM LỊCH SỬ ĐÓNG TIỀN CÁC KỲ */}
      {historyModalExpense && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="card-3d bg-white w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-950">
                📜 LỊCH SỬ ĐÓNG: {historyModalExpense.title}
              </h3>
              <button
                type="button"
                onClick={() => setHistoryModalExpense(null)}
                className="btn-3d bg-slate-100 p-1.5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {historyModalExpense.history.length === 0 ? (
              <p className="text-sm font-bold text-slate-600 py-6 text-center">
                Chưa có lịch sử thanh toán cho khoản này.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto">
                {historyModalExpense.history.map((h) => (
                  <div
                    key={h.id}
                    className="card-3d-sm p-3 bg-emerald-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-black text-sm text-slate-950">
                        Kỳ: {h.periodKey} — {formatVND(h.paidAmount)}
                      </div>
                      <div className="text-xs font-bold text-slate-700">
                        Người đóng: {h.paidByName}
                      </div>
                    </div>
                    <span className="badge-3d bg-emerald-400 px-2.5 py-0.5 text-xs">
                      ĐÃ ĐÓNG
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
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
          <div className="card-3d bg-white w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-950">
                🪪 {previewDoc.title} ({previewDoc.holderName})
              </h3>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="btn-3d bg-slate-100 p-1.5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {previewDoc.frontImage && (
                <div>
                  <div className="text-xs font-black mb-1">ẢNH MẶT TRƯỚC:</div>
                  <img
                    src={previewDoc.frontImage}
                    alt="Mặt trước"
                    className="w-full rounded-xl border-2 border-slate-950"
                  />
                </div>
              )}
              {previewDoc.backImage && (
                <div>
                  <div className="text-xs font-black mb-1">ẢNH MẶT SAU:</div>
                  <img
                    src={previewDoc.backImage}
                    alt="Mặt sau"
                    className="w-full rounded-xl border-2 border-slate-950"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* THANH ĐIỀU HƯỚNG ĐÁY (BOTTOM NAV) CHUẨN ANDROID APK / MOBILE */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t-[3px] border-slate-950 px-2 py-2 grid grid-cols-5 gap-1 shadow-[0_-4px_0_#0f172a]">
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
              className={`flex flex-col items-center justify-center py-1.5 rounded-xl border-2 font-black text-[11px] transition-all ${
                isActive
                  ? "bg-amber-300 border-slate-950 text-slate-950 shadow-[0_2px_0_#0f172a]"
                  : "border-transparent text-slate-700"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {loading && (
        <div className="fixed bottom-4 right-4 z-50 badge-3d bg-amber-300 px-4 py-2 text-xs">
          Đang đồng bộ dữ liệu gia đình...
        </div>
      )}
    </div>
  );
}
