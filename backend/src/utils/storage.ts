import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs/promises';
import path from 'path';

// Determine storage mode: 'local' or 's3'
const STORAGE_MODE = process.env.STORAGE_MODE || (process.env.STORAGE_ENDPOINT ? 's3' : 'local');
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

// S3/MinIO client (only initialized if using S3 mode)
let s3: S3Client | null = null;
if (STORAGE_MODE === 's3') {
  s3 = new S3Client({
    endpoint: process.env.STORAGE_ENDPOINT || 'http://minio:9000',
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY || 'minioadmin',
      secretAccessKey: process.env.STORAGE_SECRET_KEY || 'minioadmin',
    },
    forcePathStyle: true,
  });
}

const BUCKET = process.env.STORAGE_BUCKET || 'ai-studio';
const PUBLIC_URL = process.env.STORAGE_PUBLIC_URL || 'http://localhost:9000/ai-studio';

export async function uploadToStorage(
  buffer: Buffer,
  filePath: string,
  contentType: string = 'image/png'
): Promise<string> {
  if (STORAGE_MODE === 's3' && s3) {
    // S3/MinIO mode
    const key = `generations/${filePath}`;
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));
    return `${PUBLIC_URL}/${key}`;
  } else {
    // Local file mode (for Render / cloud deployments without MinIO)
    const dir = path.join(UPLOADS_DIR, 'generations', path.dirname(filePath));
    await fs.mkdir(dir, { recursive: true });
    const fullPath = path.join(UPLOADS_DIR, 'generations', filePath);
    await fs.writeFile(fullPath, buffer);
    return `${BACKEND_URL}/uploads/generations/${filePath}`;
  }
}

export async function getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
  if (STORAGE_MODE === 's3' && s3) {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });
    return getSignedUrl(s3, command, { expiresIn });
  } else {
    // Local mode: return direct URL
    return `${BACKEND_URL}/uploads/${key}`;
  }
}

export async function deleteFromStorage(key: string): Promise<void> {
  if (STORAGE_MODE === 's3' && s3) {
    await s3.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }));
  } else {
    const fullPath = path.join(UPLOADS_DIR, key);
    await fs.unlink(fullPath).catch(() => {});
  }
}