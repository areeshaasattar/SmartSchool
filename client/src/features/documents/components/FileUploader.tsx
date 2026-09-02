import { useState, useRef, useCallback } from 'react'
import api from '../../../services/api'

interface FileUploaderProps {
  ownerType: string
  ownerId: string
  type: string
  accessPolicy?: string
  onUploadComplete?: (document: { _id: string; filename: string; url: string }) => void
  onError?: (error: string) => void
  multiple?: boolean
  className?: string
}

export default function FileUploader({
  ownerType,
  ownerId,
  type,
  accessPolicy = 'owner_and_admin',
  onUploadComplete,
  onError,
  multiple = false,
  className = '',
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploading(true)
    setProgress(0)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append('file', file)
        formData.append('ownerType', ownerType)
        formData.append('ownerId', ownerId)
        formData.append('type', type)
        formData.append('accessPolicy', accessPolicy)

        const res = await api.post('/documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            if (e.total) setProgress(Math.round((e.loaded / e.total) * 100))
          },
        })

        onUploadComplete?.({
          _id: res.data._id,
          filename: res.data.filename,
          url: res.data.storageKey,
        })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      onError?.(message)
    } finally {
      setUploading(false)
      setProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [ownerType, ownerId, type, accessPolicy, onUploadComplete, onError])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  return (
    <div
      className={`relative ${className}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
        id={`file-upload-${ownerType}-${ownerId}`}
      />

      <label
        htmlFor={`file-upload-${ownerType}-${ownerId}`}
        className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          dragOver
            ? 'border-primary-500 bg-primary-50'
            : 'border-secondary-300 hover:border-primary-400 hover:bg-secondary-50'
        }`}
      >
        {uploading ? (
          <div className="text-center">
            <div className="text-sm text-secondary-600 mb-2">Uploading... {progress}%</div>
            <div className="w-48 h-2 bg-secondary-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <svg className="w-8 h-8 text-secondary-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-sm text-secondary-500">
              Drag & drop or <span className="text-primary-600 font-medium">browse</span>
            </span>
            <span className="text-xs text-secondary-400 mt-1">PDF, images, docs up to 10MB</span>
          </>
        )}
      </label>
    </div>
  )
}
