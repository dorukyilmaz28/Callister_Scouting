import { NextResponse } from "next/server";
import { login } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, password } = body;
    if (!name || !password) {
      return NextResponse.json(
        { error: "İsim ve şifre gerekli" },
        { status: 400 }
      );
    }
    const user = await login(String(name).trim(), String(password));
    if (!user) {
      return NextResponse.json({ error: "İsim veya şifre hatalı" }, { status: 401 });
    }
    return NextResponse.json({ user });
  } catch (e) {
    return NextResponse.json({ error: "Giriş başarısız" }, { status: 500 });
  }
}
