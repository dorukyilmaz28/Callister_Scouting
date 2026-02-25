import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, fullName, teamNumber, password } = body;
    if (!email || !fullName || teamNumber == null || teamNumber === "" || !password) {
      return NextResponse.json(
        { error: "E-posta, ad soyad, takım numarası ve şifre gerekli" },
        { status: 400 }
      );
    }
    const em = String(email).trim().toLowerCase();
    const tn = typeof teamNumber === "number" ? teamNumber : parseInt(String(teamNumber), 10);
    if (Number.isNaN(tn) || tn < 1 || tn > 99999) {
      return NextResponse.json(
        { error: "Geçerli bir takım numarası girin (1–99999)" },
        { status: 400 }
      );
    }
    const existing = await prisma.user.findUnique({ where: { email: em } });
    if (existing) {
      return NextResponse.json({ error: "Bu e-posta adresi zaten kayıtlı" }, { status: 400 });
    }
    const passwordHash = await hashPassword(String(password));
    const fullNameStr = String(fullName).trim();
    const user = await prisma.user.create({
      data: {
        email: em,
        fullName: fullNameStr,
        teamNumber: tn,
        name: em,
        passwordHash,
        role: "scout",
      },
    });
    return NextResponse.json({
      user: { id: user.id, email: user.email, fullName: user.fullName, teamNumber: user.teamNumber, role: user.role },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Kayıt başarısız";
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" ? message : "Kayıt başarısız" },
      { status: 500 }
    );
  }
}
