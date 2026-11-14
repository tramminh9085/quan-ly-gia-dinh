import { NextRequest, NextResponse } from "next/server";
import {
  ensureNeonSchema,
  getDrizzleDb,
  isNeonConfigured,
  readLocalStore,
  writeLocalStore,
} from "@/db";
import { expensePayments, recurringExpenses, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentPeriodKeys } from "@/lib/lunar";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  await ensureNeonSchema();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Vui lòng đăng nhập!" }, { status: 401 });
  }
  const defaults = getCurrentPeriodKeys();
  const monthlyKey =
    req.nextUrl.searchParams.get("monthlyKey") || defaults.monthly;
  const yearlyKey = req.nextUrl.searchParams.get("yearlyKey") || defaults.yearly;

  const db = getDrizzleDb();

  if (db && isNeonConfigured()) {
    const [expRows, payRows, userRows] = await Promise.all([
      db.select().from(recurringExpenses),
      db.select().from(expensePayments),
      db.select().from(users),
    ]);
    const userMap = new Map(userRows.map((u) => [u.id, u.fullName]));

    const items = expRows
      .filter((e) => e.cycle !== "weekly")
      .map((e) => {
        const targetPeriod = e.cycle === "monthly" ? monthlyKey : yearlyKey;
        const payment = payRows.find(
          (p) => p.expenseId === e.id && p.periodKey === targetPeriod
        );
        const history = payRows
          .filter((p) => p.expenseId === e.id)
          .map((p) => ({
            ...p,
            paidByName: p.paidBy
              ? userMap.get(p.paidBy) || "Thành viên"
              : "Gia đình",
          }));

        return {
          ...e,
          periodKey: targetPeriod,
          isPaid: Boolean(payment),
          payment: payment
            ? {
                ...payment,
                paidByName: payment.paidBy
                  ? userMap.get(payment.paidBy) || "Thành viên"
                  : "Gia đình",
              }
            : null,
          history,
        };
      });

    return NextResponse.json({
      expenses: items,
      periodKeys: { monthly: monthlyKey, yearly: yearlyKey },
    });
  } else {
    const store = readLocalStore();
    const userMap = new Map(store.users.map((u) => [u.id, u.fullName]));

    const items = store.recurringExpenses
      .filter((e) => (e.cycle as string) !== "weekly")
      .map((e) => {
        const targetPeriod = e.cycle === "monthly" ? monthlyKey : yearlyKey;
        const payment = store.expensePayments.find(
          (p) => p.expenseId === e.id && p.periodKey === targetPeriod
        );
        const history = store.expensePayments
          .filter((p) => p.expenseId === e.id)
          .map((p) => ({
            ...p,
            paidByName: p.paidBy
              ? userMap.get(p.paidBy) || "Thành viên"
              : "Gia đình",
          }));

        return {
          ...e,
          periodKey: targetPeriod,
          isPaid: Boolean(payment),
          payment: payment
            ? {
                ...payment,
                paidByName: payment.paidBy
                  ? userMap.get(payment.paidBy) || "Thành viên"
                  : "Gia đình",
              }
            : null,
          history,
        };
      });

    return NextResponse.json({
      expenses: items,
      periodKeys: { monthly: monthlyKey, yearly: yearlyKey },
    });
  }
}

export async function POST(req: NextRequest) {
  await ensureNeonSchema();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Vui lòng đăng nhập!" }, { status: 401 });
  }
  const body = await req.json();

  const title = String(body.title || "").trim();
  const amount = Number(body.amount || 0);
  const cycle = (body.cycle === "yearly" ? "yearly" : "monthly") as
    | "monthly"
    | "yearly";
  const dueDay = Number(body.dueDay || 1);
  const dueMonth = Number(body.dueMonth || 1);
  const category = String(body.category || "Sinh hoạt").trim();
  const note = String(body.note || "").trim();

  if (!title || amount <= 0) {
    return NextResponse.json(
      { error: "Vui lòng nhập tên khoản đóng và số tiền hợp lệ!" },
      { status: 400 }
    );
  }

  const db = getDrizzleDb();
  if (db && isNeonConfigured()) {
    const inserted = await db
      .insert(recurringExpenses)
      .values({
        title,
        amount,
        cycle,
        dueDay,
        dueMonth,
        category,
        note,
        isActive: true,
        createdBy: user?.id || null,
      })
      .returning();
    return NextResponse.json({ ok: true, expense: inserted[0] });
  } else {
    const store = readLocalStore();
    const nextId =
      store.recurringExpenses.reduce((m, e) => Math.max(m, e.id), 0) + 1;
    const item = {
      id: nextId,
      title,
      amount,
      cycle,
      dueDay,
      dueMonth,
      category,
      note,
      isActive: true,
      createdBy: user?.id || 1,
      createdAt: new Date().toISOString(),
    };
    store.recurringExpenses.push(item);
    writeLocalStore(store);
    return NextResponse.json({ ok: true, expense: item });
  }
}

export async function PUT(req: NextRequest) {
  await ensureNeonSchema();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Vui lòng đăng nhập!" }, { status: 401 });
  }
  const body = await req.json();
  const id = Number(body.id);
  const title = String(body.title || "").trim();
  const amount = Number(body.amount || 0);
  const cycle = (body.cycle === "yearly" ? "yearly" : "monthly") as
    | "monthly"
    | "yearly";
  const dueDay = Number(body.dueDay || 1);
  const dueMonth = Number(body.dueMonth || 1);
  const category = String(body.category || "Sinh hoạt").trim();
  const note = String(body.note || "").trim();

  if (!id || !title || amount <= 0) {
    return NextResponse.json(
      { error: "Vui lòng nhập đầy đủ thông tin khoản đóng hợp lệ!" },
      { status: 400 }
    );
  }

  const db = getDrizzleDb();
  if (db && isNeonConfigured()) {
    const updated = await db
      .update(recurringExpenses)
      .set({ title, amount, cycle, dueDay, dueMonth, category, note })
      .where(eq(recurringExpenses.id, id))
      .returning();
    return NextResponse.json({ ok: true, expense: updated[0] });
  } else {
    const store = readLocalStore();
    const idx = store.recurringExpenses.findIndex((e) => e.id === id);
    if (idx === -1) {
      return NextResponse.json(
        { error: "Không tìm thấy khoản đóng!" },
        { status: 404 }
      );
    }
    store.recurringExpenses[idx] = {
      ...store.recurringExpenses[idx],
      title,
      amount,
      cycle,
      dueDay,
      dueMonth,
      category,
      note,
    };
    writeLocalStore(store);
    return NextResponse.json({ ok: true, expense: store.recurringExpenses[idx] });
  }
}

export async function DELETE(req: NextRequest) {
  await ensureNeonSchema();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Vui lòng đăng nhập!" }, { status: 401 });
  }
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ error: "Thiếu ID khoản đóng" }, { status: 400 });
  }
  const db = getDrizzleDb();
  if (db && isNeonConfigured()) {
    await db.delete(recurringExpenses).where(eq(recurringExpenses.id, id));
  } else {
    const store = readLocalStore();
    store.recurringExpenses = store.recurringExpenses.filter((e) => e.id !== id);
    store.expensePayments = store.expensePayments.filter(
      (p) => p.expenseId !== id
    );
    writeLocalStore(store);
  }
  return NextResponse.json({ ok: true });
}
