import { School, ISchool, IAcademicYear } from '../models/School.js'
import mongoose from 'mongoose'

// ── School queries ───────────────────────────────────────────────────

export async function getSchoolById(id: string): Promise<ISchool | null> {
  return School.findById(id)
}

export async function listAllSchools(): Promise<ISchool[]> {
  return School.find().sort({ createdAt: -1 })
}

// ── School settings update ───────────────────────────────────────────

export interface UpdateSettingsInput {
  name?: string
  status?: string
  settings?: {
    timezone?: string
    locale?: string
    academicWeekStart?: number
    gradingScale?: string
    contact?: { email?: string; phone?: string; address?: string }
    branding?: { logoUrl?: string; primaryColor?: string }
  }
}

export async function updateSchoolSettings(
  schoolId: string,
  input: UpdateSettingsInput,
): Promise<ISchool> {
  const school = await School.findById(schoolId)
  if (!school) throw new Error('School not found')

  if (input.name !== undefined) school.name = input.name
  if (input.status !== undefined) school.status = input.status as ISchool['status']

  if (input.settings) {
    const s = input.settings
    if (s.timezone !== undefined) school.settings.timezone = s.timezone
    if (s.locale !== undefined) school.settings.locale = s.locale
    if (s.academicWeekStart !== undefined) school.settings.academicWeekStart = s.academicWeekStart
    if (s.gradingScale !== undefined) school.settings.gradingScale = s.gradingScale
    if (s.contact) {
      if (s.contact.email !== undefined) school.settings.contact.email = s.contact.email
      if (s.contact.phone !== undefined) school.settings.contact.phone = s.contact.phone
      if (s.contact.address !== undefined) school.settings.contact.address = s.contact.address
    }
    if (s.branding) {
      if (s.branding.logoUrl !== undefined) school.settings.branding.logoUrl = s.branding.logoUrl
      if (s.branding.primaryColor !== undefined) school.settings.branding.primaryColor = s.branding.primaryColor
    }
  }

  await school.save()
  return school
}

// ── Academic year management ─────────────────────────────────────────

/**
 * Unset all current flags for academic years in a school.
 */
async function unsetCurrentFlags(schoolId: string, excludeYearId?: string): Promise<void> {
  const filter: Record<string, unknown> = { _id: schoolId }
  const update: Record<string, unknown> = { $set: { 'academicYears.$[elem].isCurrent': false } }
  const arrayFilters: Record<string, unknown>[] = [{ 'elem.isCurrent': true }]

  if (excludeYearId) {
    arrayFilters[0]['elem._id'] = { $ne: new mongoose.Types.ObjectId(excludeYearId) }
  }

  await School.updateOne(filter, update, { arrayFilters })
}

/**
 * Create a new academic year for a school.
 * If `isCurrent` is true, atomically unsets any other current year.
 */
export async function createAcademicYear(
  schoolId: string,
  input: { label: string; startDate: Date; endDate: Date; isCurrent: boolean },
): Promise<IAcademicYear> {
  const school = await School.findById(schoolId)
  if (!school) throw new Error('School not found')

  if (input.isCurrent) {
    await unsetCurrentFlags(schoolId)
  }

  school.academicYears.push({
    label: input.label,
    startDate: input.startDate,
    endDate: input.endDate,
    isCurrent: input.isCurrent,
  })
  await school.save()

  return school.academicYears[school.academicYears.length - 1]
}

/**
 * Update an academic year. If setting `isCurrent: true`, atomically
 * unsets any other current year for that school.
 */
export async function updateAcademicYear(
  schoolId: string,
  yearId: string,
  input: { label?: string; startDate?: Date; endDate?: Date; isCurrent?: boolean },
): Promise<IAcademicYear> {
  const school = await School.findById(schoolId)
  if (!school) throw new Error('School not found')

  const year = school.academicYears.id(yearId)
  if (!year) throw new Error('Academic year not found')

  if (input.isCurrent === true) {
    await unsetCurrentFlags(schoolId, yearId)
  }

  if (input.label !== undefined) year.label = input.label
  if (input.startDate !== undefined) year.startDate = input.startDate
  if (input.endDate !== undefined) year.endDate = input.endDate
  if (input.isCurrent !== undefined) year.isCurrent = input.isCurrent

  await school.save()
  return year
}

export async function listAcademicYears(schoolId: string): Promise<IAcademicYear[]> {
  const school = await School.findById(schoolId).select('academicYears')
  if (!school) throw new Error('School not found')
  return school.academicYears
}
