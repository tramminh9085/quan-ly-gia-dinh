import { NextRequest, NextResponse } from "next/server";
import {
  ensureNeonSchema,
  getDrizzleDb,
  isNeonConfigured,
  readLocalStore,
  writeLocalStore,
} from "@/db";
import { sharedAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  await ensureNeonSchema();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Vui lòng đăng nhập!" }, { status: 401 });
  }
  const db = getDrizzleDb();

  if (db && isNeonConfigured()) {
    const rows = await db.select().from(sharedAccounts);
    return NextResponse.json({ accounts: rows });
  } else {
    const store = readLocalStore();
    return NextResponse.json({ accounts: store.sharedAccounts });
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
  const category = (body.category || "class") as
    | "class"
    | "contest"
    | "utility"
    | "entertainment"
    | "other";
  const platformUrl = String(body.platformUrl || "").trim();
  const accountUsername = String(body.accountUsername || "").trim();
  const accountPassword = String(body.accountPassword || "").trim();
  const memberId = body.memberId ? Number(body.memberId) : null;
  const ownerName = String(body.ownerName || "Cả gia đình").trim();
  const note = String(body.note || "").trim();

  if (!title || !accountUsername || !accountPassword) {
    return NextResponse.json(
      { error: "Vui lòng nhập Tên tài khoản, Username và Password!" },
      { status: 400 }
    );
  }

  const db = getDrizzleDb();
  if (db && isNeonConfigured()) {
    const inserted = await db
      .insert(sharedAccounts)
      .values({
        title,
        category,
        platformUrl,
        accountUsername,
        accountPassword,
        memberId,
        ownerName,
        note,
      })
      .returning();
    return NextResponse.json({ ok: true, account: inserted[0] });
  } else {
    const store = readLocalStore();
    const nextId =
      store.sharedAccounts.reduce((m, a) => Math.max(m, a.id), 0) + 1;
    const item = {
      id: nextId,
      title,
      category,
      platformUrl,
      accountUsername,
      accountPassword,
      memberId,
      ownerName,
      note,
      createdAt: new Date().toISOString(),
    };
    store.sharedAccounts.unshift(item);
    writeLocalStore(store);
    return NextResponse.json({ ok: true, account: item });
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
  const category = (body.category || "class") as
    | "class"
    | "contest"
    | "utility"
    | "entertainment"
    | "other";
  const platformUrl = String(body.platformUrl || "").trim();
  const accountUsername = String(body.accountUsername || "").trim();
  const accountPassword = String(body.accountPassword || "").trim();
  const memberId = body.memberId ? Number(body.memberId) : null;
  const ownerName = String(body.ownerName || "Cả gia đình").trim();
  const note = String(body.note || "").trim();

  if (!id || !title || !accountUsername || !accountPassword) {
    return NextResponse.json(
      { error: "Vui lòng nhập đầy đủ Tên tài khoản, Username và Password!" },
      { status: 400 }
    );
  }

  const db = getDrizzleDb();
  if (db && isNeonConfigured()) {
    const updated = await db
      .update(sharedAccounts)
      .set({
        title,
        category,
        platformUrl,
        accountUsername,
        accountPassword,
        memberId,
        ownerName,
        note,
      })
      .where(eq(sharedAccounts.id, id))
      .returning();
    return NextResponse.json({ ok: true, account: updated[0] });
  } else {
    const store = readLocalStore();
    const idx = store.sharedAccounts.findIndex((a) => a.id === id);
    if (idx === -1) {
      return NextResponse.json(
        { error: "Không tìm thấy tài khoản!" },
        { status: 404 }
      );
    }
    store.sharedAccounts[idx] = {
      ...store.sharedAccounts[idx],
      title,
      category,
      platformUrl,
      accountUsername,
      accountPassword,
      memberId,
      ownerName,
      note,
    };
    writeLocalStore(store);
    return NextResponse.json({ ok: true, account: store.sharedAccounts[idx] });
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
    return NextResponse.json({ error: "Thiếu ID tài khoản" }, { status: 400 });
  }
  const db = getDrizzleDb();
  if (db && isNeonConfigured()) {
    await db.delete(sharedAccounts).where(eq(sharedAccounts.id, id));
  } else {
    const store = readLocalStore();
    store.sharedAccounts = store.sharedAccounts.filter((a) => a.id !== id);
    writeLocalStore(store);
  }
  return NextResponse.json({ ok: true });
}
