import type { Readable } from 'node:stream';

export interface StorageProvider {
  save(key: string, data: Buffer): Promise<void>;
  getStream(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
}
