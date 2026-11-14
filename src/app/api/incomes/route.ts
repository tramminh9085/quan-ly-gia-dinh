import { NextRequest, NextResponse } from "next/server";
import {
  ensureNeonSchema,
  getDrizzleDb,
  isNeonConfigured,
  readLocalStore,
  writeLocalStore,
} from "@/db";
import { incomes, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentPeriodKeys } from "@/lib/lunar";

export async function GET() {
  await ensureNeonSchema();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Vui lòng đăng nhập!" }, { status: 401 });
  }
  const db = getDrizzleDb();

  if (db && isNeonConfigured()) {
    const [incRows, userRows] = await Promise.all([
      db.select().from(incomes),
      db.select().from(users),
    ]);
    const userMap = new Map(userRows.map((u) => [u.id, u.fullName]));
    return NextResponse.json({
      incomes: incRows.map((i) => ({
        ...i,
        receivedByName: i.receivedBy
          ? userMap.get(i.receivedBy) || "Thành viên"
          : "Gia đình",
      })),
    });
  } else {
    const store = readLocalStore();
    const userMap = new Map(store.users.map((u) => [u.id, u.fullName]));
    return NextResponse.json({
      incomes: store.incomes.map((i) => ({
        ...i,
        receivedByName: i.receivedBy
          ? userMap.get(i.receivedBy) || "Thành viên"
          : "Gia đình",
      })),
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
  const defaults = getCurrentPeriodKeys();

  const title = String(body.title || "").trim();
  const amount = Number(body.amount || 0);
  const cycle = (
    body.cycle === "yearly"
      ? "yearly"
      : body.cycle === "quarterly"
      ? "quarterly"
      : "monthly"
  ) as "monthly" | "quarterly" | "yearly";
  const periodKey =
    String(body.periodKey || "").trim() ||
    (cycle === "monthly"
      ? defaults.monthly
      : cycle === "quarterly"
      ? defaults.quarterly
      : defaults.yearly);
  const receivedBy = Number(body.receivedBy || user?.id || 1);
  const note = String(body.note || "").trim();

  if (!title || amount <= 0) {
    return NextResponse.json(
      { error: "Vui lòng nhập tên khoản thu và số tiền hợp lệ!" },
      { status: 400 }
    );
  }

  const db = getDrizzleDb();
  if (db && isNeonConfigured()) {
    const inserted = await db
      .insert(incomes)
      .values({
        title,
        amount,
        cycle,
        periodKey,
        receivedBy,
        note,
      })
      .returning();
    return NextResponse.json({ ok: true, income: inserted[0] });
  } else {
    const store = readLocalStore();
    const nextId = store.incomes.reduce((m, i) => Math.max(m, i.id), 0) + 1;
    const item = {
      id: nextId,
      title,
      amount,
      cycle,
      periodKey,
      receivedBy,
      note,
      createdAt: new Date().toISOString(),
    };
    store.incomes.push(item);
    writeLocalStore(store);
    return NextResponse.json({ ok: true, income: item });
  }
}

export async function PUT(req: NextRequest) {
  await ensureNeonSchema();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Vui lòng đăng nhập!" }, { status: 401 });
  }
  const body = await req.json();
  const defaults = getCurrentPeriodKeys();

  const id = Number(body.id);
  const title = String(body.title || "").trim();
  const amount = Number(body.amount || 0);
  const cycle = (
    body.cycle === "yearly"
      ? "yearly"
      : body.cycle === "quarterly"
      ? "quarterly"
      : "monthly"
  ) as "monthly" | "quarterly" | "yearly";
  const periodKey =
    String(body.periodKey || "").trim() ||
    (cycle === "monthly"
      ? defaults.monthly
      : cycle === "quarterly"
      ? defaults.quarterly
      : defaults.yearly);
  const receivedBy = Number(body.receivedBy || user?.id || 1);
  const note = String(body.note || "").trim();

  if (!id || !title || amount <= 0) {
    return NextResponse.json(
      { error: "Vui lòng nhập đầy đủ thông tin khoản thu hợp lệ!" },
      { status: 400 }
    );
  }

  const db = getDrizzleDb();
  if (db && isNeonConfigured()) {
    const updated = await db
      .update(incomes)
      .set({ title, amount, cycle, periodKey, receivedBy, note })
      .where(eq(incomes.id, id))
      .returning();
    return NextResponse.json({ ok: true, income: updated[0] });
  } else {
    const store = readLocalStore();
    const idx = store.incomes.findIndex((i) => i.id === id);
    if (idx === -1) {
      return NextResponse.json(
        { error: "Không tìm thấy khoản thu!" },
        { status: 404 }
      );
    }
    store.incomes[idx] = {
      ...store.incomes[idx],
      title,
      amount,
      cycle,
      periodKey,
      receivedBy,
      note,
    };
    writeLocalStore(store);
    return NextResponse.json({ ok: true, income: store.incomes[idx] });
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
    return NextResponse.json({ error: "Thiếu ID khoản thu" }, { status: 400 });
  }
  const db = getDrizzleDb();
  if (db && isNeonConfigured()) {
    await db.delete(incomes).where(eq(incomes.id, id));
  } else {
    const store = readLocalStore();
    store.incomes = store.incomes.filter((i) => i.id !== id);
    writeLocalStore(store);
  }
  return NextResponse.json({ ok: true });
}
