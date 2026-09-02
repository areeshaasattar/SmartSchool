import mongoose, { FilterQuery } from 'mongoose'
import { AuditLog, IAuditLog } from '../models/AuditLog.js'

export interface AuditLogFilters {
  schoolId?: string
  entity?: string
  action?: string
  actorId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

export function buildAuditLogFilter(filters: AuditLogFilters): FilterQuery<IAuditLog> {
  const query: FilterQuery<IAuditLog> = {}
  if (filters.schoolId) query.schoolId = filters.schoolId
  if (filters.entity) query.entity = filters.entity
  if (filters.action) query.action = filters.action
  if (filters.actorId) query.actorId = filters.actorId
  if (filters.dateFrom || filters.dateTo) {
    query.timestamp = {}
    if (filters.dateFrom) query.timestamp.$gte = new Date(filters.dateFrom)
    if (filters.dateTo) {
      const dateTo = new Date(filters.dateTo)
      dateTo.setUTCHours(23, 59, 59, 999)
      query.timestamp.$lte = dateTo
    }
  }
  return query
}

export async function listAuditLogs(filters: AuditLogFilters) {
  const page = Math.max(1, filters.page ?? 1)
  const limit = Math.min(100, Math.max(1, filters.limit ?? 25))
  const query = buildAuditLogFilter(filters)
  const [logs, total] = await Promise.all([
    AuditLog.find(query).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    AuditLog.countDocuments(query),
  ])
  return { logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

export async function getAuditLog(id: string, schoolId?: string) {
  if (!mongoose.isValidObjectId(id)) return null
  const query: FilterQuery<IAuditLog> = { _id: id }
  if (schoolId) query.schoolId = schoolId
  return AuditLog.findOne(query).lean()
}

export async function getEntityHistory(entity: string, entityId: string, schoolId?: string) {
  const query: FilterQuery<IAuditLog> = { entity, entityId }
  if (schoolId) query.schoolId = schoolId
  return AuditLog.find(query).sort({ timestamp: -1 }).lean()
}
