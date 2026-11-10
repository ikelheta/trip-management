import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { ListFilesQueryDto } from './dto/list-files-query.dto.js';
import { UploadFileDto } from './dto/upload-file.dto.js';
import { FileEntity } from './entities/file.entity.js';
import { FilesService } from './files.service.js';

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /** Upload a file. The response `url` is what other modules accept (e.g. a company's headerUrl). */
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'ownerType'],
      properties: {
        file: { type: 'string', format: 'binary' },
        ownerType: {
          type: 'string',
          pattern: '^[a-z][a-z0-9-]{0,49}$',
          example: 'companies',
        },
        ownerId: {
          type: 'string',
          format: 'uuid',
          description:
            'Omit when the owner does not exist yet; the owning module links the file later.',
        },
      },
    },
  })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.PAYLOAD_TOO_LARGE,
    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
  )
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadFileDto,
  ): Promise<FileEntity> {
    return this.filesService.upload(file, dto.ownerType, dto.ownerId ?? null);
  }

  /** List an owner's files, newest first. */
  @Get()
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  findByOwner(@Query() query: ListFilesQueryDto): Promise<FileEntity[]> {
    return this.filesService.findByOwner(query.ownerType, query.ownerId);
  }

  /** Get a file's metadata. */
  @Get(':id')
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<FileEntity> {
    return this.filesService.findById(id);
  }

  /** Download a file's content as an attachment. */
  @Get(':id/download')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiProduces('application/octet-stream')
  @ApiOkResponse({
    description: 'File content, served with its stored Content-Type',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async download(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StreamableFile> {
    const { file, stream } = await this.filesService.getStream(id);
    return new StreamableFile(stream, {
      type: file.mimeType,
      disposition: toContentDisposition(file.originalName),
      length: file.sizeBytes,
    });
  }

  /** Soft-delete a file (the stored bytes are kept). */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.filesService.remove(id);
  }
}

// RFC 6266: ASCII fallback in `filename`, exact UTF-8 name in `filename*` (RFC 5987).
function toContentDisposition(fileName: string): string {
  const fallback = fileName.replace(/[^\x20-\x7e]|["\\]/g, '_');
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
