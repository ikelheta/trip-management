import { mkdir, open, rm, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import type { Readable } from 'node:stream';
import type { StorageProvider } from './storage-provider.interface.js';

export class LocalStorageProvider implements StorageProvider {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = resolve(basePath);
  }

  async save(key: string, data: Buffer): Promise<void> {
    await mkdir(this.basePath, { recursive: true });
    // 'wx' fails instead of overwriting if the key already exists.
    await writeFile(this.pathFor(key), data, { flag: 'wx' });
  }

  async getStream(key: string): Promise<Readable> {
    // Opening first makes a missing file fail here, before any response bytes are sent.
    const handle = await open(this.pathFor(key), 'r');
    return handle.createReadStream();
  }

  async delete(key: string): Promise<void> {
    await rm(this.pathFor(key), { force: true });
  }

  private pathFor(key: string): string {
    const path = resolve(this.basePath, key);
    if (!path.startsWith(this.basePath + sep)) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return path;
  }
}
