import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * El bucket es privado (bloqueo de acceso público activado a propósito, ver tutorial de
 * creación) — los archivos nunca se sirven por URL pública directa, siempre por URL firmada
 * con vigencia corta a través de getPresignedUrl().
 */
@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private client: S3Client | null = null;

  constructor(private config: ConfigService) {}

  private getClient(): S3Client {
    if (!this.client) {
      this.client = new S3Client({
        region: this.config.get('AWS_REGION', 'us-east-1'),
        credentials: {
          accessKeyId: this.config.get('AWS_ACCESS_KEY_ID', ''),
          secretAccessKey: this.config.get('AWS_SECRET_ACCESS_KEY', ''),
        },
      });
    }
    return this.client;
  }

  private get bucket(): string {
    return this.config.get('AWS_S3_BUCKET', '');
  }

  async uploadFile(key: string, buffer: Buffer, contentType?: string): Promise<void> {
    try {
      await this.getClient().send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType || 'application/octet-stream',
      }));
    } catch (err: any) {
      this.logger.error(`Error al subir a S3 (${key}): ${err.message}`);
      throw new InternalServerErrorException('No se pudo subir el archivo. Intenta de nuevo en unos minutos.');
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await this.getClient().send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (err: any) {
      this.logger.error(`Error al eliminar de S3 (${key}): ${err.message}`);
      // No relanzamos: no queremos que un archivo huérfano en S3 bloquee la operación en la BD.
    }
  }

  /** URL temporal para ver/descargar un archivo del bucket privado. expiresInSeconds: 300 = 5 minutos. */
  async getPresignedUrl(key: string, expiresInSeconds = 300): Promise<string> {
    try {
      const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
      return await getSignedUrl(this.getClient(), command, { expiresIn: expiresInSeconds });
    } catch (err: any) {
      this.logger.error(`Error al generar URL firmada (${key}): ${err.message}`);
      throw new InternalServerErrorException('No se pudo generar el enlace del archivo. Intenta de nuevo en unos minutos.');
    }
  }
}
