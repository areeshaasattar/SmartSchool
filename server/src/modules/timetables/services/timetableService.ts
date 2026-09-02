import mongoose from 'mongoose'
import { TimetableSlot, ITimetableSlot, TimetableDay } from '../models/TimetableSlot.js'
import { writeAuditLog } from '../../audit/models/AuditLog.js'

// ── Helper ───────────────────────────────────────────────────────────

function toPlain(obj: unknown): Record<string, unknown> {
  if (obj && typeof obj === 'object' && 'toObject' in obj && typeof (obj as { toObject: unknown }).toObject === 'function') {
    return (obj as { toObject: () => Record<string, unknown> }).toObject()
  }
  return obj as Record<string, unknown>
}

// ── Conflict detection ───────────────────────────────────────────────

export interface ConflictResult {
  hasConflict: boolean
  conflictType?: 'teacher' | 'room' | 'class'
  conflictDetail?: string
  existingSlot?: Record<string, unknown>
}

/**
 * Check if a proposed time slot overlaps with any existing slot for the
 * same academic year + day. Returns which dimension is in conflict.
 */
export async function checkConflicts(
  schoolId: string,
  academicYearId: string,
  day: string,
  startTime: string,
  endTime: string,
  teacherId: string,
  classId: string,
  roomId: string | null | undefined,
  excludeSlotId?: string,
): Promise<ConflictResult> {
  // Find all slots for this school + academic year + day
  const query: Record<string, unknown> = {
    schoolId,
    academicYearId,
    day,
  }
  if (excludeSlotId) {
    query._id = { $ne: new mongoose.Types.ObjectId(excludeSlotId) }
  }

  const existingSlots = await TimetableSlot.find(query)

  // Check overlap: two slots overlap if one starts before the other ends AND ends after the other starts
  const hasOverlap = (a: ITimetableSlot, b: ITimetableSlot) => {
    return a.startTime < b.endTime && a.endTime > b.startTime
  }

  for (const existing of existingSlots) {
    if (!hasOverlap(existing, { startTime, endTime } as ITimetableSlot)) continue

    // Check teacher conflict
    if (existing.teacherId.toString() === teacherId) {
      return {
        hasConflict: true,
        conflictType: 'teacher',
        conflictDetail: `Teacher is already assigned to ${existing.startTime}-${existing.endTime} on ${day}`,
        existingSlot: toPlain(existing),
      }
    }

    // Check room conflict (only if both have a room)
    if (roomId && existing.roomId && existing.roomId.toString() === roomId) {
      return {
        hasConflict: true,
        conflictType: 'room',
        conflictDetail: `Room is already booked for ${existing.startTime}-${existing.endTime} on ${day}`,
        existingSlot: toPlain(existing),
      }
    }

    // Check class conflict
    if (existing.classId.toString() === classId) {
      return {
        hasConflict: true,
        conflictType: 'class',
        conflictDetail: `Class already has a subject scheduled for ${existing.startTime}-${existing.endTime} on ${day}`,
        existingSlot: toPlain(existing),
      }
    }
  }

  return { hasConflict: false }
}

// ── CRUD ─────────────────────────────────────────────────────────────

export interface CreateSlotInput {
  classId: string
  subjectId: string
  teacherId: string
  roomId?: string
  day: TimetableDay
  startTime: string
  endTime: string
  academicYearId: string
}

export async function createSlot(schoolId: string, input: CreateSlotInput, actorId: string, actorEmail = 'system') {
  // Run conflict detection
  const conflicts = await checkConflicts(
    schoolId,
    input.academicYearId,
    input.day,
    input.startTime,
    input.endTime,
    input.teacherId,
    input.classId,
    input.roomId || null,
  )

  if (conflicts.hasConflict) {
    throw new Error(`Schedule conflict: ${conflicts.conflictDetail}`)
  }

  const slot = await TimetableSlot.create({
    schoolId,
    ...input,
    roomId: input.roomId || null,
  })

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail,
    action: 'timetable:create',
    entity: 'TimetableSlot',
    entityId: slot._id.toString(),
    after: toPlain(slot),
  })

  return slot
}

export interface UpdateSlotInput {
  classId?: string
  subjectId?: string
  teacherId?: string
  roomId?: string | null
  day?: TimetableDay
  startTime?: string
  endTime?: string
  academicYearId?: string
}

export async function updateSlot(schoolId: string, slotId: string, input: UpdateSlotInput, actorId: string, actorEmail = 'system') {
  const slot = await TimetableSlot.findOne({ _id: slotId, schoolId })
  if (!slot) throw new Error('Timetable slot not found')

  const before = toPlain(slot)

  // Merge proposed values with existing for conflict check
  const proposedDay = input.day || slot.day
  const proposedStartTime = input.startTime || slot.startTime
  const proposedEndTime = input.endTime || slot.endTime
  const proposedTeacherId = input.teacherId || slot.teacherId.toString()
  const proposedClassId = input.classId || slot.classId.toString()
  const proposedRoomId = input.roomId !== undefined ? input.roomId : (slot.roomId ? slot.roomId.toString() : null)

  // Run conflict detection excluding this slot
  const conflicts = await checkConflicts(
    schoolId,
    (input.academicYearId || slot.academicYearId.toString()),
    proposedDay,
    proposedStartTime,
    proposedEndTime,
    proposedTeacherId,
    proposedClassId,
    proposedRoomId,
    slotId,
  )

  if (conflicts.hasConflict) {
    throw new Error(`Schedule conflict: ${conflicts.conflictDetail}`)
  }

  // Apply updates
  if (input.classId !== undefined) slot.classId = input.classId as unknown as mongoose.Types.ObjectId
  if (input.subjectId !== undefined) slot.subjectId = input.subjectId as unknown as mongoose.Types.ObjectId
  if (input.teacherId !== undefined) slot.teacherId = input.teacherId as unknown as mongoose.Types.ObjectId
  if (input.roomId !== undefined) slot.roomId = input.roomId as unknown as mongoose.Types.ObjectId
  if (input.day !== undefined) slot.day = input.day
  if (input.startTime !== undefined) slot.startTime = input.startTime
  if (input.endTime !== undefined) slot.endTime = input.endTime
  if (input.academicYearId !== undefined) slot.academicYearId = input.academicYearId as unknown as mongoose.Types.ObjectId

  await slot.save()

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail,
    action: 'timetable:update',
    entity: 'TimetableSlot',
    entityId: slotId,
    before,
    after: toPlain(slot),
  })

  return slot
}

export async function deleteSlot(schoolId: string, slotId: string, actorId: string, actorEmail = 'system') {
  const slot = await TimetableSlot.findOne({ _id: slotId, schoolId })
  if (!slot) throw new Error('Timetable slot not found')

  const before = toPlain(slot)
  await TimetableSlot.findByIdAndDelete(slotId)

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail,
    action: 'timetable:delete',
    entity: 'TimetableSlot',
    entityId: slotId,
    before,
  })

  return true
}

// ── Views ────────────────────────────────────────────────────────────

export async function getClassTimetable(schoolId: string, classId: string) {
  return TimetableSlot.find({ schoolId, classId })
    .populate('subjectId', 'name code')
    .populate('teacherId', 'employeeNo profile.firstName profile.lastName')
    .populate('roomId', 'name capacity')
    .sort({ day: 1, startTime: 1 })
}

export async function getTeacherTimetable(schoolId: string, teacherId: string) {
  return TimetableSlot.find({ schoolId, teacherId })
    .populate('classId', 'grade section')
    .populate('subjectId', 'name code')
    .populate('roomId', 'name')
    .sort({ day: 1, startTime: 1 })
}

export async function getRoomTimetable(schoolId: string, roomId: string) {
  return TimetableSlot.find({ schoolId, roomId })
    .populate('classId', 'grade section')
    .populate('subjectId', 'name code')
    .populate('teacherId', 'profile.firstName profile.lastName')
    .sort({ day: 1, startTime: 1 })
}

// ── Availability check ───────────────────────────────────────────────

export interface AvailabilityInput {
  teacherId?: string
  roomId?: string
  classId?: string
  day: string
  startTime: string
  endTime: string
}

export async function checkAvailability(schoolId: string, academicYearId: string, input: AvailabilityInput) {
  const { day, startTime, endTime } = input
  const query: Record<string, unknown> = { schoolId, academicYearId, day }

  const existingSlots = await TimetableSlot.find(query)

  const hasOverlap = (a: ITimetableSlot, b: { startTime: string; endTime: string }) => {
    return a.startTime < b.endTime && a.endTime > b.startTime
  }

  const busySlots: { teacher?: Record<string, unknown>; room?: Record<string, unknown>; class?: Record<string, unknown> } = {}

  for (const slot of existingSlots) {
    if (!hasOverlap(slot, { startTime, endTime })) continue

    if (input.teacherId && slot.teacherId.toString() === input.teacherId) {
      busySlots.teacher = toPlain(slot)
    }
    if (input.roomId && slot.roomId && slot.roomId.toString() === input.roomId) {
      busySlots.room = toPlain(slot)
    }
    if (input.classId && slot.classId.toString() === input.classId) {
      busySlots.class = toPlain(slot)
    }
  }

  const isAvailable = !busySlots.teacher && !busySlots.room && !busySlots.class

  return { isAvailable, busySlots }
}
