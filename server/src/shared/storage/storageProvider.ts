/**
 * Storage provider interface for document management.
 * Concrete implementations (Cloudinary, S3) implement this interface.
 */

export interface StorageFile {
  buffer: Buffer
  mimeType: string
  originalName: string
}

export interface UploadResult {
  storageKey: string
  url: string
  sizeBytes: number
}

export interface IStorageProvider {
  /**
   * Upload a file to storage.
   * @param file - The file to upload
   * @param path - The storage path/folder (e.g. "school-123/students/456")
   * @returns The storage key and URL
   */
  upload(file: StorageFile, path: string): Promise<UploadResult>

  /**
   * Generate a signed URL for temporary access to a file.
   * @param storageKey - The key returned by upload
   * @param expiresIn - URL expiry in seconds (default 1 hour)
   * @returns A signed URL
   */
  getSignedUrl(storageKey: string, expiresIn?: number): Promise<string>

  /**
   * Delete a file from storage.
   * @param storageKey - The key to delete
   */
  delete(storageKey: string): Promise<void>
}

// Singleton provider instance
let provider: IStorageProvider | null = null

export function getStorageProvider(): IStorageProvider {
  if (!provider) {
    throw new Error('Storage provider not initialized. Call initStorageProvider() first.')
  }
  return provider
}

export function initStorageProvider(p: IStorageProvider): void {
  provider = p
}
