import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function connection() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) throw new Error('Cloudflare R2 não configurado.');
  return {
    bucket,
    client: new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

function ttl(name: string, fallback: number, min: number, max: number) {
  const parsed = Number(process.env[name] || fallback);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export async function signedUpload(key: string, contentType: string) {
  const { client, bucket } = connection();
  return getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }), {
    expiresIn: ttl('R2_UPLOAD_URL_TTL', 3600, 300, 3600),
  });
}

export async function signedGet(key: string, options?: { downloadName?: string; contentType?: string; expiresIn?: number }) {
  const { client, bucket } = connection();
  return getSignedUrl(client, new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentType: options?.contentType,
    ResponseContentDisposition: options?.downloadName ? `attachment; filename="${options.downloadName}"` : undefined,
  }), { expiresIn: options?.expiresIn || ttl('R2_DOWNLOAD_URL_TTL', 900, 60, 3600) });
}

export async function inspectObject(key: string) {
  const { client, bucket } = connection();
  return client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
}

export async function deleteObject(key: string) {
  const { client, bucket } = connection();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
