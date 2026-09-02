import { createSlotSchema, updateSlotSchema, availabilityQuerySchema, timetableDayEnum } from '../../src/modules/timetables/schemas/timetableSchemas.js'

describe('Timetable validation schemas', () => {
  describe('timetableDayEnum', () => {
    it('accepts all valid days', () => {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      days.forEach((d) => expect(timetableDayEnum.safeParse(d).success).toBe(true))
    })

    it('rejects invalid day', () => {
      expect(timetableDayEnum.safeParse('funday').success).toBe(false)
    })
  })

  describe('createSlotSchema', () => {
    const validSlot = {
      classId: '507f1f77bcf86cd799439011',
      subjectId: '507f1f77bcf86cd799439012',
      teacherId: '507f1f77bcf86cd799439013',
      day: 'monday',
      startTime: '09:00',
      endTime: '10:00',
      academicYearId: '507f1f77bcf86cd799439014',
    }

    it('accepts valid slot data', () => {
      expect(createSlotSchema.safeParse(validSlot).success).toBe(true)
    })

    it('accepts slot with roomId', () => {
      expect(createSlotSchema.safeParse({ ...validSlot, roomId: '507f1f77bcf86cd799439015' }).success).toBe(true)
    })

    it('rejects endTime before startTime', () => {
      expect(createSlotSchema.safeParse({ ...validSlot, startTime: '10:00', endTime: '09:00' }).success).toBe(false)
    })

    it('rejects equal start and end time', () => {
      expect(createSlotSchema.safeParse({ ...validSlot, startTime: '09:00', endTime: '09:00' }).success).toBe(false)
    })

    it('rejects invalid time format', () => {
      expect(createSlotSchema.safeParse({ ...validSlot, startTime: '9am', endTime: '10am' }).success).toBe(false)
    })

    it('rejects missing required fields', () => {
      const { classId, ...rest } = validSlot
      expect(createSlotSchema.safeParse(rest).success).toBe(false)
    })

    it('accepts back-to-back slots (no overlap boundary)', () => {
      expect(createSlotSchema.safeParse({ ...validSlot, startTime: '09:00', endTime: '10:00' }).success).toBe(true)
      expect(createSlotSchema.safeParse({ ...validSlot, startTime: '10:00', endTime: '11:00' }).success).toBe(true)
    })
  })

  describe('updateSlotSchema', () => {
    it('accepts partial updates', () => {
      expect(updateSlotSchema.safeParse({ startTime: '11:00' }).success).toBe(true)
    })

    it('accepts empty update', () => {
      expect(updateSlotSchema.safeParse({}).success).toBe(true)
    })

    it('validates endTime > startTime when both provided', () => {
      expect(updateSlotSchema.safeParse({ startTime: '10:00', endTime: '09:00' }).success).toBe(false)
    })

    it('accepts null roomId', () => {
      expect(updateSlotSchema.safeParse({ roomId: null }).success).toBe(true)
    })
  })

  describe('availabilityQuerySchema', () => {
    it('accepts teacherId query', () => {
      expect(availabilityQuerySchema.safeParse({
        teacherId: '507f1f77bcf86cd799439011',
        day: 'monday',
        startTime: '09:00',
        endTime: '10:00',
      }).success).toBe(true)
    })

    it('accepts roomId query', () => {
      expect(availabilityQuerySchema.safeParse({
        roomId: '507f1f77bcf86cd799439011',
        day: 'wednesday',
        startTime: '14:00',
        endTime: '15:00',
      }).success).toBe(true)
    })

    it('accepts classId query', () => {
      expect(availabilityQuerySchema.safeParse({
        classId: '507f1f77bcf86cd799439011',
        day: 'friday',
        startTime: '08:00',
        endTime: '09:00',
      }).success).toBe(true)
    })

    it('rejects query with no teacher/room/class', () => {
      expect(availabilityQuerySchema.safeParse({
        day: 'monday',
        startTime: '09:00',
        endTime: '10:00',
      }).success).toBe(false)
    })
  })
})
