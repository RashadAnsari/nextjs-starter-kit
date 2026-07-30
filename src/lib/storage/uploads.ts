import "server-only";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, UPLOADS_BUCKET } from "@/lib/storage/s3";

/** How long a signed download link stays valid. */
const SIGNED_URL_TTL_SECONDS = 300;

/**
 * Object keys are namespaced by user id so a signed URL can never be minted for
 * another user's object: every read goes through userUploadKey, which rebuilds
 * the prefix from the session rather than trusting the request.
 */
export function userUploadKey(userId: string, filename: string): string {
  // Strip any path separators so a crafted filename cannot climb out of the
  // user's own prefix.
  const safeName = filename.replace(/[/\\]/g, "_");
  return `${userId}/${safeName}`;
}

/** Stores an object and returns its key. */
export async function putUpload({
  userId,
  filename,
  body,
  contentType,
}: {
  userId: string;
  filename: string;
  body: Buffer | Uint8Array;
  contentType: string;
}): Promise<string> {
  const key = userUploadKey(userId, filename);
  await s3.send(
    new PutObjectCommand({
      Bucket: UPLOADS_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return key;
}

/**
 * A short-lived signed URL for one of the user's own objects. The bucket stays
 * private: this is the only way the browser gets at its contents.
 */
export async function signedUploadUrl(userId: string, filename: string): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: UPLOADS_BUCKET, Key: userUploadKey(userId, filename) }),
    { expiresIn: SIGNED_URL_TTL_SECONDS }
  );
}

export async function deleteUpload(userId: string, filename: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({ Bucket: UPLOADS_BUCKET, Key: userUploadKey(userId, filename) })
  );
}

/**
 * Public URL for an object in the public assets bucket. The bucket root is the
 * domain root when a custom domain is bound to it, so there is no bucket name
 * in the path.
 */
export function publicAssetUrl(key: string): string {
  const base = process.env.ASSETS_BASE_URL ?? "";
  return `${base.replace(/\/$/, "")}/${key.replace(/^\//, "")}`;
}
