import { NextResponse } from "next/server";
import { getFile } from "@/lib/google-drive";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  try {
    const file = await getFile(fileId);
    return NextResponse.json(file);
  } catch (error: any) {
    const status = error.message?.includes("not authenticated") ? 401 : 500;
    return NextResponse.json({ error: error.message || "Failed to get file" }, { status });
  }
}
