import "server-only";
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, UPLOADS_BUCKET } from "@/lib/storage/s3";

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
 * Delete everything a user has uploaded and return how many objects went.
 *
 * userUploadKey namespaces every key by user id, so the id prefix selects
 * exactly one user's objects. Object storage takes no part in the database
 * cascade, so erasing an account has to remove them explicitly. Throws if the
 * provider reports a failed delete.
 */
export async function deleteUserUploads(userId: string): Promise<number> {
  let continuationToken: string | undefined;
  let deleted = 0;

  do {
    const listed = await s3.send(
      new ListObjectsV2Command({
        Bucket: UPLOADS_BUCKET,
        Prefix: `${userId}/`,
        ContinuationToken: continuationToken,
      })
    );

    // A page holds at most 1000 keys, which is also the DeleteObjects limit.
    const objects = (listed.Contents ?? [])
      .map((object) => object.Key)
      .filter((key): key is string => key !== undefined)
      .map((Key) => ({ Key }));

    if (objects.length > 0) {
      const result = await s3.send(
        new DeleteObjectsCommand({
          Bucket: UPLOADS_BUCKET,
          Delete: { Objects: objects, Quiet: true },
        })
      );
      const failed = result.Errors ?? [];
      if (failed.length > 0) {
        throw new Error(
          `Failed to delete ${failed.length} object(s), first: ${failed[0].Key} ${failed[0].Message}`
        );
      }
      deleted += objects.length;
    }

    continuationToken = listed.NextContinuationToken;
  } while (continuationToken);

  return deleted;
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
