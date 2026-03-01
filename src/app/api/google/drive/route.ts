import { NextResponse } from "next/server";
import { listFiles, searchFiles } from "@/lib/google-drive";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const folderId = searchParams.get("folderId") ?? undefined;
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));
    const pageToken = searchParams.get("pageToken") ?? undefined;

    if (q) {
      const files = await searchFiles(q);
      return NextResponse.json({ files, nextPageToken: null });
    }

    const result = await listFiles({ folderId, pageSize, pageToken });
    return NextResponse.json(result);
  } catch (error: any) {
    const status = error.message?.includes("not authenticated") ? 401 : 500;
    return NextResponse.json({ error: error.message || "Failed to list Drive files" }, { status });
  }
}
