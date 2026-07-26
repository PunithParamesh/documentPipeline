import {
  Controller,
  Post,
  Get,
  Param,
  Delete,
  Patch,
  Query,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  ParseIntPipe,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../auth/user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  private readonly logger = new Logger(DocumentsController.name);

  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ 
            fileType: /^(application\/pdf|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|image\/png|image\/jpeg|image\/jpg)$/ 
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @User() user: any,
  ) {
    this.logger.log(`User ${user.id} is uploading a document: ${file.originalname}`);
    return this.documentsService.uploadDocument(file, user.id);
  }

  @Get()
  async getDocuments(@User() user: any, @Query('filter') filter?: 'all' | 'favorites' | 'trash') {
    this.logger.log(`User ${user.id} is fetching their documents with filter: ${filter || 'all'}`);
    return this.documentsService.getDocuments(user.id, filter);
  }

  @Get(':id')
  async getDocumentById(
    @Param('id', ParseIntPipe) id: number,
    @User() user: any,
  ) {
    this.logger.log(`User ${user.id} is fetching document ID: ${id}`);
    return this.documentsService.getDocumentById(id, user.id);
  }

  @Delete(':id')
  async deleteDocument(
    @Param('id', ParseIntPipe) id: number,
    @User() user: any,
  ) {
    this.logger.log(`User ${user.id} is deleting document ID: ${id}`);
    return this.documentsService.deleteDocument(id, user.id);
  }

  @Patch(':id/favorite')
  async toggleFavorite(
    @Param('id', ParseIntPipe) id: number,
    @User() user: any,
  ) {
    this.logger.log(`User ${user.id} is toggling favorite for document ID: ${id}`);
    return this.documentsService.toggleFavorite(id, user.id);
  }

  @Patch(':id/restore')
  async restoreDocument(
    @Param('id', ParseIntPipe) id: number,
    @User() user: any,
  ) {
    this.logger.log(`User ${user.id} is restoring document ID: ${id}`);
    return this.documentsService.restoreDocument(id, user.id);
  }
}

