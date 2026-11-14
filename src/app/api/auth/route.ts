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

  if (!currentUser) {
    return NextResponse.json({
      user: null,
      members: [],
      dbMode: isNeonConfigured() ? "neon" : "local",
    });
  }

  let allMembers: Array<{
    id: number;
    username: string;
    fullName: string;
    roleLabel: string;
    isAdmin: boolean;
    avatarColor: string;
  }> = [];

  if (db && isNeonConfigured()) {
    const rows = await db.select().from(users);
    allMembers = rows.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      roleLabel: u.roleLabel,
      isAdmin: Boolean(u.isAdmin) || u.username === "bominh",
      avatarColor: u.avatarColor,
    }));
  } else {
    const store = readLocalStore();
    allMembers = store.users.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      roleLabel: u.roleLabel,
      isAdmin: Boolean(u.isAdmin) || u.username === "bominh",
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
      isAdmin?: boolean;
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
        {
          error:
            "Tài khoản không tồn tại! Vui lòng liên hệ Admin gia đình để được cấp tài khoản.",
        },
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
      isAdmin: Boolean(foundUser.isAdmin) || foundUser.username === "bominh",
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
    return NextResponse.json(
      {
        error:
          "Tính năng tự đăng ký đã bị khóa để đảm bảo bảo mật. Chỉ tài khoản Quản trị viên (Admin) mới được phép tạo tài khoản cho thành viên gia đình!",
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ error: "Hành động không hợp lệ" }, { status: 400 });
}
