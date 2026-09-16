/**
 * Custom ESLint rule: require-tenant-filter
 *
 * Flags `Model.find(...)`, `Model.findOne(...)`, `Model.findOneAndUpdate(...)`,
 * `Model.findOneAndDelete(...)`, `Model.countDocuments(...)` and
 * `Model.exists(...)` calls on tenant-owned models whose first argument omits
 * a `schoolId` key.
 *
 * Tenant-owned models are resolved by directory: any model imported from
 * `src/modules/<module>/models/...` is assumed to carry a schoolId, EXCEPT for
 * the models in PLATFORM_MODELS below (global/platform-level collections).
 *
 * This is a heuristic lint guard, not a proof — it catches the common
 * "forgot the tenant filter" mistake in direct call sites. Dynamic filters
 * built at runtime (`const query = {}; query.schoolId = ...`) are out of scope.
 */
'use strict'

/** Models that legitimately have no schoolId (platform-level or user-owned). */
const PLATFORM_MODELS = new Set(['User', 'Session', 'School', 'AIQueryLog', 'AuditLog'])

/** Method names that take a filter object as their first argument. */
const FILTERING_METHODS = new Set([
  'find',
  'findOne',
  'findOneAndUpdate',
  'findOneAndDelete',
  'findOneAndReplace',
  'countDocuments',
  'exists',
])

/** Import sources that mark a variable as a tenant-owned mongoose model. */
const MODEL_IMPORT_RE = /\/models\/([A-Za-z0-9_$]+)(?:\.js)?['"]$/

module.exports = {
  rules: {
    'require-tenant-filter': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Require schoolId filter on tenant-owned model queries',
        },
        schema: [],
        messages: {
          missingSchoolId:
            "'{{ model }}.{{ method }}()' on a tenant-owned model must include a 'schoolId' filter (from req.tenantId or an authenticated context) — client-supplied IDs are not tenant isolation.",
        },
      },
      create(context) {
        /** model local name -> is tenant-owned? */
        const modelVars = new Map()

        return {
          ImportDeclaration(node) {
            const source = node.source.value
            if (typeof source !== 'string') return
            for (const spec of node.specifiers) {
              if (spec.type !== 'ImportSpecifier' || !spec.imported) continue
              const local = spec.local.name
              const importedName = spec.imported.name || spec.imported.value
              const match = MODEL_IMPORT_RE.exec(source)
              if (match) {
                modelVars.set(local, match[1] !== undefined && !PLATFORM_MODELS.has(match[1]))
              } else if (importedName && PLATFORM_MODELS.has(importedName)) {
                modelVars.set(local, false)
              }
            }
          },

          CallExpression(node) {
            const callee = node.callee
            if (callee.type !== 'MemberExpression') return
            if (callee.property.type !== 'Identifier') return
            const method = callee.property.name
            if (!FILTERING_METHODS.has(method)) return

            // Resolve the object: Identifier (Model.find) or await import(...) — keep it simple: identifiers only.
            if (callee.object.type !== 'Identifier') return
            const modelName = callee.object.name
            const isTenantOwned = modelVars.get(modelName)
            if (isTenantOwned === undefined) return // not a tracked model import

            const firstArg = node.arguments[0]
            if (!firstArg) {
              // find() with no filter = full collection scan — flag it.
              context.report({ node, messageId: 'missingSchoolId', data: { model: modelName, method } })
              return
            }
            if (firstArg.type === 'ObjectExpression') {
              const hasSchoolId = firstArg.properties.some(
                (prop) =>
                  prop.type === 'Property' &&
                  ((prop.key.type === 'Identifier' && prop.key.name === 'schoolId') ||
                    (prop.key.type === 'Literal' && prop.key.value === 'schoolId')),
              )
              if (!hasSchoolId) {
                context.report({ node, messageId: 'missingSchoolId', data: { model: modelName, method: method } })
              }
              return
            }
            // Non-literal filter (spread, variable) — cannot prove schoolId present.
            // Report to keep the reviewer honest; add to the allowlist if verified.
            context.report({
              node,
              messageId: 'missingSchoolId',
              data: { model: modelName, method },
            })
          },
        }
      },
    },
  },
}
