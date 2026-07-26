import { Injectable, InternalServerErrorException, NotFoundException, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class DocumentsService {
  private s3Client: S3Client;
  private sqsClient: SQSClient;
  private readonly bucketName = process.env.AWS_S3_BUCKET;
  private readonly logger = new Logger(DocumentsService.name);

  constructor(private prisma: PrismaService) {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      // credentials: {
      //   accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      //   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      // },
    });
    this.sqsClient = new SQSClient({
      region: process.env.AWS_REGION || 'us-east-1',
      // credentials: {
      //   accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      //   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      // },
    });
  }

  async uploadDocument(file: Express.Multer.File, userId: number) {
    if (!this.bucketName) {
      throw new InternalServerErrorException('AWS S3 Bucket not configured');
    }

    const fileExtension = file.originalname.split('.').pop();
    const key = `${randomUUID()}-${file.originalname}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      this.logger.log(`Uploading file ${file.originalname} to S3 bucket ${this.bucketName}`);
      await this.s3Client.send(command);

      const document = await this.prisma.document.create({
        data: {
          filename: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          bucket: this.bucketName,
          key: key,
          userId,
        },
      });
      this.logger.log(`Document saved to database with ID: ${document.id}`);

      if (process.env.AWS_SQS_QUEUE_URL) {
        const sqsCommand = new SendMessageCommand({
          QueueUrl: process.env.AWS_SQS_QUEUE_URL,
          MessageBody: JSON.stringify({
            documentId: document.id,
            bucket: this.bucketName,
            key: key,
          }),
        });
        await this.sqsClient.send(sqsCommand);
        this.logger.log(`Message sent to SQS for document ID: ${document.id}`);
      } else {
        this.logger.warn('AWS_SQS_QUEUE_URL is not set, skipping SQS message publication');
      }

      return document;
    } catch (error) {
      this.logger.error('Error uploading file to S3', error);
      throw new InternalServerErrorException('Failed to upload document');
    }
  }

  async getDocuments(userId: number, filter: 'all' | 'favorites' | 'trash' = 'all') {
    this.logger.log(`Fetching documents from DB for user ID: ${userId} with filter: ${filter}`);
    
    let whereClause: any = { userId };
    
    if (filter === 'trash') {
      whereClause.deletedAt = { not: null };
    } else {
      whereClause.deletedAt = null;
      if (filter === 'favorites') {
        whereClause.isFavorite = true;
      }
    }

    return this.prisma.document.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDocumentById(id: number, userId: number) {
    this.logger.log(`Fetching document ID ${id} for user ID ${userId}`);
    const document = await this.prisma.document.findFirst({
      where: { id, userId },
    });

    if (!document) {
      this.logger.warn(`Document ID ${id} not found for user ID ${userId}`);
      throw new NotFoundException('Document not found');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: document.bucket,
        Key: document.key,
      });

      // Generate a presigned URL valid for 1 hour
      const presignedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
      this.logger.log(`Presigned URL generated for document ID: ${id}`);

      return {
        ...document,
        url: presignedUrl,
      };
    } catch (error) {
      this.logger.error('Error generating presigned URL', error);
      throw new InternalServerErrorException('Failed to generate document URL');
    }
  }

  async deleteDocument(id: number, userId: number) {
    this.logger.log(`Attempting to delete document ID ${id} for user ID ${userId}`);
    const document = await this.prisma.document.findFirst({
      where: { id, userId },
    });

    if (!document) {
      this.logger.warn(`Document ID ${id} not found for deletion for user ID ${userId}`);
      throw new NotFoundException('Document not found');
    }

    // Soft delete if not already in trash
    if (!document.deletedAt) {
      await this.prisma.document.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      this.logger.log(`Document ID ${id} moved to trash`);
      return { message: 'Document moved to trash' };
    }

    // Permanent delete if already in trash
    try {
      const command = new DeleteObjectCommand({
        Bucket: document.bucket,
        Key: document.key,
      });

      await this.s3Client.send(command);
      this.logger.log(`Document ID ${id} permanently deleted from S3`);

      await this.prisma.document.delete({
        where: { id },
      });
      this.logger.log(`Document ID ${id} permanently deleted from database`);

      return { message: 'Document permanently deleted' };
    } catch (error) {
      this.logger.error('Error permanently deleting file from S3', error);
      throw new InternalServerErrorException('Failed to permanently delete document');
    }
  }

  async toggleFavorite(id: number, userId: number) {
    const document = await this.prisma.document.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const updated = await this.prisma.document.update({
      where: { id },
      data: { isFavorite: !document.isFavorite },
    });

    return updated;
  }

  async restoreDocument(id: number, userId: number) {
    const document = await this.prisma.document.findFirst({
      where: { id, userId, deletedAt: { not: null } },
    });

    if (!document) {
      throw new NotFoundException('Document not found in trash');
    }

    const updated = await this.prisma.document.update({
      where: { id },
      data: { deletedAt: null },
    });

    return updated;
  }
}

