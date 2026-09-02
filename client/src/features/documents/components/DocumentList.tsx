import { useState, useEffect } from 'react'
import api from '../../../services/api'

interface Document {
  _id: string
  filename: string
  mimeType: string
  sizeBytes: number
  type: string
  createdAt: string
}

interface DocumentListProps {
  ownerType: string
  ownerId: string
  onDelete?: (docId: string) => void
  className?: string
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType === 'application/pdf') return '📄'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  if (mimeType.includes('excel') || mimeType.includes('sheet')) return '📊'
  return '📎'
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentList({ ownerType, ownerId, onDelete, className = '' }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDocuments()
  }, [ownerType, ownerId])

  const loadDocuments = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/documents?ownerType=${ownerType}&ownerId=${ownerId}`)
      setDocuments(res.data.documents || [])
    } catch {
      // Silently fail — documents list is supplementary
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (docId: string, filename: string) => {
    try {
      const res = await api.get(`/documents/${docId}`)
      const { signedUrl } = res.data
      // Open in new tab or trigger download
      const link = document.createElement('a')
      link.href = signedUrl
      link.download = filename
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch {
      // Error handled silently
    }
  }

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return
    try {
      await api.delete(`/documents/${docId}`)
      setDocuments(docs => docs.filter(d => d._id !== docId))
      onDelete?.(docId)
    } catch {
      // Error handled silently
    }
  }

  if (loading) return <div className="text-sm text-secondary-400">Loading files...</div>
  if (documents.length === 0) return null

  return (
    <div className={`space-y-2 ${className}`}>
      {documents.map((doc) => (
        <div
          key={doc._id}
          className="flex items-center justify-between rounded-lg bg-secondary-50 px-3 py-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg">{getFileIcon(doc.mimeType)}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-secondary-900 truncate">{doc.filename}</p>
              <p className="text-xs text-secondary-400">{formatFileSize(doc.sizeBytes)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleDownload(doc._id, doc.filename)}
              className="rounded-lg px-2 py-1 text-xs text-primary-600 hover:bg-primary-50"
            >
              Download
            </button>
            {onDelete && (
              <button
                onClick={() => handleDelete(doc._id)}
                className="rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
