import { Teacher, ITeacher } from '../models/Teacher.js'
import { User } from '../../auth/models/User.js'
import { hashPassword } from '../../../shared/password.js'
import mongoose from 'mongoose'

// ── Teacher CRUD ─────────────────────────────────────────────────────

export interface CreateTeacherInput {
  schoolId: string
  employeeNo: string
  profile: {
    firstName: string
    lastName: string
    dob?: Date
    gender?: 'male' | 'female' | 'other'
    photoUrl?: string
    phone?: string
  }
  employment: {
    designation: string
    joiningDate: Date
    employmentType: 'full_time' | 'part_time' | 'contract'
    status?: 'active' | 'on_leave' | 'inactive'
  }
  departments?: string[]
  subjects?: string[]
  qualifications?: Array<{ degree: string; institution: string; year: number }>
  user: {
    userId?: string
    email?: string
    firstName?: string
    lastName?: string
    phone?: string
  }
}

export async function createTeacher(input: CreateTeacherInput): Promise<ITeacher> {
  // Check employeeNo uniqueness per school
  const existing = await Teacher.findOne({
    schoolId: input.schoolId,
    employeeNo: input.employeeNo,
  })
  if (existing) {
    throw new Error('Employee number already exists for this school')
  }

  // Create or link user account
  let user: any
  if (input.user.userId) {
    user = await User.findById(input.user.userId)
    if (!user) throw new Error('User not found')
  } else {
    user = await User.findOne({ email: input.user.email!.toLowerCase() })
    if (!user) {
      const tempPassword = await hashPassword('ChangeMe1!')
      user = await User.create({
        email: input.user.email!.toLowerCase(),
        passwordHash: tempPassword,
        roles: ['teacher'],
        schoolIds: [input.schoolId],
        profile: {
          firstName: input.user.firstName!,
          lastName: input.user.lastName!,
          phone: input.user.phone,
        },
        status: 'active',
      })
    } else {
      // Ensure teacher role is present
      if (!user.roles.includes('teacher' as any)) {
        user.roles.push('teacher')
      }
      // Ensure school is in schoolIds
      if (!user.schoolIds.some((sid: any) => sid.toString() === input.schoolId)) {
        user.schoolIds.push(input.schoolId)
      }
      await user.save()
    }
  }

  const teacher = await Teacher.create({
    schoolId: input.schoolId,
    userId: user._id,
    employeeNo: input.employeeNo,
    profile: input.profile,
    employment: {
      ...input.employment,
      status: input.employment.status || 'active',
    },
    departments: input.departments || [],
    subjects: input.subjects || [],
    qualifications: input.qualifications || [],
  })

  return teacher
}

export async function getTeacherById(
  teacherId: string,
  schoolId: string,
): Promise<ITeacher | null> {
  return Teacher.findOne({ _id: teacherId, schoolId }).populate('userId', 'email profile roles')
}

export async function getTeacherByUserId(
  userId: string,
  schoolId: string,
): Promise<ITeacher | null> {
  return Teacher.findOne({ userId, schoolId }).populate('userId', 'email profile roles')
}

export interface ListTeachersOptions {
  schoolId: string
  page: number
  limit: number
  search?: string
  status?: string
  department?: string
  /** For teacher role: only return their own record */
  selfUserId?: string
}

export async function listTeachers(options: ListTeachersOptions) {
  const { schoolId, page, limit, search, status, department, selfUserId } = options
  const skip = (page - 1) * limit

  const filter: Record<string, unknown> = { schoolId }

  if (status) filter['employment.status'] = status
  if (department) filter.departments = department

  if (search) {
    filter.$or = [
      { employeeNo: { $regex: search, $options: 'i' } },
      { 'profile.firstName': { $regex: search, $options: 'i' } },
      { 'profile.lastName': { $regex: search, $options: 'i' } },
    ]
  }

  // Teacher visibility: only their own record
  if (selfUserId) {
    filter.userId = selfUserId
  }

  const [teachers, total] = await Promise.all([
    Teacher.find(filter)
      .select('employeeNo profile employment departments subjects createdAt')
      .populate('userId', 'email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    Teacher.countDocuments(filter),
  ])

  return {
    teachers: teachers.map((t) => ({
      id: (t._id as mongoose.Types.ObjectId).toString(),
      employeeNo: t.employeeNo,
      profile: t.profile,
      employment: t.employment,
      departments: t.departments,
      email: (t.userId as any)?.email,
      createdAt: t.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

// ── Self-edit restrictions ───────────────────────────────────────────

/** Fields a teacher is allowed to self-edit */
const SELF_EDITABLE_FIELDS = ['profile.phone', 'profile.photoUrl']

export async function updateTeacher(
  teacherId: string,
  schoolId: string,
  input: Record<string, unknown>,
  isSelfEdit = false,
): Promise<ITeacher> {
  const teacher = await Teacher.findOne({ _id: teacherId, schoolId })
  if (!teacher) throw new Error('Teacher not found')

  if (isSelfEdit) {
    // Enforce field-level restrictions for self-edit
    const allowedInput: Record<string, unknown> = {}
    for (const field of SELF_EDITABLE_FIELDS) {
      const parts = field.split('.')
      let source: any = input
      let target: any = allowedInput
      for (let i = 0; i < parts.length - 1; i++) {
        if (source[parts[i]] === undefined) break
        if (!target[parts[i]]) target[parts[i]] = {}
        source = source[parts[i]]
        target = target[parts[i]]
      }
      const lastPart = parts[parts.length - 1]
      if (source[lastPart] !== undefined) {
        target[lastPart] = source[lastPart]
      }
    }
    Object.assign(input, allowedInput)
  }

  if (input.employeeNo !== undefined && !isSelfEdit) {
    const existing = await Teacher.findOne({
      schoolId,
      employeeNo: input.employeeNo,
      _id: { $ne: teacher._id },
    })
    if (existing) throw new Error('Employee number already exists for this school')
    teacher.employeeNo = input.employeeNo as string
  }

  if (input.profile && !isSelfEdit) {
    const p = input.profile as Record<string, unknown>
    if (p.firstName !== undefined) teacher.profile.firstName = p.firstName as string
    if (p.lastName !== undefined) teacher.profile.lastName = p.lastName as string
    if (p.dob !== undefined) teacher.profile.dob = new Date(p.dob as string)
    if (p.gender !== undefined) teacher.profile.gender = p.gender as 'male' | 'female' | 'other'
  }

  // Self-editable profile fields
  if (input.profile) {
    const p = input.profile as Record<string, unknown>
    if (p.phone !== undefined) teacher.profile.phone = p.phone as string
    if (p.photoUrl !== undefined) teacher.profile.photoUrl = p.photoUrl as string
  }

  if (input.employment && !isSelfEdit) {
    const e = input.employment as Record<string, unknown>
    if (e.designation !== undefined) teacher.employment.designation = e.designation as string
    if (e.joiningDate !== undefined) teacher.employment.joiningDate = new Date(e.joiningDate as string)
    if (e.employmentType !== undefined) teacher.employment.employmentType = e.employmentType as any
    if (e.status !== undefined) teacher.employment.status = e.status as any
  }

  if (input.departments !== undefined && !isSelfEdit) teacher.departments = input.departments as string[]
  if (input.subjects !== undefined && !isSelfEdit) teacher.subjects = input.subjects as string[]
  if (input.qualifications !== undefined && !isSelfEdit) teacher.qualifications = input.qualifications as any[]

  await teacher.save()
  return teacher
}

export async function softDeleteTeacher(
  teacherId: string,
  schoolId: string,
): Promise<ITeacher> {
  const teacher = await Teacher.findOne({ _id: teacherId, schoolId })
  if (!teacher) throw new Error('Teacher not found')

  teacher.employment.status = 'inactive'
  await teacher.save()
  return teacher
}

// ── Teacher Profile (aggregation endpoint) ───────────────────────────

export async function getTeacherProfile(
  teacherId: string,
  schoolId: string,
): Promise<Record<string, unknown> | null> {
  const teacher = await Teacher.findOne({ _id: teacherId, schoolId })
    .populate('userId', 'email profile')
  if (!teacher) return null

  return {
    profile: teacher.profile,
    employment: teacher.employment,
    qualifications: teacher.qualifications,
    employeeNo: teacher.employeeNo,
    departments: teacher.departments,
    subjects: teacher.subjects,
    classes: teacher.classes,
    email: (teacher.userId as any)?.email,
    // Stubbed sections for future branches
    attendance: [],
    leave: [],
    workload: [],
    documents: [],
  }
}
