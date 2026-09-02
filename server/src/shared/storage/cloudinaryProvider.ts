import { v2 as cloudinary } from 'cloudinary'
import { IStorageProvider, StorageFile, UploadResult } from './storageProvider.js'

/**
 * Cloudinary-backed storage provider.
 *
 * Environment variables required:
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 *
 * Files are stored in a private folder with access via signed URLs only.
 */

export class CloudinaryStorageProvider implements IStorageProvider {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    })
  }

  async upload(file: StorageFile, path: string): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const folder = `smartschool/${path}`
      const publicId = `${Date.now()}-${file.originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: 'auto',
          access_type: 'authenticated', // private — signed URLs required
        },
        (error, result) => {
          if (error || !result) {
            reject(error || new Error('Upload failed'))
            return
          }
          resolve({
            storageKey: result.public_id,
            url: result.secure_url,
            sizeBytes: result.bytes,
          })
        },
      )

      uploadStream.end(file.buffer)
    })
  }

  async getSignedUrl(storageKey: string, expiresIn = 3600): Promise<string> {
    // Generate a signed URL for private资源
    const url = cloudinary.url(storageKey, {
      type: 'authenticated',
      sign_url: true,
      secure: true,
      expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    })
    return url
  }

  async delete(storageKey: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(storageKey, {
        resource_type: 'auto',
      })
    } catch {
      // Log but don't throw — deletion failures are non-blocking
      console.error(`[STORAGE] Failed to delete ${storageKey}`)
    }
  }
}
