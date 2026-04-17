/**
 * Extracted and simplified from a personal marketplace project (in development)
 * for portfolio purposes. Renamed to generic domain terms; integrations and
 * business rules removed. Technical approach preserved verbatim.
 *
 * What this demonstrates:
 *   - S3 upload with the three validations that never get skipped in
 *     production: MIME whitelist, max file size, random key generation.
 *   - MIME whitelist (not extension check) — browser-supplied extensions
 *     lie; the `Content-Type` header can lie too, but at least it gets
 *     validated by an SDK downstream. Combining both gives defense in
 *     depth.
 *   - `randomUUID()` for keys. Never use user-supplied filenames in the
 *     S3 key — they leak PII, enable enumeration, and collide across
 *     users.
 *   - The returned URL is the virtual-hosted bucket URL. If your bucket
 *     is private, swap this for a `GetObjectCommand` pre-signed URL and
 *     don't store the direct S3 URL anywhere.
 *
 * Pair this with a thin REST controller (not a GraphQL mutation) for the
 * actual upload endpoint — multipart/form-data is painful over GraphQL and
 * the alternatives (base64-encoded strings, Apollo Upload scalar) have
 * worse ergonomics.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { extname } from 'path';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB — tune per use case

// Minimal stand-in for the Multer file shape. If you're already wiring
// Multer into the controller, reuse `Express.Multer.File` here.
type UploadFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class UploadService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor() {
    this.bucket = process.env.AWS_S3_BUCKET!;
    this.region = process.env.AWS_REGION!;
    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  async uploadImage(file: UploadFile, folder = 'uploads'): Promise<string> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype as (typeof ALLOWED_MIME_TYPES)[number])) {
      throw new BadRequestException('Only JPEG, PNG and WebP images are allowed');
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File size must not exceed ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB`,
      );
    }

    // Always pick the extension from the original name but normalize to
    // lowercase; `.JPG` and `.jpg` should land under the same bucket.
    const ext = extname(file.originalname).toLowerCase() || '.jpg';
    const key = `${folder}/${randomUUID()}${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    // Virtual-hosted URL. Works for public buckets. For private ones, issue
    // a pre-signed GET URL on read instead of storing this string.
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
