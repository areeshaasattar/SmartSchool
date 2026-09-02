import { hasPermission, isRoleAllowed, permissionPolicy } from '../../src/middlewares/permissions/policy'

describe('Permission Policy', () => {
  describe('hasPermission', () => {
    it('should allow super_admin to create schools', () => {
      expect(hasPermission(['super_admin'], 'school:create')).toBe(true)
    })

    it('should deny school_admin from creating schools', () => {
      expect(hasPermission(['school_admin'], 'school:create')).toBe(false)
    })

    it('should deny teacher from creating schools', () => {
      expect(hasPermission(['teacher'], 'school:create')).toBe(false)
    })

    it('should allow school_admin to assign roles', () => {
      expect(hasPermission(['school_admin'], 'user:assign_role')).toBe(true)
    })

    it('should deny teacher from assigning roles', () => {
      expect(hasPermission(['teacher'], 'user:assign_role')).toBe(false)
    })

    it('should allow principal to list users', () => {
      expect(hasPermission(['principal'], 'user:list')).toBe(true)
    })

    it('should deny student from listing users', () => {
      expect(hasPermission(['student'], 'user:list')).toBe(false)
    })

    it('should allow multiple roles to grant access', () => {
      expect(hasPermission(['teacher', 'student'], 'attendance:mark')).toBe(true)
      expect(hasPermission(['teacher', 'student'], 'attendance:read')).toBe(true)
    })

    it('should deny unknown permission action', () => {
      expect(hasPermission(['super_admin'], 'nonexistent:action')).toBe(false)
    })

    it('should allow accountant to manage finance', () => {
      expect(hasPermission(['accountant'], 'finance:manage')).toBe(true)
    })

    it('should deny teacher from managing finance', () => {
      expect(hasPermission(['teacher'], 'finance:manage')).toBe(false)
    })

    it('should allow transport_manager to manage transport', () => {
      expect(hasPermission(['transport_manager'], 'transport:manage')).toBe(true)
    })

    it('should allow super_admin to read audit logs', () => {
      expect(hasPermission(['super_admin'], 'audit:read')).toBe(true)
    })

    it('should deny teacher from reading audit logs', () => {
      expect(hasPermission(['teacher'], 'audit:read')).toBe(false)
    })
  })

  describe('isRoleAllowed', () => {
    it('should return true for allowed role', () => {
      expect(isRoleAllowed('super_admin', 'school:create')).toBe(true)
    })

    it('should return false for disallowed role', () => {
      expect(isRoleAllowed('teacher', 'school:create')).toBe(false)
    })

    it('should return false for unknown action', () => {
      expect(isRoleAllowed('super_admin', 'unknown:action')).toBe(false)
    })
  })

  describe('permissionPolicy structure', () => {
    it('should have entries for school management', () => {
      expect(permissionPolicy['school:create']).toBeDefined()
      expect(permissionPolicy['school:list']).toBeDefined()
      expect(permissionPolicy['school:read']).toBeDefined()
      expect(permissionPolicy['school:update']).toBeDefined()
    })

    it('should have entries for user management', () => {
      expect(permissionPolicy['user:list']).toBeDefined()
      expect(permissionPolicy['user:read']).toBeDefined()
      expect(permissionPolicy['user:assign_role']).toBeDefined()
    })

    it('should have stub entries for future modules', () => {
      expect(permissionPolicy['student:list']).toBeDefined()
      expect(permissionPolicy['attendance:mark']).toBeDefined()
      expect(permissionPolicy['exam:grade']).toBeDefined()
      expect(permissionPolicy['finance:manage']).toBeDefined()
      expect(permissionPolicy['transport:manage']).toBeDefined()
      expect(permissionPolicy['audit:read']).toBeDefined()
    })
  })
})
