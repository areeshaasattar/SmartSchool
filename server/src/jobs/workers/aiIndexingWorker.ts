import { Worker } from 'bullmq'
import { queueConnection } from '../../queues/index.js'
import { KnowledgeDocument } from '../../modules/ai/knowledge/models/KnowledgeDocument.js'
import { markIndexStatus } from '../../modules/ai/knowledge/services/knowledgeService.js'
import { deindexKnowledgeDocument, indexKnowledgeDocument } from '../../modules/ai/services/aiServiceClient.js'

export const aiIndexingWorker = new Worker('ai-indexing-queue', async (job) => {
  if (job.name === 'deindex-document') {
    await deindexKnowledgeDocument(job.data.documentId, job.data.schoolId)
    return
  }
  const document = await KnowledgeDocument.findById(job.data.documentId)
  if (!document) return
  try {
    await indexKnowledgeDocument({
      documentId: document._id.toString(), schoolId: document.schoolId.toString(), sourceType: document.sourceType,
      title: document.title, content: document.content, ownerId: document.ownerId?.toString(),
    })
    await markIndexStatus(document._id.toString(), 'indexed')
  } catch (error) {
    await markIndexStatus(document._id.toString(), 'failed')
    throw error
  }
}, { connection: queueConnection, concurrency: 2 })

aiIndexingWorker.on('failed', (job, error) => console.error(`[ai-indexing-queue] job ${job?.id} failed`, error))
