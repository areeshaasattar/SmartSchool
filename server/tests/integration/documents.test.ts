import mongoose from 'mongoose'

const schoolId = new mongoose.Types.ObjectId().toString()
const userId1 = new mongoose.Types.ObjectId().toString()
const studentId = new mongoose.Types.ObjectId().toString()
const classId = new mongoose.Types.ObjectId().toString()

jest.mock('../../src/modules/students/models/Student.js', () => ({
  Student: {
    findOne: jest.fn().mockResolvedValue({
      _id: studentId,
      schoolId,
      guardianIds: [],
      classId: classId,
    }),
  },
}))

jest.mock('../../src/modules/students/models/Guardian.js', () => ({
  Guardian: {
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue([]),
    }),
  },
}))

jest.mock('../../src/modules/teachers/models/Teacher.js', () => ({
  Teacher: {
    findOne: jest.fn().mockImplementation((query: Record<string, unknown>) => {
      if (query.userId === userId1) {
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(),
          userId: userId1,
          schoolId,
          classes: [classId],
        })
      }
      return Promise.resolve(null)
    }),
  },
}))

jest.mock('../../src/modules/audit/models/AuditLog.js', () => ({
  AuditLog: {
    create: jest.fn().mockResolvedValue({}),
  },
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}))

const mockStorageProvider = {
  upload: jest.fn().mockResolvedValue({
    storageKey: 'smartschool/test/file.pdf',
    url: 'https://cloudinary.com/test.pdf',
    sizeBytes: 1024,
  }),
  getSignedUrl: jest.fn().mockResolvedValue('https://signed-url.com/test.pdf'),
  delete: jest.fn().mockResolvedValue(undefined),
}

jest.mock('../../src/shared/storage/storageProvider.js', () => ({
  getStorageProvider: jest.fn(() => mockStorageProvider),
}))

const mockDoc = {
  _id: new mongoose.Types.ObjectId(),
  schoolId,
  ownerType: 'student',
  ownerId: studentId,
  uploadedBy: userId1,
  storageKey: 'smartschool/test/file.pdf',
  filename: 'test.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  type: 'attachment',
  accessPolicy: 'owner_and_admin',
  deleted: false,
  save: jest.fn().mockResolvedValue(true),
}

jest.mock('../../src/modules/documents/models/Document.js', () => ({
  Document: {
    create: jest.fn().mockResolvedValue(mockDoc),
    findOne: jest.fn(),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    }),
    countDocuments: jest.fn().mockResolvedValue(0),
  },
}))

import { Document } from '../../src/modules/documents/models/Document.js'
import * as documentService from '../../src/modules/documents/services/documentService.js'

describe('Document Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('uploadDocument', () => {
    it('should upload a document successfully', async () => {
      const result = await documentService.uploadDocument(
        schoolId,
        userId1,
        ['teacher'],
        {
          buffer: Buffer.from('%PDF-1.4\ntest content'),
          originalname: 'test.pdf',
          mimetype: 'application/pdf',
          size: 1024,
        },
        {
          ownerType: 'student',
          ownerId: studentId,
          type: 'attachment',
        },
      )

      expect(result).toBeDefined()
      expect(Document.create).toHaveBeenCalled()
      expect(mockStorageProvider.upload).toHaveBeenCalled()
    })

    it('should reject oversized files', async () => {
      await expect(
        documentService.uploadDocument(
          schoolId,
          userId1,
          ['teacher'],
          {
            buffer: Buffer.from('test'),
            originalname: 'large.pdf',
            mimetype: 'application/pdf',
            size: 11 * 1024 * 1024, // 11MB
          },
          {
            ownerType: 'student',
            ownerId: studentId,
            type: 'attachment',
          },
        ),
      ).rejects.toThrow('File size exceeds')
    })

    it('should reject executable files', async () => {
      await expect(
        documentService.uploadDocument(
          schoolId,
          userId1,
          ['teacher'],
          {
            buffer: Buffer.from('test'),
            originalname: 'virus.exe',
            mimetype: 'application/x-msdownload',
            size: 1024,
          },
          {
            ownerType: 'student',
            ownerId: studentId,
            type: 'attachment',
          },
        ),
      ).rejects.toThrow('not allowed')
    })
  })

  describe('getDocumentWithUrl', () => {
    it('should return document with signed URL', async () => {
      ;(Document.findOne as jest.Mock).mockResolvedValue(mockDoc)

      const result = await documentService.getDocumentWithUrl(
        schoolId,
        mockDoc._id.toString(),
        userId1,
        ['teacher'],
      )

      expect(result).not.toBeNull()
      expect(result?.signedUrl).toBe('https://signed-url.com/test.pdf')
      expect(mockStorageProvider.getSignedUrl).toHaveBeenCalledWith(mockDoc.storageKey, 3600)
    })

    it('should return null for deleted documents', async () => {
      ;(Document.findOne as jest.Mock).mockResolvedValue(null)

      const result = await documentService.getDocumentWithUrl(
        schoolId,
        new mongoose.Types.ObjectId().toString(),
        userId1,
        ['teacher'],
      )

      expect(result).toBeNull()
    })
  })

  describe('deleteDocument', () => {
    it('should soft delete a document', async () => {
      ;(Document.findOne as jest.Mock).mockResolvedValue({
        ...mockDoc,
        uploadedBy: userId1,
        save: jest.fn().mockResolvedValue(true),
      })

      await documentService.deleteDocument(
        schoolId,
        mockDoc._id.toString(),
        userId1,
        ['teacher'],
      )

      expect(mockStorageProvider.delete).toHaveBeenCalledWith(mockDoc.storageKey)
    })

    it('should reject deletion by non-owner non-admin', async () => {
      const otherUserId = new mongoose.Types.ObjectId().toString()
      ;(Document.findOne as jest.Mock).mockResolvedValue({
        ...mockDoc,
        uploadedBy: userId1,
      })

      await expect(
        documentService.deleteDocument(
          schoolId,
          mockDoc._id.toString(),
          otherUserId,
          ['student'],
        ),
      ).rejects.toThrow('Access denied')
    })
  })
})
