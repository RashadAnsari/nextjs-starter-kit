import { S3Client } from "@aws-sdk/client-s3";

/**
 * S3-compatible object storage. forcePathStyle keeps the client working with
 * providers that do not support virtual-hosted bucket subdomains (MinIO and
 * most self-hosted gateways).
 */
export const s3 = new S3Client({
  region: process.env.S3_REGION ?? "auto",
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },
});

/** The private bucket the upload helpers read and write. */
export const UPLOADS_BUCKET = process.env.S3_BUCKET_UPLOADS ?? "uploads";
