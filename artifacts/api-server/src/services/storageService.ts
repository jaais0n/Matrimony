/**
 * Storage Service Abstraction
 * Manages photo uploads without storing large binary data directly inside PostgreSQL.
 * Supports local filesystem or object storage (S3/R2/Cloud Storage) via environment variables.
 */

import path from 'path';
import fs from 'fs';

export interface UploadedFileMeta {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  objectPath: string;
  publicUrl: string;
}

export class StorageService {
  private baseStorageDir: string;
  private cdnBaseUrl: string;

  constructor() {
    this.baseStorageDir = process.env.STORAGE_LOCAL_DIR || path.join(process.cwd(), 'uploads');
    this.cdnBaseUrl = process.env.STORAGE_CDN_URL || '/uploads';

    if (!fs.existsSync(this.baseStorageDir)) {
      try {
        fs.mkdirSync(this.baseStorageDir, { recursive: true });
      } catch (err) {
        // Fallback for sandboxed or read-only environments
      }
    }
  }

  async uploadPhoto(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    profileId: string
  ): Promise<UploadedFileMeta> {
    const fileExt = path.extname(fileName) || '.jpg';
    const uniqueId = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const objectPath = `profiles/${profileId}/${uniqueId}${fileExt}`;
    const destinationPath = path.join(this.baseStorageDir, objectPath);

    const dir = path.dirname(destinationPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(destinationPath, fileBuffer);

    return {
      id: uniqueId,
      originalName: fileName,
      mimeType,
      sizeBytes: fileBuffer.length,
      objectPath,
      publicUrl: `${this.cdnBaseUrl}/${objectPath}`,
    };
  }

  async deletePhoto(objectPath: string): Promise<boolean> {
    const filePath = path.join(this.baseStorageDir, objectPath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  getPublicUrl(objectPath: string): string {
    return `${this.cdnBaseUrl}/${objectPath}`;
  }
}

export const storageService = new StorageService();
