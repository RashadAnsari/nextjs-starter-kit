import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { putUpload, signedUploadUrl } from "@/lib/storage/uploads";

/**
 * Worked example of an authenticated S3 upload. Delete it if your app does not
 * store files, or use it as the shape for your own upload routes.
 *
 * Object storage enforces no size or content-type limit of its own, so this
 * handler is the only place either is checked.
 */
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Expected a `file` field" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is larger than 10 MB" }, { status: 413 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 415 });
  }

  const key = await putUpload({
    userId: user.id,
    filename: file.name,
    body: Buffer.from(await file.arrayBuffer()),
    contentType: file.type,
  });

  return NextResponse.json({ key });
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filename = req.nextUrl.searchParams.get("filename");
  if (!filename) {
    return NextResponse.json({ error: "Missing `filename`" }, { status: 400 });
  }

  // The key is rebuilt from the session user id, so a caller cannot reach
  // another user's objects by passing a crafted filename.
  return NextResponse.json({ url: await signedUploadUrl(user.id, filename) });
}
