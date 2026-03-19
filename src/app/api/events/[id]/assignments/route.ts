import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, getSession } from "@/lib/auth";

const MAX_TEAMS_PER_SCOUT = 2;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: eventId } = await params;
    const isAdmin = session.role === "admin";
    const isStrategy = session.role === "strategy";
    if (isAdmin || isStrategy) {
      const assignments = await prisma.scoutAssignment.findMany({
        where: { eventId },
        include: { user: true, team: true },
      });
      return NextResponse.json(assignments);
    }
    const assignments = await prisma.scoutAssignment.findMany({
      where: { eventId, userId: session.id },
      include: { team: true },
    });
    return NextResponse.json(assignments);
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let session;
  try {
    session = await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { eventId, userId, teamIds } = body;
    if (!eventId || !userId || !Array.isArray(teamIds)) {
      return NextResponse.json(
        { error: "eventId, userId, teamIds (array) required" },
        { status: 400 }
      );
    }
    if (teamIds.length !== MAX_TEAMS_PER_SCOUT) {
      return NextResponse.json(
        { error: `Exactly ${MAX_TEAMS_PER_SCOUT} teams per scout required` },
        { status: 400 }
      );
    }
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { eventTeams: true },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, teamNumber: true, role: true },
    });
    if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Admin sadece kendi takımındaki üyeleri yönetebilir.
    if (
      session.teamNumber != null &&
      targetUser.teamNumber !== session.teamNumber
    ) {
      return NextResponse.json(
        { error: "Sadece kendi takımındaki kullanıcıları atayabilirsiniz." },
        { status: 403 }
      );
    }

    if (targetUser.role !== "scout") {
      return NextResponse.json(
        { error: "Atama sadece scout rolündeki kullanıcıya yapılabilir." },
        { status: 400 }
      );
    }

    const validTeamIds = event.eventTeams
      .filter((et) => teamIds.includes(et.teamId))
      .map((et) => et.teamId);
    if (validTeamIds.length !== MAX_TEAMS_PER_SCOUT) {
      return NextResponse.json(
        { error: "All teamIds must be in this event" },
        { status: 400 }
      );
    }
    await prisma.scoutAssignment.deleteMany({ where: { eventId, userId } });
    await prisma.scoutAssignment.createMany({
      data: validTeamIds.map((teamId) => ({ eventId, userId, teamId })),
    });
    const assignments = await prisma.scoutAssignment.findMany({
      where: { eventId, userId },
      include: { team: true },
    });
    return NextResponse.json(assignments);
  } catch (e) {
    return NextResponse.json({ error: "Assign failed" }, { status: 500 });
  }
}
