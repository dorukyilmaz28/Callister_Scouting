import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const TBA_BASE = "https://www.thebluealliance.com/api/v3";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year") || new Date().getFullYear().toString();
    const key = process.env.TBA_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "TBA API key yapılandırılmamış" }, { status: 500 });
    }
    const res = await fetch(`${TBA_BASE}/events/${year}`, {
      headers: { "X-TBA-Auth-Key": key },
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "TBA isteği başarısız" },
        { status: res.status }
      );
    }
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data?.events ?? []) as unknown[];
    return NextResponse.json(list);
  } catch (e) {
    return NextResponse.json({ error: "TBA events alınamadı" }, { status: 500 });
  }
}
