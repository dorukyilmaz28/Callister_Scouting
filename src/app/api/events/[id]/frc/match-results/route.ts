import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  getFrcAuthHeader,
  getSeasonAndEventCode,
  buildFrcUrl,
} from "@/lib/frc-api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const auth = getFrcAuthHeader();
    if (!auth)
      return NextResponse.json(
        { error: "FRC Events API yapılandırılmamış (FRC_EVENTS_API_USER/KEY)" },
        { status: 503 }
      );

    const { id: eventId } = await params;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { code: true, tbaEventKey: true },
    });
    if (!event)
      return NextResponse.json({ error: "Etkinlik bulunamadı" }, { status: 404 });

    const codeOrKey = event.tbaEventKey ?? event.code;
    const parsed = getSeasonAndEventCode(codeOrKey);
    if (!parsed)
      return NextResponse.json(
        { error: "Bu etkinlik için FRC event kodu türetilemedi" },
        { status: 400 }
      );

    const url = buildFrcUrl(parsed.season, parsed.eventCode, "scores");
    const res = await fetch(url, {
      headers: { Authorization: auth, Accept: "application/json" },
      next: { revalidate: 60 },
    });

    if (res.status === 304)
      return new NextResponse(null, { status: 304 });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `FRC API hatası: ${res.status}`, details: text.slice(0, 200) },
        { status: res.status === 401 ? 503 : res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    console.error("[frc/match-results]", e);
    return NextResponse.json(
      { error: "Maç sonuçları alınamadı" },
      { status: 500 }
    );
  }
}
