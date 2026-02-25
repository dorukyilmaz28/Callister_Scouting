import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [totalMatchScouts, totalPitScouts, matchByEvent, pitByEvent] = await Promise.all([
      prisma.matchScout.count({ where: { userId: session.id } }),
      prisma.pitScout.count({ where: { userId: session.id } }),
      prisma.matchScout.groupBy({
        by: ["eventId"],
        where: { userId: session.id },
        _count: { id: true },
      }),
      prisma.pitScout.groupBy({
        by: ["eventId"],
        where: { userId: session.id },
        _count: { id: true },
      }),
    ]);

    const eventIds = Array.from(new Set([
      ...matchByEvent.map((m) => m.eventId),
      ...pitByEvent.map((p) => p.eventId),
    ]));
    const matchCountByEvent = new Map(matchByEvent.map((m) => [m.eventId, m._count.id]));
    const pitCountByEvent = new Map(pitByEvent.map((p) => [p.eventId, p._count.id]));

    const events = eventIds.length > 0
      ? await prisma.event.findMany({
          where: { id: { in: eventIds } },
          select: { id: true, name: true },
        })
      : [];
    const eventsMap = new Map(events.map((e) => [e.id, e.name]));

    const byEvent = eventIds.map((eventId) => ({
      eventId,
      eventName: eventsMap.get(eventId) ?? "—",
      matchCount: matchCountByEvent.get(eventId) ?? 0,
      pitCount: pitCountByEvent.get(eventId) ?? 0,
    })).sort((a, b) => (a.eventName.localeCompare(b.eventName)));

    return NextResponse.json({
      user: session,
      totalMatchScouts,
      totalPitScouts,
      byEvent,
    });
  } catch (e) {
    return NextResponse.json({ error: "Profil yüklenemedi" }, { status: 500 });
  }
}
