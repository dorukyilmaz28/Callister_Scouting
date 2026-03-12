import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const maxDuration = 60;

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

function buildScoutSummary(event: {
  name: string;
  code: string;
  eventTeams: { team: { number: number; name: string | null } }[];
  pitScouts: {
    team: { number: number; name: string | null };
    drivetrainType: string;
    robotType: string;
    intakeType: string | null;
    intakeDescription: string | null;
    shooterType: string | null;
    climbCapability: string | null;
    climbSystemDescription: string | null;
    teamToldUs: string | null;
    scoutObservations: string | null;
  }[];
  matchScouts: {
    team: { number: number; name: string | null };
    match: { matchNumber: number; matchType: string };
    autoAttempted: boolean;
    autoScoreCount: number;
    gamePieceCount: number;
    climbAttempted: boolean;
    climbSuccess: boolean;
    climbType: string | null;
    driverSkill: number | null;
    scoutComments: string | null;
  }[];
}): string {
  const lines: string[] = [
    `# Etkinlik: ${event.name} (${event.code})`,
    `Toplam takım: ${event.eventTeams.length}`,
    "",
    "## Pit scout verileri",
  ];

  for (const p of event.pitScouts) {
    lines.push(
      `### Takım ${p.team.number}${p.team.name ? ` – ${p.team.name}` : ""}`,
      `Drivetrain: ${p.drivetrainType}, Robot: ${p.robotType}`,
      `Intake: ${p.intakeType ?? "—"}${p.intakeDescription ? ` – ${p.intakeDescription}` : ""}`,
      `Shooter: ${p.shooterType ?? "—"}, Tırmanma: ${p.climbCapability ?? "—"}`,
      p.climbSystemDescription ? `Tırmanma açıklama: ${p.climbSystemDescription}` : "",
      p.teamToldUs ? `Takımın söyledikleri: ${p.teamToldUs}` : "",
      p.scoutObservations ? `Scout gözlemleri: ${p.scoutObservations}` : "",
      ""
    );
  }

  lines.push("## Maç scout verileri (özet)");
  const byTeam = new Map<number, typeof event.matchScouts>();
  for (const m of event.matchScouts) {
    const n = m.team.number;
    if (!byTeam.has(n)) byTeam.set(n, []);
    byTeam.get(n)!.push(m);
  }
  for (const [num, scouts] of byTeam) {
    const avgAuto =
      scouts.filter((s) => s.autoAttempted).length > 0
        ? (
            scouts.filter((s) => s.autoAttempted).reduce((a, s) => a + s.autoScoreCount, 0) /
            scouts.filter((s) => s.autoAttempted).length
          ).toFixed(1)
        : "—";
    const avgTeleop =
      scouts.length > 0
        ? (scouts.reduce((a, s) => a + s.gamePieceCount, 0) / scouts.length).toFixed(1)
        : "—";
    const climbOk = scouts.filter((s) => s.climbAttempted && s.climbSuccess).length;
    const climbAttempts = scouts.filter((s) => s.climbAttempted).length;
    const climbRate =
      climbAttempts > 0 ? `${climbOk}/${climbAttempts}` : "—";
    lines.push(
      `Takım ${num}: ${scouts.length} maç · Ort. auto: ${avgAuto} · Ort. teleop: ${avgTeleop} · Tırmanma: ${climbRate}`,
      scouts.slice(0, 5).map((s) => `  ${s.match.matchType} ${s.match.matchNumber}: auto ${s.autoScoreCount}, teleop ${s.gamePieceCount}, climb ${s.climbSuccess ? "✓" : "✗"}`).join("\n"),
      ""
    );
  }

  return lines.filter(Boolean).join("\n");
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Giriş yapın" }, { status: 401 });

    const key = process.env.GOOGLE_GEMINI_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "Callister AI yapılandırılmamış (GOOGLE_GEMINI_API_KEY)" },
        { status: 503 }
      );
    }

    const { id: eventId } = await params;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        eventTeams: { include: { team: true } },
        pitScouts: { include: { team: true } },
        matchScouts: {
          include: { team: true, match: true },
          orderBy: [{ match: { matchNumber: "asc" } }, { match: { matchType: "asc" } }],
        },
      },
    });
    if (!event) return NextResponse.json({ error: "Etkinlik bulunamadı" }, { status: 404 });

    const summary = buildScoutSummary(event);
    if (summary.length < 100) {
      return NextResponse.json({
        analysis: "Henüz yeterli pit veya maç scout verisi yok. Birkaç takım için pit ve maç girişi yaptıktan sonra tekrar deneyin.",
      });
    }

    const prompt = `Sen FRC (FIRST Robotics Competition) scout verilerini analiz eden "Callister AI" asistanısın. Aşağıdaki pit ve maç scout verilerini inceleyip Türkçe, kısa ve öz bir analiz yaz: hangi takımlar öne çıkıyor, güçlü/zayıf yönler, takım taktikleri veya notlar hakkında yorum yap. Sadece verilen verilere dayan. Yanıtını 2–3 paragrafta tamamla, kesinlikle yarıda bırakma.\n\n---\n\n${summary}`;

    const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 3000,
          temperature: 0.4,
        },
      }),
      signal: AbortSignal.timeout(50000),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn("[ai-analyze] Gemini API", res.status, err.slice(0, 200));
      return NextResponse.json(
        { error: "AI yanıt vermedi. API anahtarını ve kotayı kontrol edin." },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ??
      "Analiz oluşturulamadı.";

    return NextResponse.json({ analysis: text });
  } catch (e) {
    console.error("[ai-analyze]", e);
    return NextResponse.json(
      { error: "Analiz alınırken hata oluştu." },
      { status: 500 }
    );
  }
}
