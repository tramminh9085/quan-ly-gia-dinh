import {
  pgTable,
  serial,
  text,
  bigint,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// 1. Thành viên Gia đình (Users / Family Members)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  fullName: text("full_name").notNull(),
  roleLabel: text("role_label").notNull().default("Thành viên"), // Bố, Mẹ, Con, Ông, Bà
  isAdmin: boolean("is_admin").notNull().default(false),
  passwordHash: text("password_hash").notNull(),
  avatarColor: text("avatar_color").notNull().default("#2563EB"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 2. Các khoản phải đóng định kỳ (Tuần / Tháng / Năm)
export const recurringExpenses = pgTable("recurring_expenses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  cycle: text("cycle").notNull(), // 'weekly' | 'monthly' | 'yearly'
  dueDay: integer("due_day").notNull().default(1), // Thứ (2-8) nếu weekly, Ngày (1-31) nếu monthly/yearly
  dueMonth: integer("due_month").default(1), // Tháng (1-12) nếu yearly
  category: text("category").notNull().default("Sinh hoạt"),
  note: text("note").default(""),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 3. Lịch sử đóng tiền theo từng kỳ (Expense Payments)
export const expensePayments = pgTable(
  "expense_payments",
  {
    id: serial("id").primaryKey(),
    expenseId: integer("expense_id")
      .notNull()
      .references(() => recurringExpenses.id, { onDelete: "cascade" }),
    periodKey: text("period_key").notNull(), // VD: '2026-W46', '2026-11', '2026'
    paidAmount: bigint("paid_amount", { mode: "number" }).notNull(),
    paidBy: integer("paid_by").references(() => users.id, {
      onDelete: "set null",
    }),
    paidAt: timestamp("paid_at").defaultNow().notNull(),
    note: text("note").default(""),
  },
  (table) => ({
    expensePeriodIdx: uniqueIndex("expense_period_idx").on(
      table.expenseId,
      table.periodKey
    ),
  })
);

// 4. Các khoản thu (Tháng / Quý / Năm)
export const incomes = pgTable("incomes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  cycle: text("cycle").notNull(), // 'monthly' | 'quarterly' | 'yearly'
  periodKey: text("period_key").notNull(), // '2026-11', '2026-Q4' hoặc '2026'
  dueDate: text("due_date").default(""), // Ngày thu cụ thể (YYYY-MM-DD)
  nextDueDate: text("next_due_date").default(""), // Ngày thu tiếp theo (+3 tháng nếu là quý)
  receivedBy: integer("received_by").references(() => users.id, {
    onDelete: "set null",
  }),
  note: text("note").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 4b. Lịch sử đã thu tiền theo từng kỳ (Income Receipts)
export const incomeReceipts = pgTable(
  "income_receipts",
  {
    id: serial("id").primaryKey(),
    incomeId: integer("income_id")
      .notNull()
      .references(() => incomes.id, { onDelete: "cascade" }),
    periodKey: text("period_key").notNull(), // VD: '2026-11', '2026-Q4', '2026'
    receivedAmount: bigint("received_amount", { mode: "number" }).notNull(),
    receivedBy: integer("received_by").references(() => users.id, {
      onDelete: "set null",
    }),
    receivedAt: timestamp("received_at").defaultNow().notNull(),
    note: text("note").default(""),
  },
  (table) => ({
    incomePeriodIdx: uniqueIndex("income_period_idx").on(
      table.incomeId,
      table.periodKey
    ),
  })
);

// 5. Kho Tài khoản dùng chung (Lớp học, Cuộc thi, Tiện ích gia đình...)
export const sharedAccounts = pgTable("shared_accounts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(), // VD: Violympic Toán, IOE Tiếng Anh, Zoom Lớp 5A
  category: text("category").notNull().default("class"), // 'class' | 'contest' | 'utility' | 'entertainment' | 'other'
  platformUrl: text("platform_url").default(""),
  accountUsername: text("account_username").notNull(),
  accountPassword: text("account_password").notNull(),
  memberId: integer("member_id").references(() => users.id, {
    onDelete: "set null",
  }),
  ownerName: text("owner_name").default("Cả gia đình"),
  note: text("note").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 6. Giấy tờ cá nhân của các thành viên (Giấy khai sinh, Thẻ BHYT, CCCD...)
export const personalDocuments = pgTable("personal_documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(), // VD: Giấy khai sinh, Thẻ BHYT, CCCD gắn chip
  docType: text("doc_type").notNull().default("birth_cert"), // 'birth_cert' | 'health_ins' | 'id_card' | 'passport' | 'school' | 'other'
  docNumber: text("doc_number").notNull(),
  memberId: integer("member_id").references(() => users.id, {
    onDelete: "set null",
  }),
  holderName: text("holder_name").notNull(),
  issueDate: text("issue_date").default(""),
  expiryDate: text("expiry_date").default(""),
  issuePlace: text("issue_place").default(""),
  frontImage: text("front_image").default(""), // Base64 WebP/JPEG đã nén
  backImage: text("back_image").default(""), // Base64 WebP/JPEG đã nén
  note: text("note").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 7. Lịch Giỗ & Sự kiện riêng của Gia đình (Âm lịch / Dương lịch)
export const familyEvents = pgTable("family_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(), // VD: Giỗ Ông Nội, Sinh nhật Bé An
  eventType: text("event_type").notNull().default("ancestor"), // 'ancestor' | 'birthday' | 'anniversary' | 'holiday' | 'other'
  calendarType: text("calendar_type").notNull().default("lunar"), // 'lunar' | 'solar'
  day: integer("day").notNull(), // 1-31
  month: integer("month").notNull(), // 1-12
  year: integer("year"), // Null nếu lặp hàng năm
  isRecurring: boolean("is_recurring").notNull().default(true),
  remindDaysBefore: integer("remind_days_before").notNull().default(7),
  note: text("note").default(""),
  createdBy: integer("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 8. Thời khóa biểu, Lịch học thêm & Lịch đưa đón trẻ con
export const kidsSchedules = pgTable("kids_schedules", {
  id: serial("id").primaryKey(),
  childId: integer("child_id").references(() => users.id, {
    onDelete: "set null",
  }),
  childName: text("child_name").notNull(), // VD: Bé Minh Khôi, Bé Bảo An
  subject: text("subject").notNull(), // VD: Toán tư duy, Tiếng Anh ILA, Học chính khóa
  scheduleType: text("schedule_type").notNull().default("extra"), // 'main' | 'extra' | 'activity'
  dayOfWeek: integer("day_of_week").notNull(), // 1 (Thứ 2) -> 7 (Chủ Nhật)
  startTime: text("start_time").notNull(), // VD: '17:30'
  endTime: text("end_time").notNull(), // VD: '19:00'
  location: text("location").default(""),
  teacherInfo: text("teacher_info").default(""), // Tên & SĐT giáo viên
  dropoffBy: integer("dropoff_by").references(() => users.id, {
    onDelete: "set null",
  }),
  dropoffName: text("dropoff_name").default("Bố"),
  pickupBy: integer("pickup_by").references(() => users.id, {
    onDelete: "set null",
  }),
  pickupName: text("pickup_name").default("Mẹ"),
  note: text("note").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
