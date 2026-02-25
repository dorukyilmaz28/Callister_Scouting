import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const TBA_BASE = "https://www.thebluealliance.com/api/v3";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventKey: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { eventKey } = await params;
    if (!eventKey) {
      return NextResponse.json({ error: "eventKey gerekli" }, { status: 400 });
    }
    const key = process.env.TBA_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "TBA API key yapılandırılmamış" }, { status: 500 });
    }
    const res = await fetch(`${TBA_BASE}/event/${encodeURIComponent(eventKey)}/teams`, {
      headers: { "X-TBA-Auth-Key": key },
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "TBA teams isteği başarısız" },
        { status: res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: "TBA teams alınamadı" }, { status: 500 });
  }
}
