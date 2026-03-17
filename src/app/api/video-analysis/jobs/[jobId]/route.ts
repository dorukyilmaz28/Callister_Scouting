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
    });

    if (!job || job.userId !== session.id)
      return NextResponse.json({ error: "İş bulunamadı" }, { status: 404 });

    return NextResponse.json(job);
  } catch (e) {
    console.error("[video-analysis/jobs/[jobId] GET]", e);
    return NextResponse.json({ error: "Yüklenemedi" }, { status: 500 });
  }
}

export async function DELETE(
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

    await prisma.videoAnalysisJob.delete({ where: { id: jobId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[video-analysis/jobs/[jobId] DELETE]", e);
    return NextResponse.json({ error: "Silinemedi" }, { status: 500 });
  }
}
