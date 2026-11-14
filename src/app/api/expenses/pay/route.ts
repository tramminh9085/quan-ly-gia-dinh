import { NextRequest, NextResponse } from "next/server";
import {
  ensureNeonSchema,
  getDrizzleDb,
  isNeonConfigured,
  readLocalStore,
  writeLocalStore,
} from "@/db";
import { expensePayments } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  await ensureNeonSchema();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Vui lòng đăng nhập!" }, { status: 401 });
  }
  const body = await req.json();

  const expenseId = Number(body.expenseId);
  const periodKey = String(body.periodKey || "").trim();
  const paidAmount = Number(body.paidAmount || 0);
  const paidBy = Number(body.paidBy || user?.id || 1);
  const note = String(body.note || "").trim();

  if (!expenseId || !periodKey) {
    return NextResponse.json(
      { error: "Thiếu thông tin khoản đóng hoặc kỳ thanh toán" },
      { status: 400 }
    );
  }

  const db = getDrizzleDb();
  if (db && isNeonConfigured()) {
    const existing = await db
      .select()
      .from(expensePayments)
      .where(
        and(
          eq(expensePayments.expenseId, expenseId),
          eq(expensePayments.periodKey, periodKey)
        )
      );
    if (existing.length > 0) {
      return NextResponse.json({ ok: true, payment: existing[0] });
    }
    const inserted = await db
      .insert(expensePayments)
      .values({
        expenseId,
        periodKey,
        paidAmount,
        paidBy,
        note,
      })
      .returning();
    return NextResponse.json({ ok: true, payment: inserted[0] });
  } else {
    const store = readLocalStore();
    const existing = store.expensePayments.find(
      (p) => p.expenseId === expenseId && p.periodKey === periodKey
    );
    if (existing) {
      return NextResponse.json({ ok: true, payment: existing });
    }
    const nextId =
      store.expensePayments.reduce((m, p) => Math.max(m, p.id), 0) + 1;
    const payment = {
      id: nextId,
      expenseId,
      periodKey,
      paidAmount,
      paidBy,
      paidAt: new Date().toISOString(),
      note,
    };
    store.expensePayments.push(payment);
    writeLocalStore(store);
    return NextResponse.json({ ok: true, payment });
  }
}

export async function DELETE(req: NextRequest) {
  await ensureNeonSchema();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Vui lòng đăng nhập!" }, { status: 401 });
  }
  const expenseId = Number(req.nextUrl.searchParams.get("expenseId"));
  const periodKey = String(req.nextUrl.searchParams.get("periodKey") || "");

  if (!expenseId || !periodKey) {
    return NextResponse.json(
      { error: "Thiếu thông tin để hủy trạng thái đã đóng" },
      { status: 400 }
    );
  }

  const db = getDrizzleDb();
  if (db && isNeonConfigured()) {
    await db
      .delete(expensePayments)
      .where(
        and(
          eq(expensePayments.expenseId, expenseId),
          eq(expensePayments.periodKey, periodKey)
        )
      );
  } else {
    const store = readLocalStore();
    store.expensePayments = store.expensePayments.filter(
      (p) => !(p.expenseId === expenseId && p.periodKey === periodKey)
    );
    writeLocalStore(store);
  }
  return NextResponse.json({ ok: true });
}
