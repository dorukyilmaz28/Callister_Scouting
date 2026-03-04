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

    const url = buildFrcUrl(parsed.season, parsed.eventCode, "schedule");
    const res = await fetch(url, {
      headers: { Authorization: auth, Accept: "application/json" },
      next: { revalidate: 60 },
    });

    if (res.status === 304)
      return new NextResponse(null, { status: 304 });
    if (res.status === 404)
      return NextResponse.json(
        { error: "Bu etkinlik için henüz program yok (etkinlik aktif değil veya FMS’te kayıt yok).",
        schedule: null,
      });
    if (!res.ok) {
      const text = await res.text();
      console.warn("[frc/schedule] FRC API", res.status, text.slice(0, 150));
      return NextResponse.json({
        error: res.status === 401
          ? "FRC API yetkisi yok (kullanıcı/şifre kontrol edin)."
          : `FRC API yanıt vermedi (${res.status}). Etkinlik henüz açılmamış olabilir.`,
        schedule: null,
      });
    }

    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      return NextResponse.json({
        error: "FRC API geçersiz yanıt; program şu an gösterilemiyor.",
        schedule: null,
      });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("[frc/schedule]", e);
    return NextResponse.json({
      error: "Maç programı alınamadı.",
      schedule: null,
    });
  }
}
