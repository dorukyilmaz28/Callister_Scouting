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
        { error: "FRC Events API yapılandırılmamış" },
        { status: 503 }
      );

    const { id: eventId } = await params;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { code: true, tbaEventKey: true },
    });
    if (!event)
      return NextResponse.json({ error: "Etkinlik bulunamadı" }, { status: 404 });

    const parsed = getSeasonAndEventCode(event.tbaEventKey ?? event.code);
    if (!parsed)
      return NextResponse.json(
        { error: "Bu etkinlik için FRC event kodu türetilemedi" },
        { status: 400 }
      );

    // Qual + playoff hepsi gelsin (kullanıcı seçili takımlarının tüm maçlarını görsün)
    const scheduleUrl = (tournamentLevel: string) =>
      `${buildFrcUrl(parsed.season, parsed.eventCode, "schedule")}?tournamentLevel=${encodeURIComponent(
        tournamentLevel
      )}`;

    // Qual + playoff hepsi için iki ayrı çağrı yapıyoruz (FRC API tek seferde “all” kabul etmeyebiliyor).
    const fetchLevel = async (tournamentLevel: string): Promise<unknown | null> => {
      try {
        const res = await fetch(scheduleUrl(tournamentLevel), {
          headers: { Authorization: auth, Accept: "application/json" },
          next: { revalidate: 60 },
        });

        if (res.status === 304) return null;
        if (res.status === 404) return null;
        if (!res.ok) {
          const text = await res.text();
          console.warn("[frc/schedule] FRC API", tournamentLevel, res.status, text.slice(0, 150));
          return null;
        }

        const text = await res.text();
        if (!text) return null;
        return JSON.parse(text);
      } catch (e) {
        console.warn("[frc/schedule] fetchLevel failed", tournamentLevel, e);
        return null;
      }
    };

    const [qualData, playoffData] = await Promise.all([
      fetchLevel("qual"),
      fetchLevel("playoff"),
    ]);

    const qualSchedule =
      qualData && typeof qualData === "object"
        ? (qualData as { Schedule?: unknown; schedule?: unknown }).Schedule ??
          (qualData as { Schedule?: unknown; schedule?: unknown }).schedule
        : null;
    const playoffSchedule =
      playoffData && typeof playoffData === "object"
        ? (playoffData as { Schedule?: unknown; schedule?: unknown }).Schedule ??
          (playoffData as { Schedule?: unknown; schedule?: unknown }).schedule
        : null;

    const merged = ([] as unknown[]).concat(
      Array.isArray(qualSchedule) ? qualSchedule : [],
      Array.isArray(playoffSchedule) ? playoffSchedule : []
    );

    return NextResponse.json({ Schedule: merged });
  } catch (e) {
    console.error("[frc/schedule]", e);
    return NextResponse.json({
      error: "Maç programı alınamadı.",
      schedule: null,
    });
  }
}
