import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';

import { TrashService } from './trash.service';

@Module({
  providers: [DocumentsService, TrashService],
  controllers: [DocumentsController]
})
export class DocumentsModule {}
