import { createHash, randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import type { Readable } from 'node:stream';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { FileEntity } from './entities/file.entity.js';
import { parseFileUrl } from './file-url.js';
import { FilesRepository } from './files.repository.js';
import type { StorageProvider } from './storage/storage-provider.interface.js';
import { STORAGE_PROVIDER } from './storage/storage.constants.js';

/** What `upload` needs from a file. `Express.Multer.File` satisfies it. */
export type UploadableFile = Pick<
  Express.Multer.File,
  'originalname' | 'mimetype' | 'buffer'
>;

export interface FileDownload {
  file: FileEntity;
  stream: Readable;
}

const BYTES_PER_MB = 1024 * 1024;
const MAX_ORIGINAL_NAME_LENGTH = 255;

/**
 * Shared file storage for every module. A business module adds `FilesModule`
 * to its `imports` and injects `FilesService`, e.g.
 * `this.filesService.findByOwner('trips', trip.id)`. It never imports
 * `FilesRepository`, `STORAGE_PROVIDER` or anything under `storage/`.
 *
 * Upload-first flow: the client uploads with `ownerType` only and sends the
 * returned `url` to the owning module, which checks it with `findByUrl` and
 * links it with `attach` once its record exists.
 */
@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly maxSizeMb: number;
  private readonly allowedMimeTypes: ReadonlySet<string>;

  constructor(
    private readonly filesRepository: FilesRepository,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.maxSizeMb = config.get('FILE_MAX_SIZE_MB', { infer: true });
    this.allowedMimeTypes = new Set(
      config.get('FILE_ALLOWED_MIME_TYPES', { infer: true }),
    );
  }

  async upload(
    file: UploadableFile | undefined,
    ownerType: string,
    ownerId: string | null,
  ): Promise<FileEntity> {
    this.assertCanAccess(ownerType, ownerId);

    if (!file || file.buffer.length === 0) {
      throw new BadRequestException('A non-empty "file" is required');
    }
    if (file.buffer.length > this.maxSizeMb * BYTES_PER_MB) {
      throw new PayloadTooLargeException(
        `File exceeds the ${this.maxSizeMb} MB limit`,
      );
    }
    const mimeType = file.mimetype.toLowerCase();
    if (!this.allowedMimeTypes.has(mimeType)) {
      throw new UnsupportedMediaTypeException(
        `File type "${mimeType}" is not allowed`,
      );
    }

    const originalName = this.sanitizeFileName(file.originalname);
    const storageKey = `${randomUUID()}${this.safeExtension(originalName)}`;
    const checksum = createHash('sha256').update(file.buffer).digest('hex');

    await this.storage.save(storageKey, file.buffer);
    try {
      return await this.filesRepository.create({
        ownerType,
        ownerId,
        originalName,
        storageKey,
        mimeType,
        sizeBytes: file.buffer.length,
        checksum,
      });
    } catch (error) {
      // No orphans: the row was not written, so remove the stored bytes.
      await this.storage.delete(storageKey).catch((cleanupError: unknown) => {
        this.logger.error(
          `Failed to remove orphan file ${storageKey}`,
          cleanupError instanceof Error ? cleanupError.stack : cleanupError,
        );
      });
      throw error;
    }
  }

  async findById(id: string): Promise<FileEntity> {
    const file = await this.filesRepository.findById(id);
    if (!file) {
      throw new NotFoundException(`File ${id} not found`);
    }
    this.assertCanAccess(file.ownerType, file.ownerId);
    return file;
  }

  async findByOwner(ownerType: string, ownerId: string): Promise<FileEntity[]> {
    this.assertCanAccess(ownerType, ownerId);
    return this.filesRepository.findByOwner(ownerType, ownerId);
  }

  /** The live file behind a url returned by upload, or null if there is none. */
  async findByUrl(url: string): Promise<FileEntity | null> {
    const id = parseFileUrl(url);
    const file = id ? await this.filesRepository.findById(id) : null;
    if (file) {
      this.assertCanAccess(file.ownerType, file.ownerId);
    }
    return file;
  }

  /** Links a file uploaded without an owner. Fails if it is already linked. */
  async attach(id: string, ownerType: string, ownerId: string): Promise<void> {
    this.assertCanAccess(ownerType, ownerId);
    if (!(await this.filesRepository.attachOwner(id, ownerType, ownerId))) {
      throw new ConflictException(
        `File ${id} does not exist or is already linked to an owner`,
      );
    }
  }

  async getStream(id: string): Promise<FileDownload> {
    const file = await this.findById(id);
    return { file, stream: await this.storage.getStream(file.storageKey) };
  }

  async remove(id: string): Promise<void> {
    const file = await this.findById(id);
    await this.filesRepository.softDelete(file.id);
  }

  // AUTHZ (auth story): the single place to check that the current user may
  // read/write files of this owner. Every public method calls it. Not implemented yet.
  private assertCanAccess(_ownerType: string, _ownerId: string | null): void {}

  private sanitizeFileName(name: string): string {
    const baseName = name.split(/[\\/]/).pop() ?? '';
    const cleaned = baseName
      .normalize('NFC')
      .replace(/[\p{Cc}\p{Cf}]/gu, '')
      .trim();
    const truncated = Array.from(cleaned)
      .slice(0, MAX_ORIGINAL_NAME_LENGTH)
      .join('');
    return truncated === '' || truncated === '.' || truncated === '..'
      ? 'file'
      : truncated;
  }

  private safeExtension(fileName: string): string {
    const extension = extname(fileName).toLowerCase();
    return /^\.[a-z0-9]{1,10}$/.test(extension) ? extension : '';
  }
}
