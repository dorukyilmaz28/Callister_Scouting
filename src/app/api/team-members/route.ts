import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.teamNumber == null) {
      return NextResponse.json({ error: "Takım numaranız tanımlı değil" }, { status: 403 });
    }
    const users = await prisma.user.findMany({
      where: { teamNumber: session.teamNumber },
      select: { id: true, fullName: true, name: true, email: true },
      orderBy: { fullName: "asc" },
    });
    return NextResponse.json(
      users.map((u) => ({
        id: u.id,
        fullName: u.fullName ?? u.name,
        email: u.email,
      }))
    );
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
