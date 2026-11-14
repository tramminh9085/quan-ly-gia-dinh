import { NextRequest, NextResponse } from "next/server";
import {
  ensureNeonSchema,
  getDrizzleDb,
  isNeonConfigured,
  readLocalStore,
  writeLocalStore,
} from "@/db";
import { incomeReceipts } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  await ensureNeonSchema();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Vui lòng đăng nhập!" }, { status: 401 });
  }
  const body = await req.json();

  const incomeId = Number(body.incomeId);
  const periodKey = String(body.periodKey || "").trim();
  const receivedAmount = Number(body.receivedAmount || 0);
  const receivedBy = Number(body.receivedBy || user?.id || 1);
  const note = String(body.note || "").trim();

  if (!incomeId || !periodKey) {
    return NextResponse.json(
      { error: "Thiếu thông tin khoản thu hoặc kỳ thu" },
      { status: 400 }
    );
  }

  const db = getDrizzleDb();
  if (db && isNeonConfigured()) {
    const existing = await db
      .select()
      .from(incomeReceipts)
      .where(
        and(
          eq(incomeReceipts.incomeId, incomeId),
          eq(incomeReceipts.periodKey, periodKey)
        )
      );
    if (existing.length > 0) {
      return NextResponse.json({ ok: true, receipt: existing[0] });
    }
    const inserted = await db
      .insert(incomeReceipts)
      .values({
        incomeId,
        periodKey,
        receivedAmount,
        receivedBy,
        note,
      })
      .returning();
    return NextResponse.json({ ok: true, receipt: inserted[0] });
  } else {
    const store = readLocalStore();
    if (!store.incomeReceipts) store.incomeReceipts = [];
    const existing = store.incomeReceipts.find(
      (r) => r.incomeId === incomeId && r.periodKey === periodKey
    );
    if (existing) {
      return NextResponse.json({ ok: true, receipt: existing });
    }
    const nextId =
      store.incomeReceipts.reduce((m, r) => Math.max(m, r.id), 0) + 1;
    const receipt = {
      id: nextId,
      incomeId,
      periodKey,
      receivedAmount,
      receivedBy,
      receivedAt: new Date().toISOString(),
      note,
    };
    store.incomeReceipts.push(receipt);
    writeLocalStore(store);
    return NextResponse.json({ ok: true, receipt });
  }
}

export async function DELETE(req: NextRequest) {
  await ensureNeonSchema();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Vui lòng đăng nhập!" }, { status: 401 });
  }
  const incomeId = Number(req.nextUrl.searchParams.get("incomeId"));
  const periodKey = String(req.nextUrl.searchParams.get("periodKey") || "");

  if (!incomeId || !periodKey) {
    return NextResponse.json(
      { error: "Thiếu thông tin để hủy trạng thái đã thu" },
      { status: 400 }
    );
  }

  const db = getDrizzleDb();
  if (db && isNeonConfigured()) {
    await db
      .delete(incomeReceipts)
      .where(
        and(
          eq(incomeReceipts.incomeId, incomeId),
          eq(incomeReceipts.periodKey, periodKey)
        )
      );
  } else {
    const store = readLocalStore();
    store.incomeReceipts = (store.incomeReceipts || []).filter(
      (r) => !(r.incomeId === incomeId && r.periodKey === periodKey)
    );
    writeLocalStore(store);
  }
  return NextResponse.json({ ok: true });
}
