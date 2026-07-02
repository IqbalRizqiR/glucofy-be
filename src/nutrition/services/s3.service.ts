import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const region =
      this.configService.get<string>('AWS_S3_REGION') || 'ap-southeast-1';
    this.bucket =
      this.configService.get<string>('AWS_S3_BUCKET') || 'glucofy-scans';

    this.client = new S3Client({ region });
  }

  /**
   * Generate a pre-signed URL for the frontend to upload an image DIRECTLY to S3.
   *
   * This keeps the image payload off the NestJS/Lambda backend entirely,
   * bypassing the API Gateway 10MB limit and reducing backend memory/bandwidth.
   *
   * Flow: frontend GETs this URL → PUTs the image binary straight to S3 →
   * then calls POST /nutrition/scan with the returned s3Key.
   */
  async generateUploadUrl(
    contentType: string,
    folder = 'scans',
    expiresIn = 300,
  ): Promise<{ uploadUrl: string; s3Key: string }> {
    const ext = contentType === 'image/png' ? 'png' : 'jpg';
    const s3Key = `${folder}/${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });

    this.logger.log(`Generated pre-signed upload URL for key: ${s3Key}`);

    return { uploadUrl, s3Key };
  }

  /**
   * Generate a short-lived pre-signed URL to READ an object (e.g. to display
   * the scanned label back to the user). Keeps the bucket private.
   */
  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }
}
