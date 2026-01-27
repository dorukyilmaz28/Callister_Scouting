import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, requireRole } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: eventId } = await params;
  const matches = await prisma.match.findMany({
    where: { eventId },
    orderBy: [{ matchType: "asc" }, { matchNumber: "asc" }],
    include: { matchScouts: { include: { team: true } } },
  });
  return NextResponse.json(matches);
}

export async function POST(request: Request) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { eventId, matchNumber, matchType } = body;
    if (!eventId || matchNumber == null || !matchType) {
      return NextResponse.json(
        { error: "eventId, matchNumber, matchType required" },
        { status: 400 }
      );
    }
    const match = await prisma.match.create({
      data: { eventId, matchNumber: Number(matchNumber), matchType },
    });
    return NextResponse.json(match);
  } catch (e) {
    return NextResponse.json({ error: "Create match failed" }, { status: 500 });
  }
}
