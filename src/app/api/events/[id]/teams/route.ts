import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

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
  const teams = await prisma.eventTeam.findMany({
    where: { eventId },
    include: { team: true },
  });
  return NextResponse.json(teams.map((et) => et.team));
}
