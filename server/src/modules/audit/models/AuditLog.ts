import mongoose, { Document, Schema } from 'mongoose'

export interface IAuditLog extends Document {
  schoolId?: mongoose.Types.ObjectId
  actorId: mongoose.Types.ObjectId
  actorEmail: string
  action: string
  entity: string
  entityId?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  ipAddress?: string
  timestamp: Date
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actorEmail: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    entity: {
      type: String,
      required: true,
    },
    entityId: {
      type: String,
    },
    before: {
      type: Schema.Types.Mixed,
    },
    after: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false,
  },
)

auditLogSchema.index({ schoolId: 1, timestamp: -1 })
auditLogSchema.index({ actorId: 1, timestamp: -1 })
auditLogSchema.index({ entity: 1, entityId: 1 })

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema)

/**
 * Plain input for audit log writes (without Document overhead).
 */
export interface AuditLogInput {
  schoolId?: mongoose.Types.ObjectId | string
  actorId: mongoose.Types.ObjectId | string
  actorEmail: string
  action: string
  entity: string
  entityId?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  ipAddress?: string
  timestamp?: Date
}

/**
 * Lightweight helper to write an audit log entry.
 * Call-and-forget: errors are logged but never thrown so they
 * cannot break the calling flow.
 */
export async function writeAuditLog(entry: AuditLogInput): Promise<void> {
  try {
    await AuditLog.create({
      ...entry,
      timestamp: entry.timestamp ?? new Date(),
    })
  } catch (error) {
    console.error('[AUDIT] Failed to write audit log:', error)
  }
}
