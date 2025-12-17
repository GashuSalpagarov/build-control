import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { IFileStorage, FileInfo } from './file-storage.interface';

@Injectable()
export class LocalFileStorageService implements IFileStorage {
  private uploadDir: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR', '../uploads');
  }

  async save(file: Express.Multer.File, folder: string): Promise<FileInfo> {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    const relativePath = path.join(folder, filename);
    const fullPath = path.join(this.uploadDir, relativePath);

    // Создаём директорию, если не существует
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // Сохраняем файл
    await fs.writeFile(fullPath, file.buffer);

    return {
      path: relativePath.replace(/\\/g, '/'),
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.uploadDir, filePath);
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      // Игнорируем ошибку, если файл не существует
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  getUrl(filePath: string): string {
    return `/uploads/${filePath}`;
  }
}
