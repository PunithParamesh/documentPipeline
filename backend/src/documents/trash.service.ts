import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class TrashService {
  private readonly logger = new Logger(TrashService.name);
  private s3Client: S3Client;

  constructor(private prisma: PrismaService) {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  // Runs every day at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleTrashCleanup() {
    this.logger.log('Starting automated trash cleanup...');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      const documentsToDelete = await this.prisma.document.findMany({
        where: {
          deletedAt: {
            lt: thirtyDaysAgo, // Less than 30 days ago
          },
        },
      });

      if (documentsToDelete.length === 0) {
        this.logger.log('No documents older than 30 days found in trash.');
        return;
      }

      this.logger.log(`Found ${documentsToDelete.length} documents to permanently delete.`);

      for (const doc of documentsToDelete) {
        try {
          // Delete from S3
          const command = new DeleteObjectCommand({
            Bucket: doc.bucket,
            Key: doc.key,
          });
          await this.s3Client.send(command);
          this.logger.log(`Deleted document ${doc.id} from S3`);

          // Delete from Database
          await this.prisma.document.delete({
            where: { id: doc.id },
          });
          this.logger.log(`Deleted document ${doc.id} from database`);
        } catch (err: any) {
          this.logger.error(`Failed to delete document ${doc.id}: ${err.message}`);
        }
      }

      this.logger.log('Automated trash cleanup completed.');
    } catch (error: any) {
      this.logger.error(`Error during trash cleanup: ${error.message}`);
    }
  }
}
