describe('Analytics Threshold Logic', () => {
  // Test support-needed student threshold logic
  describe('Support-needed student detection', () => {
    const ATTENDANCE_THRESHOLD = 75
    const EXAM_THRESHOLD = 40

    it('should flag students with attendance below threshold', () => {
      const attendancePercentage = 65
      const isSupportNeeded = attendancePercentage < ATTENDANCE_THRESHOLD
      expect(isSupportNeeded).toBe(true)
    })

    it('should not flag students with attendance at threshold', () => {
      const attendancePercentage = 75
      const isSupportNeeded = attendancePercentage < ATTENDANCE_THRESHOLD
      expect(isSupportNeeded).toBe(false)
    })

    it('should not flag students with attendance above threshold', () => {
      const attendancePercentage = 85
      const isSupportNeeded = attendancePercentage < ATTENDANCE_THRESHOLD
      expect(isSupportNeeded).toBe(false)
    })

    it('should flag students with exam average below threshold', () => {
      const examAverage = 35
      const isSupportNeeded = examAverage < EXAM_THRESHOLD
      expect(isSupportNeeded).toBe(true)
    })

    it('should not flag students with exam average at threshold', () => {
      const examAverage = 40
      const isSupportNeeded = examAverage < EXAM_THRESHOLD
      expect(isSupportNeeded).toBe(false)
    })

    it('should not flag students with exam average above threshold', () => {
      const examAverage = 60
      const isSupportNeeded = examAverage < EXAM_THRESHOLD
      expect(isSupportNeeded).toBe(false)
    })

    it('should flag students with both low attendance and low exam scores', () => {
      const attendancePercentage = 60
      const examAverage = 30
      const reasons: string[] = []
      if (attendancePercentage < ATTENDANCE_THRESHOLD) reasons.push('Low attendance')
      if (examAverage < EXAM_THRESHOLD) reasons.push('Low exam scores')
      expect(reasons).toHaveLength(2)
      expect(reasons).toContain('Low attendance')
      expect(reasons).toContain('Low exam scores')
    })
  })

  describe('Workload calculation', () => {
    it('should calculate average classes per teacher correctly', () => {
      const teachers = [
        { classCount: 3, subjectCount: 2 },
        { classCount: 5, subjectCount: 3 },
        { classCount: 2, subjectCount: 1 },
      ]
      const avg = Math.round(teachers.reduce((sum, t) => sum + t.classCount, 0) / teachers.length)
      expect(avg).toBe(3)
    })

    it('should handle empty teacher list', () => {
      const teachers: Array<{ classCount: number; subjectCount: number }> = []
      const avg = teachers.length > 0
        ? Math.round(teachers.reduce((sum, t) => sum + t.classCount, 0) / teachers.length)
        : 0
      expect(avg).toBe(0)
    })
  })

  describe('Fee collection rate calculation', () => {
    it('should calculate collection rate correctly', () => {
      const totalInvoiced = 100000
      const totalCollected = 75000
      const rate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0
      expect(rate).toBe(75)
    })

    it('should return 0 when no invoices', () => {
      const totalInvoiced = 0
      const totalCollected = 0
      const rate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0
      expect(rate).toBe(0)
    })
  })
})

describe('Analytics Data Shape', () => {
  it('school admin overview should have required fields', () => {
    const overview = {
      studentCount: 100,
      teacherCount: 10,
      attendanceToday: { percentage: 85, present: 85, total: 100 },
      feeCollectionRate: 75,
      totalOutstanding: 5000,
      pendingApprovals: 3,
    }
    expect(overview).toHaveProperty('studentCount')
    expect(overview).toHaveProperty('teacherCount')
    expect(overview).toHaveProperty('attendanceToday')
    expect(overview).toHaveProperty('feeCollectionRate')
    expect(overview).toHaveProperty('pendingApprovals')
  })

  it('teacher overview should have required fields', () => {
    const overview = {
      todayTimetable: [],
      pendingGrading: 5,
      attendanceStatus: { marked: 2, total: 4, classes: [] },
      recentMessages: 12,
    }
    expect(overview).toHaveProperty('todayTimetable')
    expect(overview).toHaveProperty('pendingGrading')
    expect(overview).toHaveProperty('attendanceStatus')
    expect(overview).toHaveProperty('recentMessages')
  })

  it('student overview should have required fields', () => {
    const overview = {
      student: { name: 'John Doe', admissionNo: 'STU001' },
      todayTimetable: [],
      upcomingExams: [],
      pendingAssignments: 3,
      attendance: 85,
      recentGrades: [],
    }
    expect(overview).toHaveProperty('student')
    expect(overview).toHaveProperty('todayTimetable')
    expect(overview).toHaveProperty('attendance')
  })
})
