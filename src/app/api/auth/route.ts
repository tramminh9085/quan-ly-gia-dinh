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
import {
  createSessionToken,
  getCurrentUser,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

export async function GET() {
  await ensureNeonSchema();
  const currentUser = await getCurrentUser();
  const db = getDrizzleDb();

  let allMembers: Array<{
    id: number;
    username: string;
    fullName: string;
    roleLabel: string;
    avatarColor: string;
  }> = [];

  if (db && isNeonConfigured()) {
    const rows = await db.select().from(users);
    allMembers = rows.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      roleLabel: u.roleLabel,
      avatarColor: u.avatarColor,
    }));
  } else {
    const store = readLocalStore();
    allMembers = store.users.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      roleLabel: u.roleLabel,
      avatarColor: u.avatarColor,
    }));
  }

  return NextResponse.json({
    user: currentUser,
    members: allMembers,
    dbMode: isNeonConfigured() ? "neon" : "local",
  });
}

export async function POST(req: NextRequest) {
  await ensureNeonSchema();
  const body = await req.json();
  const { action } = body;
  const db = getDrizzleDb();

  if (action === "logout") {
    const res = NextResponse.json({ ok: true });
    res.cookies.delete(SESSION_COOKIE_NAME);
    return res;
  }

  if (action === "login") {
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");

    let foundUser: {
      id: number;
      username: string;
      fullName: string;
      roleLabel: string;
      passwordHash: string;
      avatarColor: string;
    } | null = null;

    if (db && isNeonConfigured()) {
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.username, username));
      if (rows[0]) foundUser = rows[0];
    } else {
      const store = readLocalStore();
      foundUser =
        store.users.find((u) => u.username.toLowerCase() === username) || null;
    }

    if (!foundUser) {
      return NextResponse.json(
        { error: "Không tìm thấy tên đăng nhập này trong gia đình!" },
        { status: 401 }
      );
    }

    const isValid = bcrypt.compareSync(password, foundUser.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Mật khẩu chưa đúng, vui lòng thử lại!" },
        { status: 401 }
      );
    }

    const sessionUser = {
      id: foundUser.id,
      username: foundUser.username,
      fullName: foundUser.fullName,
      roleLabel: foundUser.roleLabel,
      avatarColor: foundUser.avatarColor,
    };

    const token = await createSessionToken(sessionUser);
    const res = NextResponse.json({ ok: true, user: sessionUser });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  }

  if (action === "register") {
    const username = String(body.username || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
    const fullName = String(body.fullName || "").trim();
    const roleLabel = String(body.roleLabel || "Thành viên").trim();
    const password = String(body.password || "");
    const avatarColor = String(body.avatarColor || "#2563EB");

    if (!username || !fullName || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ Tên đăng nhập, Tên hiển thị và Mật khẩu!" },
        { status: 400 }
      );
    }

    const passwordHash = bcrypt.hashSync(password, 8);
    let createdUser: {
      id: number;
      username: string;
      fullName: string;
      roleLabel: string;
      avatarColor: string;
    };

    if (db && isNeonConfigured()) {
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.username, username));
      if (existing.length > 0) {
        return NextResponse.json(
          { error: "Tên đăng nhập này đã tồn tại trong gia đình!" },
          { status: 400 }
        );
      }
      const inserted = await db
        .insert(users)
        .values({
          username,
          fullName,
          roleLabel,
          passwordHash,
          avatarColor,
        })
        .returning();
      createdUser = inserted[0];
    } else {
      const store = readLocalStore();
      if (store.users.some((u) => u.username.toLowerCase() === username)) {
        return NextResponse.json(
          { error: "Tên đăng nhập này đã tồn tại trong gia đình!" },
          { status: 400 }
        );
      }
      const nextId =
        store.users.reduce((max, u) => Math.max(max, u.id), 0) + 1;
      const newUser = {
        id: nextId,
        username,
        fullName,
        roleLabel,
        passwordHash,
        avatarColor,
        createdAt: new Date().toISOString(),
      };
      store.users.push(newUser);
      writeLocalStore(store);
      createdUser = newUser;
    }

    const sessionUser = {
      id: createdUser.id,
      username: createdUser.username,
      fullName: createdUser.fullName,
      roleLabel: createdUser.roleLabel,
      avatarColor: createdUser.avatarColor,
    };

    const token = await createSessionToken(sessionUser);
    const res = NextResponse.json({ ok: true, user: sessionUser });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  }

  return NextResponse.json({ error: "Hành động không hợp lệ" }, { status: 400 });
}
