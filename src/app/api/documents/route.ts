import { NextRequest, NextResponse } from "next/server";
import {
  ensureNeonSchema,
  getDrizzleDb,
  isNeonConfigured,
  readLocalStore,
  writeLocalStore,
} from "@/db";
import { personalDocuments } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  await ensureNeonSchema();
  const db = getDrizzleDb();

  if (db && isNeonConfigured()) {
    const rows = await db.select().from(personalDocuments);
    return NextResponse.json({ documents: rows });
  } else {
    const store = readLocalStore();
    return NextResponse.json({ documents: store.personalDocuments });
  }
}

export async function POST(req: NextRequest) {
  await ensureNeonSchema();
  const body = await req.json();

  const title = String(body.title || "").trim();
  const docType = (body.docType || "birth_cert") as
    | "birth_cert"
    | "health_ins"
    | "id_card"
    | "passport"
    | "school"
    | "other";
  const docNumber = String(body.docNumber || "").trim();
  const memberId = body.memberId ? Number(body.memberId) : null;
  const holderName = String(body.holderName || "Thành viên").trim();
  const issueDate = String(body.issueDate || "").trim();
  const expiryDate = String(body.expiryDate || "").trim();
  const issuePlace = String(body.issuePlace || "").trim();
  const frontImage = String(body.frontImage || "");
  const backImage = String(body.backImage || "");
  const note = String(body.note || "").trim();

  if (!title || !docNumber) {
    return NextResponse.json(
      { error: "Vui lòng nhập Tên giấy tờ và Số/Mã giấy tờ!" },
      { status: 400 }
    );
  }

  const db = getDrizzleDb();
  if (db && isNeonConfigured()) {
    const inserted = await db
      .insert(personalDocuments)
      .values({
        title,
        docType,
        docNumber,
        memberId,
        holderName,
        issueDate,
        expiryDate,
        issuePlace,
        frontImage,
        backImage,
        note,
      })
      .returning();
    return NextResponse.json({ ok: true, document: inserted[0] });
  } else {
    const store = readLocalStore();
    const nextId =
      store.personalDocuments.reduce((m, d) => Math.max(m, d.id), 0) + 1;
    const item = {
      id: nextId,
      title,
      docType,
      docNumber,
      memberId,
      holderName,
      issueDate,
      expiryDate,
      issuePlace,
      frontImage,
      backImage,
      note,
      createdAt: new Date().toISOString(),
    };
    store.personalDocuments.unshift(item);
    writeLocalStore(store);
    return NextResponse.json({ ok: true, document: item });
  }
}

export async function DELETE(req: NextRequest) {
  await ensureNeonSchema();
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ error: "Thiếu ID giấy tờ" }, { status: 400 });
  }
  const db = getDrizzleDb();
  if (db && isNeonConfigured()) {
    await db.delete(personalDocuments).where(eq(personalDocuments.id, id));
  } else {
    const store = readLocalStore();
    store.personalDocuments = store.personalDocuments.filter((d) => d.id !== id);
    writeLocalStore(store);
  }
  return NextResponse.json({ ok: true });
}
