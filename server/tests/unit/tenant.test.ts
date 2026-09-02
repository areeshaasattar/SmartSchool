import { resolveTenant } from '../../src/middlewares/tenant/resolveTenant'
import mongoose from 'mongoose'

function mockReq(overrides: Record<string, unknown> = {}) {
  return {
    user: null as unknown,
    headers: {} as Record<string, string>,
    tenantId: undefined as string | undefined,
    ...overrides,
  } as any
}

function mockRes() {
  const res: any = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('resolveTenant middleware', () => {
  const schoolId1 = new mongoose.Types.ObjectId().toString()
  const schoolId2 = new mongoose.Types.ObjectId().toString()

  it('should reject unauthenticated requests', () => {
    const req = mockReq({ user: undefined })
    const res = mockRes()
    const next = jest.fn()

    resolveTenant(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('should require X-School-Id header for non-super_admin', () => {
    const req = mockReq({
      user: { roles: ['teacher'], schoolIds: [schoolId1] },
      headers: {},
    })
    const res = mockRes()
    const next = jest.fn()

    resolveTenant(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('should reject invalid ObjectId format', () => {
    const req = mockReq({
      user: { roles: ['teacher'], schoolIds: [schoolId1] },
      headers: { 'x-school-id': 'invalid-id' },
    })
    const res = mockRes()
    const next = jest.fn()

    resolveTenant(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })

  it('should reject when school is not in user schoolIds', () => {
    const req = mockReq({
      user: { roles: ['teacher'], schoolIds: [schoolId1] },
      headers: { 'x-school-id': schoolId2 },
    })
    const res = mockRes()
    const next = jest.fn()

    resolveTenant(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('should accept valid school in user schoolIds', () => {
    const req = mockReq({
      user: { roles: ['teacher'], schoolIds: [schoolId1] },
      headers: { 'x-school-id': schoolId1 },
    })
    const res = mockRes()
    const next = jest.fn()

    resolveTenant(req, res, next)

    expect(req.tenantId).toBe(schoolId1)
    expect(next).toHaveBeenCalled()
  })

  it('should allow super_admin without X-School-Id header', () => {
    const req = mockReq({
      user: { roles: ['super_admin'], schoolIds: [] },
      headers: {},
    })
    const res = mockRes()
    const next = jest.fn()

    resolveTenant(req, res, next)

    expect(req.tenantId).toBeUndefined()
    expect(next).toHaveBeenCalled()
  })

  it('should allow super_admin with any X-School-Id', () => {
    const req = mockReq({
      user: { roles: ['super_admin'], schoolIds: [] },
      headers: { 'x-school-id': schoolId2 },
    })
    const res = mockRes()
    const next = jest.fn()

    resolveTenant(req, res, next)

    expect(req.tenantId).toBe(schoolId2)
    expect(next).toHaveBeenCalled()
  })

  it('should accept school_admin with valid school', () => {
    const req = mockReq({
      user: { roles: ['school_admin'], schoolIds: [schoolId1, schoolId2] },
      headers: { 'x-school-id': schoolId2 },
    })
    const res = mockRes()
    const next = jest.fn()

    resolveTenant(req, res, next)

    expect(req.tenantId).toBe(schoolId2)
    expect(next).toHaveBeenCalled()
  })
})
