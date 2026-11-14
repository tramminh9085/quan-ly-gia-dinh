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
  if (!currentUser) {
    return NextResponse.json(
      { error: "Vui lòng đăng nhập để xem danh sách thành viên!" },
      { status: 401 }
    );
  }

  const db = getDrizzleDb();
  if (db && isNeonConfigured()) {
    const rows = await db.select().from(users);
    return NextResponse.json({
      members: rows.map((u) => ({
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        roleLabel: u.roleLabel,
        isAdmin: Boolean(u.isAdmin) || u.username === "bominh",
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
      isAdmin: Boolean(u.isAdmin) || u.username === "bominh",
      avatarColor: u.avatarColor,
      createdAt: u.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  await ensureNeonSchema();
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json(
      { error: "Vui lòng đăng nhập trước khi thực hiện!" },
      { status: 401 }
    );
  }
  if (!currentUser.isAdmin) {
    return NextResponse.json(
      {
        error:
          "Truy cập bị từ chối: Chỉ tài khoản Admin mới được phép tạo user cho thành viên gia đình!",
      },
      { status: 403 }
    );
  }

  const body = await req.json();
  const username = String(body.username || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  const fullName = String(body.fullName || "").trim();
  const roleLabel = String(body.roleLabel || "Thành viên").trim();
  const password = String(body.password || "").trim();
  const avatarColor = String(body.avatarColor || "#2563EB");

  if (!username || !fullName || !password) {
    return NextResponse.json(
      { error: "Vui lòng nhập đầy đủ Tên đăng nhập, Tên hiển thị và Mật khẩu!" },
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
        { error: "Tên đăng nhập đã tồn tại trong gia đình!" },
        { status: 400 }
      );
    }
    const inserted = await db
      .insert(users)
      .values({
        username,
        fullName,
        roleLabel,
        isAdmin: false,
        passwordHash,
        avatarColor,
      })
      .returning();
    const u = inserted[0];
    return NextResponse.json({
      ok: true,
      member: {
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        roleLabel: u.roleLabel,
        isAdmin: Boolean(u.isAdmin),
        avatarColor: u.avatarColor,
        createdAt: u.createdAt,
      },
    });
  } else {
    const store = readLocalStore();
    if (store.users.some((u) => u.username.toLowerCase() === username)) {
      return NextResponse.json(
        { error: "Tên đăng nhập đã tồn tại trong gia đình!" },
        { status: 400 }
      );
    }
    const nextId = store.users.reduce((m, u) => Math.max(m, u.id), 0) + 1;
    const member = {
      id: nextId,
      username,
      fullName,
      roleLabel,
      isAdmin: false,
      passwordHash,
      avatarColor,
      createdAt: new Date().toISOString(),
    };
    store.users.push(member);
    writeLocalStore(store);
    return NextResponse.json({
      ok: true,
      member: {
        id: member.id,
        username: member.username,
        fullName: member.fullName,
        roleLabel: member.roleLabel,
        isAdmin: member.isAdmin,
        avatarColor: member.avatarColor,
        createdAt: member.createdAt,
      },
    });
  }
}

export async function PUT(req: NextRequest) {
  await ensureNeonSchema();
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json(
      { error: "Vui lòng đăng nhập trước khi thực hiện!" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const id = Number(body.id);
  if (!id) {
    return NextResponse.json(
      { error: "Thiếu ID thành viên cần chỉnh sửa!" },
      { status: 400 }
    );
  }

  // Chỉ Admin hoặc chính chủ tài khoản mới được chỉnh sửa / đổi mật khẩu
  if (!currentUser.isAdmin && currentUser.id !== id) {
    return NextResponse.json(
      {
        error:
          "Bạn chỉ có quyền chỉnh sửa hoặc đổi mật khẩu cho tài khoản của chính mình!",
      },
      { status: 403 }
    );
  }

  const fullName = String(body.fullName || "").trim();
  const username = String(body.username || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  const roleLabel = String(body.roleLabel || "Thành viên").trim();
  const avatarColor = String(body.avatarColor || "#2563EB");
  const newPassword = String(body.newPassword || "").trim();

  if (!fullName || !username) {
    return NextResponse.json(
      { error: "Vui lòng nhập đầy đủ Tên hiển thị và Tên đăng nhập!" },
      { status: 400 }
    );
  }

  const db = getDrizzleDb();

  let updatedMember: {
    id: number;
    username: string;
    fullName: string;
    roleLabel: string;
    isAdmin: boolean;
    avatarColor: string;
  };

  if (db && isNeonConfigured()) {
    const existingRows = await db.select().from(users).where(eq(users.id, id));
    const target = existingRows[0];
    if (!target) {
      return NextResponse.json(
        { error: "Không tìm thấy thành viên!" },
        { status: 404 }
      );
    }

    const isTargetAdmin = Boolean(target.isAdmin) || target.username === "bominh";
    // Không cho đổi username của tài khoản gốc bominh nếu cần giữ quyền hoặc kiểm tra trùng username
    if (username !== target.username) {
      const duplicate = await db
        .select()
        .from(users)
        .where(eq(users.username, username));
      if (duplicate.length > 0) {
        return NextResponse.json(
          { error: "Tên đăng nhập mới đã tồn tại trong gia đình!" },
          { status: 400 }
        );
      }
    }

    const updateValues: Partial<typeof users.$inferInsert> = {
      fullName,
      username: currentUser.isAdmin ? username : target.username,
      roleLabel: currentUser.isAdmin ? roleLabel : target.roleLabel,
      avatarColor,
    };

    if (newPassword) {
      updateValues.passwordHash = bcrypt.hashSync(newPassword, 8);
    }

    const rows = await db
      .update(users)
      .set(updateValues)
      .where(eq(users.id, id))
      .returning();
    const u = rows[0];
    updatedMember = {
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      roleLabel: u.roleLabel,
      isAdmin: Boolean(u.isAdmin) || isTargetAdmin,
      avatarColor: u.avatarColor,
    };
  } else {
    const store = readLocalStore();
    const idx = store.users.findIndex((u) => u.id === id);
    if (idx === -1) {
      return NextResponse.json(
        { error: "Không tìm thấy thành viên!" },
        { status: 404 }
      );
    }
    const target = store.users[idx];
    const isTargetAdmin = Boolean(target.isAdmin) || target.username === "bominh";

    if (
      currentUser.isAdmin &&
      username !== target.username.toLowerCase() &&
      store.users.some((u) => u.id !== id && u.username.toLowerCase() === username)
    ) {
      return NextResponse.json(
        { error: "Tên đăng nhập mới đã tồn tại trong gia đình!" },
        { status: 400 }
      );
    }

    store.users[idx] = {
      ...target,
      fullName,
      username: currentUser.isAdmin ? username : target.username,
      roleLabel: currentUser.isAdmin ? roleLabel : target.roleLabel,
      isAdmin: isTargetAdmin,
      avatarColor,
      passwordHash: newPassword
        ? bcrypt.hashSync(newPassword, 8)
        : target.passwordHash,
    };
    writeLocalStore(store);
    const u = store.users[idx];
    updatedMember = {
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      roleLabel: u.roleLabel,
      isAdmin: Boolean(u.isAdmin),
      avatarColor: u.avatarColor,
    };
  }

  const res = NextResponse.json({ ok: true, member: updatedMember });

  // Nếu người dùng đang sửa chính tài khoản của mình, làm mới luôn session cookie
  if (currentUser.id === updatedMember.id) {
    const token = await createSessionToken(updatedMember);
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return res;
}

export async function DELETE(req: NextRequest) {
  await ensureNeonSchema();
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json(
      { error: "Vui lòng đăng nhập trước khi thực hiện!" },
      { status: 401 }
    );
  }
  if (!currentUser.isAdmin) {
    return NextResponse.json(
      { error: "Chỉ tài khoản Admin mới có quyền xóa thành viên!" },
      { status: 403 }
    );
  }

  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ error: "Thiếu ID thành viên" }, { status: 400 });
  }
  if (id === currentUser.id) {
    return NextResponse.json(
      { error: "Không thể tự xóa tài khoản Admin đang đăng nhập!" },
      { status: 400 }
    );
  }

  const db = getDrizzleDb();
  if (db && isNeonConfigured()) {
    const target = await db.select().from(users).where(eq(users.id, id));
    if (target[0]?.isAdmin || target[0]?.username === "bominh") {
      return NextResponse.json(
        { error: "Không thể xóa tài khoản Quản trị viên (Admin)!" },
        { status: 400 }
      );
    }
    await db.delete(users).where(eq(users.id, id));
  } else {
    const store = readLocalStore();
    const target = store.users.find((u) => u.id === id);
    if (target?.isAdmin || target?.username === "bominh") {
      return NextResponse.json(
        { error: "Không thể xóa tài khoản Quản trị viên (Admin)!" },
        { status: 400 }
      );
    }
    store.users = store.users.filter((u) => u.id !== id);
    writeLocalStore(store);
  }
  return NextResponse.json({ ok: true });
}
