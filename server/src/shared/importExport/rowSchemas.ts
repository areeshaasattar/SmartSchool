import { z } from 'zod'

const date = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid date')
export const studentImportRowSchema = z.object({
  admissionNo: z.string().min(1, 'Admission number is required'), firstName: z.string().min(1, 'First name is required'), lastName: z.string().min(1, 'Last name is required'),
  dob: date, gender: z.enum(['male', 'female', 'other']), emergencyContactName: z.string().min(1, 'Emergency contact name is required'), emergencyContactRelation: z.string().min(1, 'Emergency contact relation is required'), emergencyContactPhone: z.string().min(1, 'Emergency contact phone is required'),
})
export const teacherImportRowSchema = z.object({
  employeeNo: z.string().min(1, 'Employee number is required'), firstName: z.string().min(1, 'First name is required'), lastName: z.string().min(1, 'Last name is required'), email: z.string().email('Valid email is required'), designation: z.string().min(1, 'Designation is required'), joiningDate: date, employmentType: z.enum(['full_time', 'part_time', 'contract']),
})
