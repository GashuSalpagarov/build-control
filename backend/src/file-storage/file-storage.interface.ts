export interface FileInfo {
  path: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface IFileStorage {
  save(file: Express.Multer.File, folder: string): Promise<FileInfo>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
}

export const FILE_STORAGE = 'FILE_STORAGE';
