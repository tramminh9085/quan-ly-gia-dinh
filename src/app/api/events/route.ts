import { NextRequest, NextResponse } from "next/server";
import {
  ensureNeonSchema,
  getDrizzleDb,
  isNeonConfigured,
  readLocalStore,
  writeLocalStore,
} from "@/db";
import { familyEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getNextEventOccurrence } from "@/lib/lunar";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  await ensureNeonSchema();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Vui lòng đăng nhập!" }, { status: 401 });
  }
  const db = getDrizzleDb();
  const now = new Date();

  let rawEvents: Array<{
    id: number;
    title: string;
    eventType: string;
    calendarType: string;
    day: number;
    month: number;
    year: number | null;
    isRecurring: boolean;
    remindDaysBefore: number;
    note: string | null;
  }> = [];

  if (db && isNeonConfigured()) {
    rawEvents = await db.select().from(familyEvents);
  } else {
    const store = readLocalStore();
    rawEvents = store.familyEvents;
  }

  const enriched = rawEvents
    .map((ev) => {
      const calType = (ev.calendarType === "solar" ? "solar" : "lunar") as
        | "lunar"
        | "solar";
      const nextOccurrence = getNextEventOccurrence(
        ev.day,
        ev.month,
        calType,
        now
      );
      return {
        ...ev,
        ...nextOccurrence,
        isUpcomingSoon: nextOccurrence.daysUntil <= (ev.remindDaysBefore || 7),
      };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return NextResponse.json({ events: enriched });
}

export async function POST(req: NextRequest) {
  await ensureNeonSchema();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Vui lòng đăng nhập!" }, { status: 401 });
  }
  const body = await req.json();

  const title = String(body.title || "").trim();
  const eventType = (body.eventType || "ancestor") as
    | "ancestor"
    | "birthday"
    | "anniversary"
    | "holiday"
    | "other";
  const calendarType = (body.calendarType || "lunar") as "lunar" | "solar";
  const day = Number(body.day || 1);
  const month = Number(body.month || 1);
  const year = body.year ? Number(body.year) : null;
  const isRecurring = body.isRecurring !== false;
  const remindDaysBefore = Number(body.remindDaysBefore || 7);
  const note = String(body.note || "").trim();

  if (!title || day < 1 || day > 31 || month < 1 || month > 12) {
    return NextResponse.json(
      { error: "Vui lòng nhập Tên sự kiện và Ngày/Tháng hợp lệ!" },
      { status: 400 }
    );
  }

  const db = getDrizzleDb();
  if (db && isNeonConfigured()) {
    const inserted = await db
      .insert(familyEvents)
      .values({
        title,
        eventType,
        calendarType,
        day,
        month,
        year,
        isRecurring,
        remindDaysBefore,
        note,
        createdBy: user?.id || 1,
      })
      .returning();
    return NextResponse.json({ ok: true, event: inserted[0] });
  } else {
    const store = readLocalStore();
    const nextId =
      store.familyEvents.reduce((m, e) => Math.max(m, e.id), 0) + 1;
    const item = {
      id: nextId,
      title,
      eventType,
      calendarType,
      day,
      month,
      year,
      isRecurring,
      remindDaysBefore,
      note,
      createdBy: user?.id || 1,
      createdAt: new Date().toISOString(),
    };
    store.familyEvents.push(item);
    writeLocalStore(store);
    return NextResponse.json({ ok: true, event: item });
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
  const eventType = (body.eventType || "ancestor") as
    | "ancestor"
    | "birthday"
    | "anniversary"
    | "holiday"
    | "other";
  const calendarType = (body.calendarType || "lunar") as "lunar" | "solar";
  const day = Number(body.day || 1);
  const month = Number(body.month || 1);
  const year = body.year ? Number(body.year) : null;
  const isRecurring = body.isRecurring !== false;
  const remindDaysBefore = Number(body.remindDaysBefore || 7);
  const note = String(body.note || "").trim();

  if (!id || !title || day < 1 || day > 31 || month < 1 || month > 12) {
    return NextResponse.json(
      { error: "Vui lòng nhập Tên sự kiện và Ngày/Tháng hợp lệ!" },
      { status: 400 }
    );
  }

  const db = getDrizzleDb();
  if (db && isNeonConfigured()) {
    const updated = await db
      .update(familyEvents)
      .set({
        title,
        eventType,
        calendarType,
        day,
        month,
        year,
        isRecurring,
        remindDaysBefore,
        note,
      })
      .where(eq(familyEvents.id, id))
      .returning();
    return NextResponse.json({ ok: true, event: updated[0] });
  } else {
    const store = readLocalStore();
    const idx = store.familyEvents.findIndex((e) => e.id === id);
    if (idx === -1) {
      return NextResponse.json(
        { error: "Không tìm thấy sự kiện!" },
        { status: 404 }
      );
    }
    store.familyEvents[idx] = {
      ...store.familyEvents[idx],
      title,
      eventType,
      calendarType,
      day,
      month,
      year,
      isRecurring,
      remindDaysBefore,
      note,
    };
    writeLocalStore(store);
    return NextResponse.json({ ok: true, event: store.familyEvents[idx] });
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
    return NextResponse.json({ error: "Thiếu ID sự kiện" }, { status: 400 });
  }
  const db = getDrizzleDb();
  if (db && isNeonConfigured()) {
    await db.delete(familyEvents).where(eq(familyEvents.id, id));
  } else {
    const store = readLocalStore();
    store.familyEvents = store.familyEvents.filter((e) => e.id !== id);
    writeLocalStore(store);
  }
  return NextResponse.json({ ok: true });
}
