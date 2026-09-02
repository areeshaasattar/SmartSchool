import { buildAuditLogFilter } from '../../src/modules/audit/services/auditService.js'

describe('audit log filter builder', () => {
  it('combines tenant, entity, action, actor, and date filters', () => {
    const filter = buildAuditLogFilter({
      schoolId: '507f1f77bcf86cd799439011', entity: 'student', action: 'student:update', actorId: '507f191e810c19729de860ea',
      dateFrom: '2026-01-01', dateTo: '2026-01-31',
    })
    expect(filter).toMatchObject({ schoolId: '507f1f77bcf86cd799439011', entity: 'student', action: 'student:update', actorId: '507f191e810c19729de860ea' })
    expect(filter.timestamp.$gte).toEqual(new Date('2026-01-01'))
    expect(filter.timestamp.$lte).toEqual(new Date('2026-01-31T23:59:59.999Z'))
  })

  it('does not add empty optional filters', () => {
    expect(buildAuditLogFilter({})).toEqual({})
  })
})
