import { aiIndexingQueue } from '../../../../queues/index.js'
import { KnowledgeDocument, KnowledgeSourceType } from '../models/KnowledgeDocument.js'

export async function createKnowledgeDocument(input: {
  schoolId: string; uploadedBy: string; sourceType: KnowledgeSourceType; title: string; content: string; ownerId?: string
}) {
  const document = await KnowledgeDocument.create({ ...input, status: 'pending_index' })
  await aiIndexingQueue.add('index-document', { documentId: document._id.toString() })
  return document
}

export async function listKnowledgeDocuments(schoolId: string) {
  return KnowledgeDocument.find({ schoolId }).sort({ createdAt: -1 })
}

export async function deleteKnowledgeDocument(schoolId: string, id: string) {
  const document = await KnowledgeDocument.findOneAndDelete({ _id: id, schoolId })
  if (!document) throw new Error('Knowledge document not found')
  await aiIndexingQueue.add('deindex-document', { documentId: id, schoolId })
}

export async function markIndexStatus(documentId: string, status: 'indexed' | 'failed') {
  await KnowledgeDocument.findByIdAndUpdate(documentId, { status })
}
