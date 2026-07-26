import { Module } from '@nestjs/common';
import { ProcessorService } from './processor.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ProcessorService],
})
export class ProcessorModule {}
