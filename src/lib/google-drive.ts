import { google, drive_v3 } from "googleapis";
import { getAuthorizedClient } from "./google-auth";

function getDrive(): drive_v3.Drive | null {
  const auth = getAuthorizedClient();
  if (!auth) return null;
  return google.drive({ version: "v3", auth });
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string | null;
  modifiedTime: string | null;
  webViewLink: string | null;
  parents: string[] | null;
}

export async function listFiles(options?: {
  query?: string;
  folderId?: string;
  pageSize?: number;
  pageToken?: string;
  mimeType?: string;
}): Promise<{ files: DriveFile[]; nextPageToken: string | null }> {
  const drive = getDrive();
  if (!drive) throw new Error("Google Drive not authenticated. Visit /api/google/auth to connect.");

  const qParts: string[] = ["trashed = false"];
  if (options?.folderId) qParts.push(`'${options.folderId}' in parents`);
  if (options?.query) qParts.push(`name contains '${options.query}'`);
  if (options?.mimeType) qParts.push(`mimeType = '${options.mimeType}'`);

  const res = await drive.files.list({
    q: qParts.join(" and "),
    pageSize: options?.pageSize ?? 20,
    pageToken: options?.pageToken ?? undefined,
    fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, parents)",
    orderBy: "modifiedTime desc",
  });

  const files: DriveFile[] = (res.data.files ?? []).map((f) => ({
    id: f.id!,
    name: f.name!,
    mimeType: f.mimeType!,
    size: f.size ?? null,
    modifiedTime: f.modifiedTime ?? null,
    webViewLink: f.webViewLink ?? null,
    parents: (f.parents as string[]) ?? null,
  }));

  return { files, nextPageToken: res.data.nextPageToken ?? null };
}

export async function getFile(fileId: string): Promise<DriveFile & { content?: string }> {
  const drive = getDrive();
  if (!drive) throw new Error("Google Drive not authenticated.");

  const meta = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, size, modifiedTime, webViewLink, parents",
  });

  const file: DriveFile = {
    id: meta.data.id!,
    name: meta.data.name!,
    mimeType: meta.data.mimeType!,
    size: meta.data.size ?? null,
    modifiedTime: meta.data.modifiedTime ?? null,
    webViewLink: meta.data.webViewLink ?? null,
    parents: (meta.data.parents as string[]) ?? null,
  };

  const textTypes = [
    "text/",
    "application/json",
    "application/xml",
    "application/csv",
  ];
  const isText = textTypes.some((t) => file.mimeType.startsWith(t));
  const isGoogleDoc = file.mimeType.startsWith("application/vnd.google-apps.");

  let content: string | undefined;

  if (isGoogleDoc) {
    const exportMime =
      file.mimeType === "application/vnd.google-apps.spreadsheet"
        ? "text/csv"
        : "text/plain";
    const exported = await drive.files.export(
      { fileId, mimeType: exportMime },
      { responseType: "text" }
    );
    content = exported.data as string;
  } else if (isText) {
    const downloaded = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "text" }
    );
    content = downloaded.data as string;
  }

  return { ...file, content };
}

export async function searchFiles(query: string): Promise<DriveFile[]> {
  const { files } = await listFiles({ query, pageSize: 20 });
  return files;
}
