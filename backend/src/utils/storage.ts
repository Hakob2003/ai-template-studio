import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  endpoint: process.env.STORAGE_ENDPOINT || 'http://minio:9000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.STORAGE_SECRET_KEY || 'minioadmin',
  },
  forcePathStyle: true,
});

const BUCKET = process.env.STORAGE_BUCKET || 'ai-studio';
const PUBLIC_URL = process.env.STORAGE_PUBLIC_URL || 'http://localhost:9000/ai-studio';

export async function uploadToStorage(
  buffer: Buffer,
  path: string,
  contentType: string = 'image/png'
): Promise<string> {
  const key = `generations/${path}`;
  
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    // ACL: 'public-read', // если нужно публичное чтение
  }));

  return `${PUBLIC_URL}/${key}`;
}

export async function getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn });
}

export async function deleteFromStorage(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }));
}