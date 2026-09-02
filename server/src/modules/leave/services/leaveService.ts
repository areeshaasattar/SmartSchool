import mongoose from 'mongoose'
import { LeaveRequest, ILeaveRequest } from '../models/LeaveRequest.js'
import { Guardian } from '../../students/models/Guardian.js'
import { dispatchNotification } from '../../notifications/services/notificationService.js'
import { AuditLog } from '../../audit/models/AuditLog.js'

// ── Create leave request ─────────────────────────────────────────────

export async function createLeaveRequest(
  schoolId: string,
  submittedBy: string,
  data: {
    requesterType: 'student' | 'teacher'
    requesterId: string
    startDate: string
    endDate: string
    reason: string
    attachments?: Array<{ url: string; filename: string; mimeType: string }>
  },
): Promise<ILeaveRequest> {
  const { requesterType, requesterId, startDate, endDate, reason, attachments } = data

  // Validate date range
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (end < start) {
    throw new Error('End date must be on or after start date')
  }

  // Validate requester belongs to this school
  if (requesterType === 'student') {
    const student = await (await import('../../students/models/Student.js')).Student.findOne({
      _id: requesterId,
      schoolId,
    })
    if (!student) throw new Error('Student not found in this school')
  } else {
    const teacher = await (await import('../../teachers/models/Teacher.js')).Teacher.findOne({
      _id: requesterId,
      schoolId,
    })
    if (!teacher) throw new Error('Teacher not found in this school')
  }

  const leave = await LeaveRequest.create({
    schoolId,
    requesterType,
    requesterId,
    submittedBy,
    startDate: start,
    endDate: end,
    reason,
    attachments: attachments || [],
    status: 'pending',
  })

  // Notify school_admin/principal about new leave request
  const User = (await import('../../auth/models/User.js')).User
  const admins = await User.find({
    schoolId,
    roles: { $in: ['school_admin', 'principal'] },
  }).select('_id')

  for (const admin of admins) {
    await dispatchNotification({
      schoolId,
      userId: (admin._id as mongoose.Types.ObjectId).toString(),
      type: 'leave_submitted',
      data: {
        requesterName: requesterType,
        startDate: start.toLocaleDateString(),
        endDate: end.toLocaleDateString(),
      },
    })
  }

  return leave
}

// ── List leave requests ──────────────────────────────────────────────

export async function listLeaveRequests(
  schoolId: string,
  userId: string,
  roles: string[],
  filters: {
    page?: number
    limit?: number
    status?: string
    requesterType?: string
  },
) {
  const { page = 1, limit = 20, status, requesterType } = filters

  const query: Record<string, unknown> = { schoolId }

  if (status) query.status = status
  if (requesterType) query.requesterType = requesterType

  // Role-based filtering
  const isAdmin = roles.some(r => ['super_admin', 'school_admin', 'principal', 'hr'].includes(r))
  const isParent = roles.includes('parent')
  const isTeacher = roles.includes('teacher')

  if (isParent && !isAdmin) {
    // Parent can only see their children's requests + their own submitted requests
    const guardians = await Guardian.find({ userId }).select('children')
    const childIds = guardians.flatMap(g => g.children.map(c => c.toString()))
    query.$or = [
      { requesterType: 'student', requesterId: { $in: childIds } },
      { submittedBy: userId },
    ]
  } else if (isTeacher && !isAdmin) {
    // Teacher can only see their own requests
    query.$or = [
      { requesterType: 'teacher', requesterId: userId },
      { submittedBy: userId },
    ]
  }

  const [requests, total] = await Promise.all([
    LeaveRequest.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    LeaveRequest.countDocuments(query),
  ])

  return {
    requests,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  }
}

// ── Get leave request by ID ──────────────────────────────────────────

export async function getLeaveRequestById(
  schoolId: string,
  leaveId: string,
  userId: string,
  roles: string[],
): Promise<ILeaveRequest | null> {
  const leave = await LeaveRequest.findOne({ _id: leaveId, schoolId })
  if (!leave) return null

  const isAdmin = roles.some(r => ['super_admin', 'school_admin', 'principal', 'hr'].includes(r))
  if (isAdmin) return leave

  // Check if user is the requester or submitted for their child
  if (leave.submittedBy.toString() === userId) return leave
  if (leave.requesterId.toString() === userId) return leave

  // Parent: check if requesterId is their child
  if (roles.includes('parent')) {
    const guardians = await Guardian.find({ userId }).select('children')
    const childIds = guardians.flatMap(g => g.children.map(c => c.toString()))
    if (childIds.includes(leave.requesterId.toString())) return leave
  }

  return null
}

// ── Review leave request ─────────────────────────────────────────────

export async function reviewLeaveRequest(
  schoolId: string,
  leaveId: string,
  reviewerId: string,
  reviewerRoles: string[],
  data: {
    status: 'approved' | 'rejected'
    reviewComment?: string
  },
): Promise<ILeaveRequest> {
  const leave = await LeaveRequest.findOne({ _id: leaveId, schoolId })
  if (!leave) throw new Error('Leave request not found')
  if (leave.status !== 'pending') throw new Error('Leave request is not pending')

  const { status, reviewComment } = data

  // Validate reviewer permissions
  const isAdmin = reviewerRoles.some(r => ['super_admin', 'school_admin', 'principal'].includes(r))
  const isHR = reviewerRoles.includes('hr')

  if (leave.requesterType === 'student') {
    if (!isAdmin) throw new Error('Only school_admin/principal can review student leave')
  } else {
    // Teacher leave
    if (!isAdmin && !isHR) throw new Error('Only school_admin/principal/hr can review teacher leave')
  }

  leave.status = status
  leave.reviewedBy = new mongoose.Types.ObjectId(reviewerId)
  leave.reviewedAt = new Date()
  if (reviewComment) leave.reviewComment = reviewComment

  await leave.save()

  // Audit log
  await AuditLog.create({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(reviewerId),
    action: `leave:${status}`,
    entity: 'LeaveRequest',
    entityId: leave._id,
    after: { status, reviewComment },
  })

  // Notify requester about review decision
  await dispatchNotification({
    schoolId,
    userId: leave.submittedBy.toString(),
    type: 'leave_reviewed',
    data: {
      status,
      startDate: (leave.startDate as Date).toLocaleDateString(),
      endDate: (leave.endDate as Date).toLocaleDateString(),
      reviewComment: reviewComment || '',
    },
  })

  return leave
}

// ── Cancel leave request ─────────────────────────────────────────────

export async function cancelLeaveRequest(
  schoolId: string,
  leaveId: string,
  userId: string,
): Promise<ILeaveRequest> {
  const leave = await LeaveRequest.findOne({ _id: leaveId, schoolId })
  if (!leave) throw new Error('Leave request not found')
  if (leave.status !== 'pending') throw new Error('Only pending leave requests can be cancelled')
  if (leave.submittedBy.toString() !== userId && leave.requesterId.toString() !== userId) {
    throw new Error('You can only cancel your own leave request')
  }

  leave.status = 'cancelled'
  await leave.save()

  return leave
}
