import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  StorageDriver,
  type EnvironmentVariables,
} from '../../config/env.validation.js';
import { FileEntity } from './entities/file.entity.js';
import { FilesController } from './files.controller.js';
import { FilesRepository } from './files.repository.js';
import { FilesService } from './files.service.js';
import { LocalStorageProvider } from './storage/local-storage.provider.js';
import type { StorageProvider } from './storage/storage-provider.interface.js';
import { STORAGE_PROVIDER } from './storage/storage.constants.js';

function createStorageProvider(
  config: ConfigService<EnvironmentVariables, true>,
): StorageProvider {
  const driver = config.get('STORAGE_DRIVER', { infer: true });
  switch (driver) {
    case StorageDriver.Local:
      return new LocalStorageProvider(
        config.get('STORAGE_LOCAL_PATH', { infer: true }),
      );
    default:
      throw new Error(`Unsupported storage driver: ${String(driver)}`);
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([FileEntity]),
    MulterModule.registerAsync({
      inject: [ConfigService],
      // No `storage`/`dest`: multer keeps the upload in memory (`file.buffer`).
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        defParamCharset: 'utf8',
        limits: {
          fileSize:
            config.get('FILE_MAX_SIZE_MB', { infer: true }) * 1024 * 1024,
          files: 1,
        },
      }),
    }),
  ],
  controllers: [FilesController],
  providers: [
    FilesService,
    FilesRepository,
    {
      provide: STORAGE_PROVIDER,
      inject: [ConfigService],
      useFactory: createStorageProvider,
    },
  ],
  exports: [FilesService],
})
export class FilesModule {}
