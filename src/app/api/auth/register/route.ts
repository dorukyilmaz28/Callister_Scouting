import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { requireRole } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { name, password, role } = body;
    if (!name || !password || !role) {
      return NextResponse.json(
        { error: "İsim, şifre ve rol gerekli" },
        { status: 400 }
      );
    }
    const validRoles = ["admin", "scout", "strategy"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Geçersiz rol" }, { status: 400 });
    }
    const nm = String(name).trim();
    const existing = await prisma.user.findUnique({ where: { name: nm } });
    if (existing) {
      return NextResponse.json({ error: "Bu isim zaten kayıtlı" }, { status: 400 });
    }
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name: nm, passwordHash, role },
    });
    return NextResponse.json({
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch (e) {
    return NextResponse.json({ error: "Kayıt başarısız" }, { status: 500 });
  }
}
