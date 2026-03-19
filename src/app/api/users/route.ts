import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET() {
  let session;
  try {
    session = await requireRole(["admin", "strategy"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const where =
    session.role === "admin" && session.teamNumber != null
      ? { teamNumber: session.teamNumber }
      : {};

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, fullName: true, email: true, role: true },
    orderBy: { fullName: "asc" },
  });
  return NextResponse.json(users);
}
