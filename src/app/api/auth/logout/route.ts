import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

function getLoginUrl(request: Request): string {
  try {
    const url = new URL(request.url);
    return `${url.origin}/login`;
  } catch {
    return "/login";
  }
}

export async function POST(request: Request) {
  await destroySession();
  return NextResponse.json({ redirect: getLoginUrl(request) });
}

export async function GET(request: Request) {
  await destroySession();
  return NextResponse.redirect(getLoginUrl(request));
}
