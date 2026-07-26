import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Consumer } from 'sqs-consumer';
import { SQSClient } from '@aws-sdk/client-sqs';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';
import * as stream from 'stream';
import { promisify } from 'util';
const pipeline = promisify(stream.pipeline);
const pdfParse = require('pdf-parse');

@Injectable()
export class ProcessorService implements OnModuleInit, OnModuleDestroy {
  private consumer: Consumer | null = null;
  private readonly logger = new Logger(ProcessorService.name);
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

  onModuleInit() {
    if (!process.env.AWS_SQS_QUEUE_URL) {
      this.logger.warn('AWS_SQS_QUEUE_URL is not set, processor will not start.');
      return;
    }

    this.consumer = Consumer.create({
      queueUrl: process.env.AWS_SQS_QUEUE_URL,
      handleMessage: async (message) => {
        await this.handleMessage(message);
        return message;
      },
      sqs: new SQSClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
      }),
    });

    this.consumer.on('error', (err: any) => {
      this.logger.error('SQS Consumer Error', err.message);
    });

    this.consumer.on('processing_error', (err: any) => {
      this.logger.error('SQS Processing Error', err.message);
    });

    this.consumer.start();
    this.logger.log('SQS Consumer started successfully.');
  }

  onModuleDestroy() {
    if (this.consumer) {
      this.consumer.stop();
      this.logger.log('SQS Consumer stopped.');
    }
  }

  private async handleMessage(message: any) {
    this.logger.log(`Received message: ${message.Body}`);
    const body = JSON.parse(message.Body);
    const { documentId, bucket, key } = body;

    let tempFilePath: string | null = null;

    try {
      // 1. Download file from S3 to temp dir
      tempFilePath = path.join(os.tmpdir(), `${randomUUID()}-${path.basename(key)}`);
      
      const getObjectCommand = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      const response = await this.s3Client.send(getObjectCommand);

      await pipeline(
        response.Body as stream.Readable,
        fs.createWriteStream(tempFilePath)
      );

      // 2. Extract metadata based on file type
      let pageCount: number | null = null;
      let wordCount: number | null = null;
      const ext = path.extname(key).toLowerCase();

      this.logger.log(`Starting processing for document ID: ${documentId}, type: ${ext}`);

      if (ext === '.pdf') {
        const dataBuffer = fs.readFileSync(tempFilePath);
        const pdfData = await pdfParse(dataBuffer);
        pageCount = pdfData.numpages;
        const text = pdfData.text || '';
        wordCount = text.split(/\s+/).filter((word: string) => word.length > 0).length;
      } else if (ext === '.docx') {
        const mammoth = require('mammoth');
        const AdmZip = require('adm-zip');

        const result = await mammoth.extractRawText({ path: tempFilePath });
        const text = result.value || '';
        wordCount = text.split(/\s+/).filter((word: string) => word.length > 0).length;

        try {
          const zip = new AdmZip(tempFilePath);
          const appXmlEntry = zip.getEntry('docProps/app.xml');
          if (appXmlEntry) {
            const appXml = appXmlEntry.getData().toString('utf8');
            // Try to match the <Pages> XML tag. Sometimes it can have namespaces (like <ep:Pages>), so we're flexible
            const pagesMatch = appXml.match(/Pages>(\d+)</i);
            if (pagesMatch && pagesMatch[1]) {
              pageCount = parseInt(pagesMatch[1], 10);
            } else {
              // If page count is not in docProps/app.xml, we can do a rough estimate based on word count
              pageCount = Math.max(1, Math.ceil((wordCount || 0) / 250));
            }
          } else {
             // Fallback estimate if no app.xml
             pageCount = Math.max(1, Math.ceil((wordCount || 0) / 250));
          }
        } catch (err: any) {
          this.logger.warn(`Could not extract page count from docx: ${err.message}`);
          pageCount = Math.max(1, Math.ceil((wordCount || 0) / 250));
        }
      } else if (['.png', '.jpg', '.jpeg'].includes(ext)) {
        this.logger.log(`Image file detected for document ID: ${documentId}, skipping text extraction`);
      } else {
        this.logger.warn(`Unsupported file extension: ${ext} for document ID: ${documentId}`);
      }

      // 3. Update database
      this.logger.log(`Updating database for document ID: ${documentId}`);
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          pageCount,
          wordCount,
          status: 'COMPLETED',
        },
      });

      this.logger.log(`Successfully processed document ID: ${documentId}. Pages: ${pageCount}, Words: ${wordCount}`);
    } catch (error: any) {
      this.logger.error(`Error processing document ID ${documentId}:`, error.message);
      
      await this.prisma.document.updateMany({
        where: { id: documentId },
        data: {
          status: 'FAILED',
        },
      });
      // Not rethrowing to prevent infinite retry if it's a permanent error (like parse fail)
    } finally {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }
}
