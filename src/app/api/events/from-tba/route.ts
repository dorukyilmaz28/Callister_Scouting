import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const TBA_BASE = "https://www.thebluealliance.com/api/v3";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const eventKey = body?.eventKey?.trim();
    if (!eventKey) {
      return NextResponse.json({ error: "eventKey gerekli" }, { status: 400 });
    }
    const key = process.env.TBA_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "TBA API key yapılandırılmamış" }, { status: 500 });
    }

    const existing = await prisma.event.findUnique({
      where: { tbaEventKey: eventKey },
      include: { eventTeams: { include: { team: true } } },
    });
    if (existing) {
      return NextResponse.json(existing);
    }

    const eventRes = await fetch(`${TBA_BASE}/event/${encodeURIComponent(eventKey)}`, {
      headers: { "X-TBA-Auth-Key": key },
    });
    if (!eventRes.ok) {
      return NextResponse.json(
        { error: "TBA etkinlik bilgisi alınamadı" },
        { status: eventRes.status }
      );
    }
    const tbaEvent = (await eventRes.json()) as {
      name: string;
      key: string;
      start_date?: string;
      end_date?: string;
      short_name?: string;
    };
    const startDate = tbaEvent.start_date
      ? new Date(tbaEvent.start_date)
      : new Date();
    const endDate = tbaEvent.end_date
      ? new Date(tbaEvent.end_date)
      : new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000);
    const code = tbaEvent.key || eventKey;
    const name = tbaEvent.name || tbaEvent.short_name || eventKey;

    const event = await prisma.event.create({
      data: {
        name,
        code,
        tbaEventKey: eventKey,
        startDate,
        endDate,
        createdByUserId: session.id,
      },
    });

    return NextResponse.json(event);
  } catch (e) {
    return NextResponse.json({ error: "TBA'dan etkinlik oluşturulamadı" }, { status: 500 });
  }
}
