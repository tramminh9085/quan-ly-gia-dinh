import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

export function isNeonConfigured(): boolean {
  const url = process.env.DATABASE_URL;
  return Boolean(
    url &&
      url.startsWith("postgres") &&
      !url.includes("ep-example") &&
      !url.includes("user:password@")
  );
}

export function getNeonSql() {
  if (!isNeonConfigured()) return null;
  return neon(process.env.DATABASE_URL!);
}

export function getDrizzleDb() {
  const sql = getNeonSql();
  if (!sql) return null;
  return drizzle(sql, { schema });
}

// ============================================================================
// Kiểu dữ liệu đồng nhất cho cả Neon Postgres & Local Persistent Fallback
// ============================================================================

export interface UserRecord {
  id: number;
  username: string;
  fullName: string;
  roleLabel: string;
  isAdmin: boolean;
  passwordHash: string;
  avatarColor: string;
  createdAt: string;
}

export interface RecurringExpenseRecord {
  id: number;
  title: string;
  amount: number;
  cycle: "monthly" | "yearly";
  dueDay: number;
  dueMonth: number;
  category: string;
  note: string;
  isActive: boolean;
  createdBy: number | null;
  createdAt: string;
}

export interface ExpensePaymentRecord {
  id: number;
  expenseId: number;
  periodKey: string;
  paidAmount: number;
  paidBy: number | null;
  paidAt: string;
  note: string;
}

export interface IncomeRecord {
  id: number;
  title: string;
  amount: number;
  cycle: "monthly" | "quarterly" | "yearly";
  periodKey: string;
  receivedBy: number | null;
  note: string;
  createdAt: string;
}

export interface SharedAccountRecord {
  id: number;
  title: string;
  category: "class" | "contest" | "utility" | "entertainment" | "other";
  platformUrl: string;
  accountUsername: string;
  accountPassword: string;
  memberId: number | null;
  ownerName: string;
  note: string;
  createdAt: string;
}

export interface PersonalDocumentRecord {
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
  createdAt: string;
}

export interface FamilyEventRecord {
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
  createdBy: number | null;
  createdAt: string;
}

export interface KidsScheduleRecord {
  id: number;
  childId: number | null;
  childName: string;
  subject: string;
  scheduleType: "main" | "extra" | "activity";
  dayOfWeek: number; // 1 = Thứ 2 ... 7 = Chủ Nhật
  startTime: string;
  endTime: string;
  location: string;
  teacherInfo: string;
  dropoffBy: number | null;
  dropoffName: string;
  pickupBy: number | null;
  pickupName: string;
  note: string;
  createdAt: string;
}

export interface FamilyDatabaseStore {
  users: UserRecord[];
  recurringExpenses: RecurringExpenseRecord[];
  expensePayments: ExpensePaymentRecord[];
  incomes: IncomeRecord[];
  sharedAccounts: SharedAccountRecord[];
  personalDocuments: PersonalDocumentRecord[];
  familyEvents: FamilyEventRecord[];
  kidsSchedules: KidsScheduleRecord[];
}

function createInitialSeedData(): FamilyDatabaseStore {
  const defaultPasswordHash = bcrypt.hashSync("123456", 8);
  const nowIso = new Date().toISOString();
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");
  const monthPeriod = `${currentYear}-${currentMonth}`;

  return {
    users: [
      {
        id: 1,
        username: "bominh",
        fullName: "Bố Minh",
        roleLabel: "Bố (Admin)",
        isAdmin: true,
        passwordHash: defaultPasswordHash,
        avatarColor: "#2563EB",
        createdAt: nowIso,
      },
    ],
    recurringExpenses: [
      {
        id: 2,
        title: "Quỹ lớp & Tiền ăn bán trú 2 con",
        amount: 2400000,
        cycle: "monthly",
        dueDay: 5,
        dueMonth: 1,
        category: "Học tập",
        note: "Đóng cho cô chủ nhiệm lớp 5A và 2B trước ngày 05 hàng tháng",
        isActive: true,
        createdBy: 1,
        createdAt: nowIso,
      },
      {
        id: 3,
        title: "Tiền điện EVN & Nước sạch",
        amount: 1850000,
        cycle: "monthly",
        dueDay: 12,
        dueMonth: 1,
        category: "Điện nước",
        note: "Mã KH Điện: PD120098871",
        isActive: true,
        createdBy: 1,
        createdAt: nowIso,
      },
      {
        id: 4,
        title: "Học phí Tiếng Anh ILA & Toán Tư Duy",
        amount: 3200000,
        cycle: "monthly",
        dueDay: 15,
        dueMonth: 1,
        category: "Học tập",
        note: "Lớp Tiếng Anh của Minh Khôi và Bảo An",
        isActive: true,
        createdBy: 1,
        createdAt: nowIso,
      },
      {
        id: 5,
        title: "Cước Internet Viettel & Truyền hình",
        amount: 290000,
        cycle: "monthly",
        dueDay: 20,
        dueMonth: 1,
        category: "Tiện ích",
        note: "Gói Mesh 300Mbps",
        isActive: true,
        createdBy: 1,
        createdAt: nowIso,
      },
      {
        id: 6,
        title: "Bảo hiểm Y tế & Bảo hiểm Nhân thọ Gia đình",
        amount: 18000000,
        cycle: "yearly",
        dueDay: 15,
        dueMonth: 11,
        category: "Bảo hiểm",
        note: "Gia hạn định kỳ tháng 11 hàng năm",
        isActive: true,
        createdBy: 1,
        createdAt: nowIso,
      },
    ],
    expensePayments: [
      {
        id: 1,
        expenseId: 2,
        periodKey: monthPeriod,
        paidAmount: 2400000,
        paidBy: 1,
        paidAt: nowIso,
        note: "Đã chuyển khoản cho cô chủ nhiệm",
      },
      {
        id: 2,
        expenseId: 5,
        periodKey: monthPeriod,
        paidAmount: 290000,
        paidBy: 1,
        paidAt: nowIso,
        note: "Bố Minh thanh toán qua Viettel Money",
      },
    ],
    incomes: [
      {
        id: 1,
        title: "Lương tháng của Bố Minh",
        amount: 25000000,
        cycle: "monthly",
        periodKey: monthPeriod,
        receivedBy: 1,
        note: "Chuyển khoản ngày 05 hàng tháng",
        createdAt: nowIso,
      },
      {
        id: 2,
        title: "Thu nhập tháng bổ sung gia đình",
        amount: 18000000,
        cycle: "monthly",
        periodKey: monthPeriod,
        receivedBy: 1,
        note: "Thu nhập chính + phụ cấp",
        createdAt: nowIso,
      },
      {
        id: 3,
        title: "Cổ tức & Thưởng cuối năm gia đình",
        amount: 45000000,
        cycle: "yearly",
        periodKey: `${currentYear}`,
        receivedBy: 1,
        note: "Khoản thu định kỳ hàng năm",
        createdAt: nowIso,
      },
    ],
    sharedAccounts: [
      {
        id: 1,
        title: "Violympic Toán & Tiếng Việt (Bé Minh Khôi)",
        category: "contest",
        platformUrl: "https://violympic.vn",
        accountUsername: "minhkhoi_5a_2026",
        accountPassword: "Khoi@2026#",
        memberId: null,
        ownerName: "Bé Minh Khôi",
        note: "ID học sinh: 8829102 - Trường Tiểu học Nguyễn Du",
        createdAt: nowIso,
      },
      {
        id: 2,
        title: "Cuộc thi Tiếng Anh IOE Quốc gia (Bé Minh Khôi)",
        category: "contest",
        platformUrl: "https://ioe.vn",
        accountUsername: "khoinm_ioe5a",
        accountPassword: "IoePass@123",
        memberId: null,
        ownerName: "Bé Minh Khôi",
        note: "Đã qua vòng cấp Trường, thi tiếp vòng Quận",
        createdAt: nowIso,
      },
      {
        id: 3,
        title: "Trạng Nguyên Tiếng Việt (Bé Bảo An - Lớp 2B)",
        category: "contest",
        platformUrl: "https://trangnguyen.edu.vn",
        accountUsername: "baoan_lop2b",
        accountPassword: "BaoAn2019!",
        memberId: null,
        ownerName: "Bé Bảo An",
        note: "SBD: TN992011 - Cô Hoa hướng dẫn",
        createdAt: nowIso,
      },
      {
        id: 4,
        title: "Tài khoản LMS & Sổ liên lạc điện tử eNetViet",
        category: "class",
        platformUrl: "https://enetviet.com",
        accountUsername: "0912345678",
        accountPassword: "GiaDinh@2026",
        memberId: 1,
        ownerName: "Cả gia đình (2 bé)",
        note: "Nhận thông báo của cả 2 lớp",
        createdAt: nowIso,
      },
      {
        id: 5,
        title: "Wifi Gia đình & Tài khoản Quản trị Modem",
        category: "utility",
        platformUrl: "192.168.1.1",
        accountUsername: "GiaDinhMinhLan_5G",
        accountPassword: "ToAmHanhPhuc8888",
        memberId: 1,
        ownerName: "Cả gia đình",
        note: "Pass Admin modem mặt dưới: Viettel@123",
        createdAt: nowIso,
      },
    ],
    personalDocuments: [
      {
        id: 1,
        title: "Giấy khai sinh (Bản chính) - Bé Minh Khôi",
        docType: "birth_cert",
        docNumber: "148/2016 - Quyển số 01/2016",
        memberId: null,
        holderName: "Bé Minh Khôi",
        issueDate: "15/05/2016",
        expiryDate: "Vĩnh viễn",
        issuePlace: "UBND Phường Bến Nghé, Quận 1",
        frontImage: "",
        backImage: "",
        note: "Mã định danh cá nhân: 079216008821 - Cất tại ngăn tủ hồ sơ số 1",
        createdAt: nowIso,
      },
      {
        id: 2,
        title: "Thẻ Bảo hiểm Y tế Học sinh - Bé Minh Khôi",
        docType: "health_ins",
        docNumber: "HS4797938291022",
        memberId: null,
        holderName: "Bé Minh Khôi",
        issueDate: "01/01/2026",
        expiryDate: "31/12/2026",
        issuePlace: "Bệnh viện Nhi Đồng 2 (Nơi ĐK KCB ban đầu)",
        frontImage: "",
        backImage: "",
        note: "Tích hợp trên VssID gia đình",
        createdAt: nowIso,
      },
      {
        id: 3,
        title: "Giấy khai sinh & Mã định danh - Bé Bảo An",
        docType: "birth_cert",
        docNumber: "219/2019 - Quyển số 02/2019",
        memberId: null,
        holderName: "Bé Bảo An",
        issueDate: "20/08/2019",
        expiryDate: "Vĩnh viễn",
        issuePlace: "UBND Phường Bến Nghé, Quận 1",
        frontImage: "",
        backImage: "",
        note: "Mã định danh cá nhân: 079319005514",
        createdAt: nowIso,
      },
      {
        id: 4,
        title: "Thẻ Căn cước công dân gắn chip - Bố Minh",
        docType: "id_card",
        docNumber: "079088001234",
        memberId: 1,
        holderName: "Bố Minh",
        issueDate: "10/04/2022",
        expiryDate: "10/04/2033",
        issuePlace: "Cục Cảnh sát QLHC về TTXH",
        frontImage: "",
        backImage: "",
        note: "Đã định danh VNeID Mức 2",
        createdAt: nowIso,
      },
    ],
    familyEvents: [
      {
        id: 1,
        title: "Giỗ Ông Nội (Cụ Nguyễn Văn Đức)",
        eventType: "ancestor",
        calendarType: "lunar",
        day: 15,
        month: 10,
        year: null,
        isRecurring: true,
        remindDaysBefore: 7,
        note: "Làm cỗ tại nhà lớn, mua hoa sen trắng & trái cây từ chiều 14 Âm lịch",
        createdBy: 1,
        createdAt: nowIso,
      },
      {
        id: 2,
        title: "Giỗ Bà Ngoại",
        eventType: "ancestor",
        calendarType: "lunar",
        day: 24,
        month: 11,
        year: null,
        isRecurring: true,
        remindDaysBefore: 7,
        note: "Về quê ngoại sáng sớm, chuẩn bị lễ vật",
        createdBy: 1,
        createdAt: nowIso,
      },
      {
        id: 3,
        title: "Kỷ niệm Ngày Cưới Bố Minh & Mẹ Lan",
        eventType: "anniversary",
        calendarType: "solar",
        day: 28,
        month: 11,
        year: null,
        isRecurring: true,
        remindDaysBefore: 5,
        note: "Đặt bàn ăn tối gia đình 4 người",
        createdBy: 1,
        createdAt: nowIso,
      },
      {
        id: 4,
        title: "Sinh nhật Bé Bảo An",
        eventType: "birthday",
        calendarType: "solar",
        day: 12,
        month: 12,
        year: null,
        isRecurring: true,
        remindDaysBefore: 7,
        note: "Đặt bánh kem dâu tây bé thích",
        createdBy: 1,
        createdAt: nowIso,
      },
    ],
    kidsSchedules: [
      {
        id: 1,
        childId: null,
        childName: "Bé Minh Khôi",
        subject: "Học chính khóa Lớp 5A (Bán trú)",
        scheduleType: "main",
        dayOfWeek: 1, // Thứ 2
        startTime: "07:15",
        endTime: "16:30",
        location: "Trường Tiểu học Nguyễn Du - Phòng 302",
        teacherInfo: "Cô Hạnh (CN): 0908.111.222",
        dropoffBy: 1,
        dropoffName: "Bố Minh",
        pickupBy: null,
        pickupName: "Mẹ Lan",
        note: "Mặc đồng phục lễ chào cờ, mang áo khoác",
        createdAt: nowIso,
      },
      {
        id: 2,
        childId: null,
        childName: "Bé Minh Khôi",
        subject: "Học thêm Tiếng Anh ILA (Chứng chỉ Flyers)",
        scheduleType: "extra",
        dayOfWeek: 3, // Thứ 4
        startTime: "18:00",
        endTime: "19:30",
        location: "Trung tâm ILA - Tầng 3, 146 Nguyễn Đình Chiểu",
        teacherInfo: "Ms. Thảo (Trợ giảng): 0933.444.555",
        dropoffBy: null,
        dropoffName: "Mẹ Lan",
        pickupBy: 1,
        pickupName: "Bố Minh",
        note: "Nhớ mang sách Workbook và tai nghe",
        createdAt: nowIso,
      },
      {
        id: 3,
        childId: null,
        childName: "Bé Minh Khôi",
        subject: "CLB Toán Tư Duy & Luyện Violympic",
        scheduleType: "extra",
        dayOfWeek: 6, // Thứ 7
        startTime: "08:30",
        endTime: "10:30",
        location: "Nhà thầy Nam - Số 18 Lê Quý Đôn",
        teacherInfo: "Thầy Nam: 0919.888.999",
        dropoffBy: 1,
        dropoffName: "Bố Minh",
        pickupBy: 1,
        pickupName: "Bố Minh",
        note: "Mang máy tính bảng để thi thử trên Violympic",
        createdAt: nowIso,
      },
      {
        id: 4,
        childId: null,
        childName: "Bé Bảo An",
        subject: "Học chính khóa Lớp 2B (Bán trú)",
        scheduleType: "main",
        dayOfWeek: 1, // Thứ 2
        startTime: "07:30",
        endTime: "16:15",
        location: "Trường Tiểu học Nguyễn Du - Phòng 105",
        teacherInfo: "Cô Hoa (CN): 0909.333.666",
        dropoffBy: 1,
        dropoffName: "Bố Minh",
        pickupBy: null,
        pickupName: "Mẹ Lan",
        note: "Mang bình nước ấm",
        createdAt: nowIso,
      },
      {
        id: 5,
        childId: null,
        childName: "Bé Bảo An",
        subject: "Lớp Vẽ Sáng Tạo & Đàn Piano",
        scheduleType: "activity",
        dayOfWeek: 6, // Thứ 7
        startTime: "15:00",
        endTime: "17:00",
        location: "Nhà Thiếu Nhi Thành Phố - Khu B",
        teacherInfo: "Cô Mai: 0977.222.333",
        dropoffBy: null,
        dropoffName: "Mẹ Lan",
        pickupBy: 1,
        pickupName: "Bố Minh",
        note: "Mang hộp màu nước 24 màu",
        createdAt: nowIso,
      },
      {
        id: 6,
        childId: null,
        childName: "Bé Minh Khôi",
        subject: "Học Bơi & Thể thao cuối tuần",
        scheduleType: "activity",
        dayOfWeek: 7, // Chủ Nhật
        startTime: "09:00",
        endTime: "10:30",
        location: "Hồ bơi Yết Kiêu",
        teacherInfo: "HLV Tuấn: 0944.555.666",
        dropoffBy: 1,
        dropoffName: "Bố Minh",
        pickupBy: 1,
        pickupName: "Bố Minh",
        note: "Kính bơi và mũ bơi trong túi xanh",
        createdAt: nowIso,
      },
    ],
  };
}

function getLocalStorePath(): string {
  const isVercel = Boolean(process.env.VERCEL);
  const dir = isVercel
    ? "/tmp"
    : path.join(process.cwd(), ".data");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, "family-db.json");
}

let memoryStore: FamilyDatabaseStore | null = null;
let neonInitialized = false;

export async function ensureNeonSchema() {
  if (neonInitialized || !isNeonConfigured()) return;
  const sql = getNeonSql();
  if (!sql) return;

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        full_name TEXT NOT NULL,
        role_label TEXT NOT NULL DEFAULT 'Thành viên',
        is_admin BOOLEAN NOT NULL DEFAULT FALSE,
        password_hash TEXT NOT NULL,
        avatar_color TEXT NOT NULL DEFAULT '#2563EB',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS recurring_expenses (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        amount BIGINT NOT NULL,
        cycle TEXT NOT NULL,
        due_day INTEGER NOT NULL DEFAULT 1,
        due_month INTEGER DEFAULT 1,
        category TEXT NOT NULL DEFAULT 'Sinh hoạt',
        note TEXT DEFAULT '',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS expense_payments (
        id SERIAL PRIMARY KEY,
        expense_id INTEGER NOT NULL REFERENCES recurring_expenses(id) ON DELETE CASCADE,
        period_key TEXT NOT NULL,
        paid_amount BIGINT NOT NULL,
        paid_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        paid_at TIMESTAMP NOT NULL DEFAULT NOW(),
        note TEXT DEFAULT ''
      );
    `;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS expense_period_idx ON expense_payments(expense_id, period_key);
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS incomes (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        amount BIGINT NOT NULL,
        cycle TEXT NOT NULL,
        period_key TEXT NOT NULL,
        received_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        note TEXT DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS shared_accounts (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'class',
        platform_url TEXT DEFAULT '',
        account_username TEXT NOT NULL,
        account_password TEXT NOT NULL,
        member_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        owner_name TEXT DEFAULT 'Cả gia đình',
        note TEXT DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS personal_documents (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        doc_type TEXT NOT NULL DEFAULT 'birth_cert',
        doc_number TEXT NOT NULL,
        member_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        holder_name TEXT NOT NULL,
        issue_date TEXT DEFAULT '',
        expiry_date TEXT DEFAULT '',
        issue_place TEXT DEFAULT '',
        front_image TEXT DEFAULT '',
        back_image TEXT DEFAULT '',
        note TEXT DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS family_events (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        event_type TEXT NOT NULL DEFAULT 'ancestor',
        calendar_type TEXT NOT NULL DEFAULT 'lunar',
        day INTEGER NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER,
        is_recurring BOOLEAN NOT NULL DEFAULT TRUE,
        remind_days_before INTEGER NOT NULL DEFAULT 7,
        note TEXT DEFAULT '',
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS kids_schedules (
        id SERIAL PRIMARY KEY,
        child_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        child_name TEXT NOT NULL,
        subject TEXT NOT NULL,
        schedule_type TEXT NOT NULL DEFAULT 'extra',
        day_of_week INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        location TEXT DEFAULT '',
        teacher_info TEXT DEFAULT '',
        dropoff_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        dropoff_name TEXT DEFAULT 'Bố',
        pickup_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        pickup_name TEXT DEFAULT 'Mẹ',
        note TEXT DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    // Seed dữ liệu ban đầu nếu bảng users trống
    const existingUsers = await sql`SELECT COUNT(*)::int AS count FROM users`;
    if (existingUsers[0]?.count === 0) {
      const seed = createInitialSeedData();
      for (const u of seed.users) {
        await sql`
          INSERT INTO users (username, full_name, role_label, is_admin, password_hash, avatar_color)
          VALUES (${u.username}, ${u.fullName}, ${u.roleLabel}, ${u.isAdmin}, ${u.passwordHash}, ${u.avatarColor})
          ON CONFLICT (username) DO NOTHING
        `;
      }
      for (const e of seed.recurringExpenses) {
        await sql`
          INSERT INTO recurring_expenses (title, amount, cycle, due_day, due_month, category, note, is_active, created_by)
          VALUES (${e.title}, ${e.amount}, ${e.cycle}, ${e.dueDay}, ${e.dueMonth}, ${e.category}, ${e.note}, ${e.isActive}, ${e.createdBy})
        `;
      }
      for (const i of seed.incomes) {
        await sql`
          INSERT INTO incomes (title, amount, cycle, period_key, received_by, note)
          VALUES (${i.title}, ${i.amount}, ${i.cycle}, ${i.periodKey}, ${i.receivedBy}, ${i.note})
        `;
      }
      for (const a of seed.sharedAccounts) {
        await sql`
          INSERT INTO shared_accounts (title, category, platform_url, account_username, account_password, member_id, owner_name, note)
          VALUES (${a.title}, ${a.category}, ${a.platformUrl}, ${a.accountUsername}, ${a.accountPassword}, ${a.memberId}, ${a.ownerName}, ${a.note})
        `;
      }
      for (const d of seed.personalDocuments) {
        await sql`
          INSERT INTO personal_documents (title, doc_type, doc_number, member_id, holder_name, issue_date, expiry_date, issue_place, note)
          VALUES (${d.title}, ${d.docType}, ${d.docNumber}, ${d.memberId}, ${d.holderName}, ${d.issueDate}, ${d.expiryDate}, ${d.issuePlace}, ${d.note})
        `;
      }
      for (const ev of seed.familyEvents) {
        await sql`
          INSERT INTO family_events (title, event_type, calendar_type, day, month, year, is_recurring, remind_days_before, note, created_by)
          VALUES (${ev.title}, ${ev.eventType}, ${ev.calendarType}, ${ev.day}, ${ev.month}, ${ev.year}, ${ev.isRecurring}, ${ev.remindDaysBefore}, ${ev.note}, ${ev.createdBy})
        `;
      }
      for (const ks of seed.kidsSchedules) {
        await sql`
          INSERT INTO kids_schedules (child_id, child_name, subject, schedule_type, day_of_week, start_time, end_time, location, teacher_info, dropoff_by, dropoff_name, pickup_by, pickup_name, note)
          VALUES (${ks.childId}, ${ks.childName}, ${ks.subject}, ${ks.scheduleType}, ${ks.dayOfWeek}, ${ks.startTime}, ${ks.endTime}, ${ks.location}, ${ks.teacherInfo}, ${ks.dropoffBy}, ${ks.dropoffName}, ${ks.pickupBy}, ${ks.pickupName}, ${ks.note})
        `;
      }
    } else {
      // Xóa các khoản đóng định kỳ theo tuần cũ nếu có
      await sql`DELETE FROM recurring_expenses WHERE cycle = 'weekly'`;
      // Nếu DB đã có dữ liệu cũ chưa khởi tạo Admin, nâng cấp bominh thành Admin và xóa các user mẫu
      const adminCheck = await sql`SELECT COUNT(*)::int AS count FROM users WHERE is_admin = TRUE`;
      if (adminCheck[0]?.count === 0) {
        await sql`
          DELETE FROM users WHERE username IN ('melan', 'minhkhoi', 'baoan')
        `;
        const updated = await sql`
          UPDATE users
          SET is_admin = TRUE, role_label = 'Bố (Admin)'
          WHERE username = 'bominh'
          RETURNING id
        `;
        if (updated.length === 0) {
          const defaultHash = bcrypt.hashSync("123456", 8);
          await sql`
            INSERT INTO users (username, full_name, role_label, is_admin, password_hash, avatar_color)
            VALUES ('bominh', 'Bố Minh', 'Bố (Admin)', TRUE, ${defaultHash}, '#2563EB')
            ON CONFLICT (username) DO UPDATE SET is_admin = TRUE, role_label = 'Bố (Admin)'
          `;
        }
      }
    }
    neonInitialized = true;
  } catch (err) {
    console.error("Neon auto-init warning:", err);
  }
}

export function readLocalStore(): FamilyDatabaseStore {
  if (memoryStore) return memoryStore;
  const filePath = getLocalStorePath();
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw) as FamilyDatabaseStore;
      // Lọc bỏ các khoản đóng theo tuần cũ nếu có
      if (parsed.recurringExpenses?.some((e) => (e.cycle as string) === "weekly")) {
        parsed.recurringExpenses = parsed.recurringExpenses.filter(
          (e) => (e.cycle as string) !== "weekly"
        );
      }
      // Nâng cấp store cũ nếu chưa có tài khoản Admin
      if (!parsed.users.some((u) => u.isAdmin)) {
        parsed.users = parsed.users
          .filter((u) => !["melan", "minhkhoi", "baoan"].includes(u.username))
          .map((u) =>
            u.username === "bominh"
              ? { ...u, isAdmin: true, roleLabel: "Bố (Admin)" }
              : { ...u, isAdmin: Boolean(u.isAdmin) }
          );
        if (!parsed.users.some((u) => u.username === "bominh")) {
          parsed.users.unshift(createInitialSeedData().users[0]);
        }
        try {
          fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), "utf-8");
        } catch {
          // Ignore write error on read-only fs
        }
      }
      memoryStore = parsed;
      return memoryStore;
    } catch {
      // Fallback nếu file lỗi
    }
  }
  const initial = createInitialSeedData();
  memoryStore = initial;
  try {
    fs.writeFileSync(filePath, JSON.stringify(initial, null, 2), "utf-8");
  } catch {
    // Ignore write error on read-only fs
  }
  return initial;
}

export function writeLocalStore(store: FamilyDatabaseStore): void {
  memoryStore = store;
  try {
    const filePath = getLocalStorePath();
    fs.writeFileSync(filePath, JSON.stringify(store, null, 2), "utf-8");
  } catch {
    // Ignore write error on read-only fs
  }
}
