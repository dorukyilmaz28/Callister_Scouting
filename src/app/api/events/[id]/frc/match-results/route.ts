import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  getFrcAuthHeader,
  getSeasonAndEventCode,
  buildFrcUrl,
} from "@/lib/frc-api";

function hasMatchScores(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  const arr =
    o.MatchScores ?? o.matchScores ?? o.matches ?? o.Matches ?? o.MatchResults ?? o.matchResults;
  return Array.isArray(arr) && arr.length > 0;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: eventId } = await params;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { code: true, tbaEventKey: true },
    });
    if (!event)
      return NextResponse.json({ error: "Etkinlik bulunamadı" }, { status: 404 });

    let data: unknown = null;
    const auth = getFrcAuthHeader();
    if (!auth) {
      return NextResponse.json({
        error:
          "FRC Events API anahtarı bulunamadı. Lütfen FRC_EVENTS_API_USER ve FRC_EVENTS_API_KEY ayarlayın.",
        MatchScores: [],
      });
    }

    {
      const codeOrKey = event.tbaEventKey ?? event.code;
      const parsed = getSeasonAndEventCode(codeOrKey);
      if (parsed) {
        const baseUrl = (path: "matches" | "scores") =>
          `${buildFrcUrl(parsed.season, parsed.eventCode, path)}`;

        let res = await fetch(baseUrl("scores"), {
          headers: { Authorization: auth, Accept: "application/json" },
          next: { revalidate: 60 },
        });
        if (!res.ok || res.status === 404) {
          res = await fetch(baseUrl("matches"), {
            headers: { Authorization: auth, Accept: "application/json" },
            next: { revalidate: 60 },
          });
        }

        if (res.status === 304) return new NextResponse(null, { status: 304 });
        if (res.ok) {
          const text = await res.text();
          try {
            data = text ? JSON.parse(text) : {};
          } catch {
            data = null;
          }
        }
      }
    }

    if (hasMatchScores(data)) return NextResponse.json({ ...(data as object), _source: "frc" });

    if (data && typeof data === "object" && "error" in (data as object))
      return NextResponse.json(data);

    return NextResponse.json({
      error: "FRC Events API'de bu etkinlik için henüz maç sonucu veya skor breakdown verisi bulunamadı.",
      MatchScores: [],
    });
  } catch (e) {
    console.error("[frc/match-results]", e);
    return NextResponse.json({
      error: "Maç sonuçları alınamadı.",
      MatchScores: [],
    });
  }
}
