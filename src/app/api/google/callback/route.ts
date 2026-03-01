import { NextResponse } from "next/server";
import { handleCallback } from "@/lib/google-auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
  }

  try {
    await handleCallback(code);
    return NextResponse.redirect(new URL("/", req.url));
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "OAuth callback failed" }, { status: 500 });
  }
}
