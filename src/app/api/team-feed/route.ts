import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg"];

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.teamNumber == null) {
      return NextResponse.json({ error: "Takım numaranız tanımlı değil" }, { status: 403 });
    }
    const posts = await prisma.matchDataPost.findMany({
      where: { teamNumber: session.teamNumber },
      include: { user: { select: { fullName: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(
      posts.map((p) => ({
        id: p.id,
        imageUrl: p.imageUrl ?? null,
        caption: p.caption,
        createdAt: p.createdAt,
        userFullName: p.user.fullName ?? p.user.name,
      }))
    );
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.teamNumber == null) {
      return NextResponse.json({ error: "Takım numaranız tanımlı değil" }, { status: 403 });
    }
    const contentType = request.headers.get("content-type") ?? "";
    let caption: string | null = null;
    let file: File | null = null;

    if (contentType.includes("application/json")) {
      const body = await request.json();
      caption = body?.caption?.trim() || null;
      if (!caption) {
        return NextResponse.json({ error: "Metin paylaşımı için caption gerekli" }, { status: 400 });
      }
    } else {
      const formData = await request.formData();
      file = formData.get("file") as File | null;
      caption = (formData.get("caption") as string | null)?.trim() || null;
    }

    if (!file || (file && file.size === 0)) {
      if (!caption) return NextResponse.json({ error: "Görsel veya metin gerekli" }, { status: 400 });
      try {
        const post = await prisma.matchDataPost.create({
          data: {
            userId: session.id,
            teamNumber: session.teamNumber,
            imageUrl: null,
            caption,
          },
        });
        return NextResponse.json({
          id: post.id,
          imageUrl: null,
          caption: post.caption,
          createdAt: post.createdAt,
        });
      } catch (createErr) {
        console.error("[team-feed] text post create failed", createErr);
        return NextResponse.json(
          { error: "Metin paylaşımı kaydedilemedi. Veritabanında image_url sütunu opsiyonel olmalı (prisma/add-match-data-post-optional-image.sql)." },
          { status: 500 }
        );
      }
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Sadece PNG veya JPEG yükleyebilirsiniz" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Dosya 5MB'dan küçük olmalı" }, { status: 400 });
    }
    const ext = file.type === "image/png" ? "png" : "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const filepath = path.join(uploadsDir, filename);
    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));
    const imageUrl = `/uploads/${filename}`;
    const post = await prisma.matchDataPost.create({
      data: {
        userId: session.id,
        teamNumber: session.teamNumber,
        imageUrl,
        caption: caption || null,
      },
    });
    return NextResponse.json({
      id: post.id,
      imageUrl: post.imageUrl,
      caption: post.caption,
      createdAt: post.createdAt,
    });
  } catch (e) {
    return NextResponse.json({ error: "Yükleme başarısız" }, { status: 500 });
  }
}
