import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import tenantRules from './eslint-rules/require-tenant-filter.cjs'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'eslint-rules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    plugins: {
      tenant: tenantRules,
    },
    rules: {
      'tenant/require-tenant-filter': 'error',
    },
  },
)
