import { Student, IStudent } from '../models/Student.js'
import { Guardian, IGuardian } from '../models/Guardian.js'
import { User } from '../../auth/models/User.js'
import { Class } from '../../classes/models/Class.js'
import { Teacher } from '../../teachers/models/Teacher.js'
import { hashPassword } from '../../../shared/password.js'
import mongoose from 'mongoose'

// ── Student CRUD ─────────────────────────────────────────────────────

export interface CreateStudentInput {
  schoolId: string
  admissionNo: string
  profile: {
    firstName: string
    lastName: string
    dob: Date
    gender: 'male' | 'female' | 'other'
    photoUrl?: string
    bloodGroup?: string
  }
  emergencyContact: { name: string; relation: string; phone: string }
  academicYearId?: string | null
  classId?: string | null
  sectionId?: string | null
  guardians?: Array<{
    guardianId?: string
    email?: string
    firstName?: string
    lastName?: string
    phone?: string
    relationship: string
  }>
}

export async function createStudent(input: CreateStudentInput): Promise<IStudent> {
  // Check admission number uniqueness per school
  const existing = await Student.findOne({
    schoolId: input.schoolId,
    admissionNo: input.admissionNo,
  })
  if (existing) {
    throw new Error('Admission number already exists for this school')
  }

  const student = await Student.create({
    schoolId: input.schoolId,
    admissionNo: input.admissionNo,
    profile: input.profile,
    emergencyContact: input.emergencyContact,
    academicYearId: input.academicYearId || null,
    classId: input.classId || null,
    sectionId: input.sectionId || null,
  })

  // Process guardians
  if (input.guardians && input.guardians.length > 0) {
    const guardianIds: mongoose.Types.ObjectId[] = []

    for (const g of input.guardians) {
      let guardian: IGuardian

      if (g.guardianId) {
        // Link existing guardian
        const found = await Guardian.findById(g.guardianId)
        if (!found) throw new Error('Guardian not found')
        guardian = found
      } else {
        // Create or find guardian by email
        let user = await User.findOne({ email: g.email!.toLowerCase() })

        if (!user) {
          // Create a new user with parent role
          const tempPassword = await hashPassword('ChangeMe1!')
          user = await User.create({
            email: g.email!.toLowerCase(),
            passwordHash: tempPassword,
            roles: ['parent'],
            schoolIds: [input.schoolId],
            profile: {
              firstName: g.firstName!,
              lastName: g.lastName!,
              phone: g.phone,
            },
            status: 'active',
          })
        }

        // Find or create guardian record
        const found = await Guardian.findOne({ userId: user._id, schoolId: input.schoolId })
        if (found) {
          guardian = found
        } else {
          guardian = await Guardian.create({
            schoolId: input.schoolId,
            userId: user._id,
            relationship: g.relationship,
            children: [student._id as mongoose.Types.ObjectId],
          })
        }
      }

      // Add student to guardian's children list
      if (!guardian.children.some((cid) => cid.equals(student._id))) {
        guardian.children.push(student._id as mongoose.Types.ObjectId)
        await guardian.save()
      }

      guardianIds.push(guardian._id as mongoose.Types.ObjectId)
    }

    student.guardianIds = guardianIds
    await student.save()
  }

  return student
}

export async function getStudentById(
  studentId: string,
  schoolId: string,
  teacherUserId?: string,
): Promise<IStudent | null> {
  const student = await Student.findOne({ _id: studentId, schoolId })
    .populate('guardianIds')
  if (!student) return null

  // Teacher visibility: verify the student is in one of the teacher's assigned classes
  if (teacherUserId && student.classId) {
    const teacher = await Teacher.findOne({ userId: teacherUserId, schoolId })
    if (!teacher) return null
    const cls = await Class.findOne({
      _id: student.classId,
      schoolId,
      $or: [
        { classTeacherId: teacher._id },
        { teacherIds: teacher._id },
      ],
    })
    if (!cls) return null
  }

  return student
}

export interface ListStudentsOptions {
  schoolId: string
  page: number
  limit: number
  search?: string
  status?: string
  classId?: string
  /** For parent role: only return students linked to their guardians */
  parentUserId?: string
  /** For teacher role: only return students in their assigned classes */
  teacherUserId?: string
}

export async function listStudents(options: ListStudentsOptions) {
  const { schoolId, page, limit, search, status, classId, parentUserId, teacherUserId } = options
  const skip = (page - 1) * limit

  const filter: Record<string, unknown> = { schoolId }

  if (status) filter.status = status
  if (classId) filter.classId = classId

  if (search) {
    filter.$or = [
      { admissionNo: { $regex: search, $options: 'i' } },
      { 'profile.firstName': { $regex: search, $options: 'i' } },
      { 'profile.lastName': { $regex: search, $options: 'i' } },
    ]
  }

  // Parent visibility: only their own children
  if (parentUserId) {
    const guardians = await Guardian.find({ userId: parentUserId, schoolId })
    const guardianIds = guardians.map((g) => g._id)
    filter.guardianIds = { $in: guardianIds }
  }

  // Teacher visibility: only students in their assigned classes
  if (teacherUserId) {
    const teacher = await Teacher.findOne({ userId: teacherUserId, schoolId })
    if (teacher) {
      // Find classes where this teacher is the classTeacher or assigned subject-teacher
      const classes = await Class.find({
        schoolId,
        $or: [
          { classTeacherId: teacher._id },
          { teacherIds: teacher._id },
        ],
      })
      const classIds = classes.map((c) => c._id)
      filter.classId = { $in: classIds }
    } else {
      // Teacher record not found — return no students
      filter.classId = { $in: [] }
    }
  }

  const [students, total] = await Promise.all([
    Student.find(filter)
      .select('admissionNo profile status classId sectionId academicYearId createdAt')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    Student.countDocuments(filter),
  ])

  return {
    students: students.map((s) => ({
      id: (s._id as mongoose.Types.ObjectId).toString(),
      admissionNo: s.admissionNo,
      profile: s.profile,
      status: s.status,
      classId: s.classId,
      sectionId: s.sectionId,
      academicYearId: s.academicYearId,
      createdAt: s.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export async function updateStudent(
  studentId: string,
  schoolId: string,
  input: Record<string, unknown>,
): Promise<IStudent> {
  const student = await Student.findOne({ _id: studentId, schoolId })
  if (!student) throw new Error('Student not found')

  if (input.admissionNo !== undefined) {
    // Check uniqueness if changing admission number
    const existing = await Student.findOne({
      schoolId,
      admissionNo: input.admissionNo,
      _id: { $ne: student._id },
    })
    if (existing) throw new Error('Admission number already exists for this school')
    student.admissionNo = input.admissionNo as string
  }

  if (input.profile) {
    const p = input.profile as Record<string, unknown>
    if (p.firstName !== undefined) student.profile.firstName = p.firstName as string
    if (p.lastName !== undefined) student.profile.lastName = p.lastName as string
    if (p.dob !== undefined) student.profile.dob = new Date(p.dob as string)
    if (p.gender !== undefined) student.profile.gender = p.gender as 'male' | 'female' | 'other'
    if (p.photoUrl !== undefined) student.profile.photoUrl = p.photoUrl as string
    if (p.bloodGroup !== undefined) student.profile.bloodGroup = p.bloodGroup as string
  }

  if (input.emergencyContact) {
    const ec = input.emergencyContact as Record<string, unknown>
    if (ec.name !== undefined) student.emergencyContact.name = ec.name as string
    if (ec.relation !== undefined) student.emergencyContact.relation = ec.relation as string
    if (ec.phone !== undefined) student.emergencyContact.phone = ec.phone as string
  }

  if (input.status !== undefined) student.status = input.status as IStudent['status']
  if (input.academicYearId !== undefined) student.academicYearId = input.academicYearId as mongoose.Types.ObjectId | null
  if (input.classId !== undefined) student.classId = input.classId as mongoose.Types.ObjectId | null
  if (input.sectionId !== undefined) student.sectionId = input.sectionId as mongoose.Types.ObjectId | null

  await student.save()
  return student
}

export async function softDeleteStudent(
  studentId: string,
  schoolId: string,
): Promise<IStudent> {
  const student = await Student.findOne({ _id: studentId, schoolId })
  if (!student) throw new Error('Student not found')

  student.status = 'inactive'
  await student.save()
  return student
}

// ── Student 360 ──────────────────────────────────────────────────────

export async function getStudent360(
  studentId: string,
  schoolId: string,
): Promise<Record<string, unknown> | null> {
  const student = await Student.findOne({ _id: studentId, schoolId })
    .populate('guardianIds')
  if (!student) return null

  return {
    profile: student.profile,
    emergencyContact: student.emergencyContact,
    admissionNo: student.admissionNo,
    status: student.status,
    classId: student.classId,
    sectionId: student.sectionId,
    academicYearId: student.academicYearId,
    guardians: student.guardianIds,
    // Stubbed sections for future branches
    attendance: [],
    grades: [],
    fees: null,
    documents: [],
    behavior: [],
  }
}

// ── Guardian operations ──────────────────────────────────────────────

export async function attachGuardianToStudent(
  studentId: string,
  schoolId: string,
  input: {
    guardianId?: string
    email?: string
    firstName?: string
    lastName?: string
    phone?: string
    relationship: string
  },
): Promise<IGuardian> {
  const student = await Student.findOne({ _id: studentId, schoolId })
  if (!student) throw new Error('Student not found')

  let guardian: IGuardian

  if (input.guardianId) {
    const found = await Guardian.findById(input.guardianId)
    if (!found) throw new Error('Guardian not found')
    guardian = found
  } else {
    // Find or create user
    let user = await User.findOne({ email: input.email!.toLowerCase() })
    if (!user) {
      const tempPassword = await hashPassword('ChangeMe1!')
      user = await User.create({
        email: input.email!.toLowerCase(),
        passwordHash: tempPassword,
        roles: ['parent'],
        schoolIds: [schoolId],
        profile: {
          firstName: input.firstName!,
          lastName: input.lastName!,
          phone: input.phone,
        },
        status: 'active',
      })
    }

    const found = await Guardian.findOne({ userId: user._id, schoolId })
    if (found) {
      guardian = found
    } else {
      guardian = await Guardian.create({
        schoolId,
        userId: user._id,
        relationship: input.relationship,
        children: [student._id as mongoose.Types.ObjectId],
      })
    }
  }

  // Link student ↔ guardian
  if (!guardian.children.some((cid) => cid.equals(student._id))) {
    guardian.children.push(student._id as mongoose.Types.ObjectId)
    await guardian.save()
  }

  if (!student.guardianIds.some((gid) => gid.equals(guardian._id))) {
    student.guardianIds.push(guardian._id as mongoose.Types.ObjectId)
    await student.save()
  }

  return guardian
}

export async function getGuardianChildren(
  guardianUserId: string,
  schoolId: string,
): Promise<IStudent[]> {
  const guardian = await Guardian.findOne({ userId: guardianUserId, schoolId })
  if (!guardian) return []

  return Student.find({
    _id: { $in: guardian.children },
    schoolId,
  }).select('admissionNo profile status classId sectionId')
}
