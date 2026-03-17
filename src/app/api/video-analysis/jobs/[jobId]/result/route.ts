import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.id)
      return NextResponse.json({ error: "Giriş yapın" }, { status: 401 });

    const { jobId } = await params;
    const job = await prisma.videoAnalysisJob.findUnique({
      where: { id: jobId },
      select: { userId: true },
    });

    if (!job || job.userId !== session.id)
      return NextResponse.json({ error: "İş bulunamadı" }, { status: 404 });

    const result = await prisma.videoAnalysisResult.findUnique({
      where: { jobId },
      include: {
        analyzedTeams: { orderBy: { teamNumber: "asc" } },
        analysisEvents: { orderBy: { timestampSec: "asc" } },
      },
    });

    if (!result)
      return NextResponse.json({ error: "Sonuç henüz hazır değil" }, { status: 404 });

    return NextResponse.json(result);
  } catch (e) {
    console.error("[video-analysis/result GET]", e);
    return NextResponse.json({ error: "Yüklenemedi" }, { status: 500 });
  }
}
