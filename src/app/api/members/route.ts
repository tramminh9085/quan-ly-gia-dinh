import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  ensureNeonSchema,
  getDrizzleDb,
  isNeonConfigured,
  readLocalStore,
  writeLocalStore,
} from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  await ensureNeonSchema();
  const db = getDrizzleDb();
  if (db && isNeonConfigured()) {
    const rows = await db.select().from(users);
    return NextResponse.json({
      members: rows.map((u) => ({
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        roleLabel: u.roleLabel,
        avatarColor: u.avatarColor,
        createdAt: u.createdAt,
      })),
    });
  }
  const store = readLocalStore();
  return NextResponse.json({
    members: store.users.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      roleLabel: u.roleLabel,
      avatarColor: u.avatarColor,
      createdAt: u.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  await ensureNeonSchema();
  const body = await req.json();
  const username = String(body.username || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  const fullName = String(body.fullName || "").trim();
  const roleLabel = String(body.roleLabel || "Thành viên").trim();
  const password = String(body.password || "123456");
  const avatarColor = String(body.avatarColor || "#2563EB");

  if (!username || !fullName) {
    return NextResponse.json(
      { error: "Vui lòng nhập Tên đăng nhập và Tên hiển thị!" },
      { status: 400 }
    );
  }

  const passwordHash = bcrypt.hashSync(password, 8);
  const db = getDrizzleDb();

  if (db && isNeonConfigured()) {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Tên đăng nhập đã tồn tại!" },
        { status: 400 }
      );
    }
    const inserted = await db
      .insert(users)
      .values({ username, fullName, roleLabel, passwordHash, avatarColor })
      .returning();
    return NextResponse.json({ ok: true, member: inserted[0] });
  } else {
    const store = readLocalStore();
    if (store.users.some((u) => u.username === username)) {
      return NextResponse.json(
        { error: "Tên đăng nhập đã tồn tại!" },
        { status: 400 }
      );
    }
    const nextId = store.users.reduce((m, u) => Math.max(m, u.id), 0) + 1;
    const member = {
      id: nextId,
      username,
      fullName,
      roleLabel,
      passwordHash,
      avatarColor,
      createdAt: new Date().toISOString(),
    };
    store.users.push(member);
    writeLocalStore(store);
    return NextResponse.json({ ok: true, member });
  }
}

export async function DELETE(req: NextRequest) {
  await ensureNeonSchema();
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ error: "Thiếu ID thành viên" }, { status: 400 });
  }
  const db = getDrizzleDb();
  if (db && isNeonConfigured()) {
    await db.delete(users).where(eq(users.id, id));
  } else {
    const store = readLocalStore();
    store.users = store.users.filter((u) => u.id !== id);
    writeLocalStore(store);
  }
  return NextResponse.json({ ok: true });
}
