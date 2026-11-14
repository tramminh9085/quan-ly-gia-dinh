import { NextRequest, NextResponse } from "next/server";
import {
  ensureNeonSchema,
  getDrizzleDb,
  isNeonConfigured,
  readLocalStore,
  writeLocalStore,
} from "@/db";
import { kidsSchedules } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  await ensureNeonSchema();
  const db = getDrizzleDb();

  if (db && isNeonConfigured()) {
    const rows = await db.select().from(kidsSchedules);
    const sorted = [...rows].sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.startTime.localeCompare(b.startTime);
    });
    return NextResponse.json({ schedules: sorted });
  } else {
    const store = readLocalStore();
    const sorted = [...store.kidsSchedules].sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.startTime.localeCompare(b.startTime);
    });
    return NextResponse.json({ schedules: sorted });
  }
}

export async function POST(req: NextRequest) {
  await ensureNeonSchema();
  const body = await req.json();

  const childId = body.childId ? Number(body.childId) : null;
  const childName = String(body.childName || "").trim();
  const subject = String(body.subject || "").trim();
  const scheduleType = (body.scheduleType || "extra") as
    | "main"
    | "extra"
    | "activity";
  const dayOfWeek = Number(body.dayOfWeek || 1);
  const startTime = String(body.startTime || "17:30").trim();
  const endTime = String(body.endTime || "19:00").trim();
  const location = String(body.location || "").trim();
  const teacherInfo = String(body.teacherInfo || "").trim();
  const dropoffBy = body.dropoffBy ? Number(body.dropoffBy) : null;
  const dropoffName = String(body.dropoffName || "Bố").trim();
  const pickupBy = body.pickupBy ? Number(body.pickupBy) : null;
  const pickupName = String(body.pickupName || "Mẹ").trim();
  const note = String(body.note || "").trim();

  if (!childName || !subject) {
    return NextResponse.json(
      { error: "Vui lòng nhập Tên bé và Môn học/Hoạt động!" },
      { status: 400 }
    );
  }

  const db = getDrizzleDb();
  if (db && isNeonConfigured()) {
    const inserted = await db
      .insert(kidsSchedules)
      .values({
        childId,
        childName,
        subject,
        scheduleType,
        dayOfWeek,
        startTime,
        endTime,
        location,
        teacherInfo,
        dropoffBy,
        dropoffName,
        pickupBy,
        pickupName,
        note,
      })
      .returning();
    return NextResponse.json({ ok: true, schedule: inserted[0] });
  } else {
    const store = readLocalStore();
    const nextId =
      store.kidsSchedules.reduce((m, s) => Math.max(m, s.id), 0) + 1;
    const item = {
      id: nextId,
      childId,
      childName,
      subject,
      scheduleType,
      dayOfWeek,
      startTime,
      endTime,
      location,
      teacherInfo,
      dropoffBy,
      dropoffName,
      pickupBy,
      pickupName,
      note,
      createdAt: new Date().toISOString(),
    };
    store.kidsSchedules.push(item);
    writeLocalStore(store);
    return NextResponse.json({ ok: true, schedule: item });
  }
}

export async function DELETE(req: NextRequest) {
  await ensureNeonSchema();
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ error: "Thiếu ID lịch học" }, { status: 400 });
  }
  const db = getDrizzleDb();
  if (db && isNeonConfigured()) {
    await db.delete(kidsSchedules).where(eq(kidsSchedules.id, id));
  } else {
    const store = readLocalStore();
    store.kidsSchedules = store.kidsSchedules.filter((s) => s.id !== id);
    writeLocalStore(store);
  }
  return NextResponse.json({ ok: true });
}
