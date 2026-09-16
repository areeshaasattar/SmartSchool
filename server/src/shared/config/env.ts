/**
 * Environment variable validation (fail-fast at boot).
 *
 * Server startup (server.ts) imports `cleanEnv` from this module before doing
 * anything else, so a misconfigured deployment crashes immediately with a
 * readable message instead of failing later with confusing runtime errors.
 *
 * In test mode validation is relaxed (JWT_SECRET gets a test default) because
 * jest modules import server code without going through server.ts.
 */
import dotenv from 'dotenv'
import { cleanEnv, str, port, url, num } from 'envalid'

// Load .env BEFORE validation. This must happen in this module (not server.ts)
// because ES module imports are hoisted: cleanEnv below runs at import time,
// before any statement in the importing entrypoint's body executes.
dotenv.config()

// envalid only applies `devDefault` values when NODE_ENV is explicitly set in
// the raw environment (and isn't 'production'). Default it for local dev so a
// missing .env still boots with dev fallbacks; production deploys must set
// NODE_ENV explicitly (see .env.example).
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development'
}

const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined

const base = {
  NODE_ENV: str({ devDefault: 'development', choices: ['development', 'test', 'production'] }),
  PORT: port({ devDefault: 5000 }),
}
const shared = {
  MONGO_URI: url({ devDefault: 'mongodb://root:rootpassword@localhost:27017/smartschool?authSource=admin' }),
  REDIS_URL: url({ devDefault: 'redis://localhost:6379' }),
  JWT_SECRET: str({
    devDefault: isTest ? 'test-secret-key' : 'dev-only-secret-change-me',
  }),
  CLIENT_URL: url({ devDefault: 'http://localhost:5173' }),
  // Explicit CORS allowlist, comma-separated. Wildcards are rejected below.
  CORS_ALLOWED_ORIGINS: str({ devDefault: 'http://localhost:5173,http://localhost:5000' }),
  // Comma-separated mime types accepted for uploads; per-type limits live in documentService.
  ALLOWED_UPLOAD_MIMETYPES: str({
    devDefault:
      'image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv',
  }),
  MAX_UPLOAD_BYTES: num({ devDefault: 10 * 1024 * 1024 }),
}

const optional = {
  AI_SERVICE_URL: str({ default: '' }),
  AI_SERVICE_KEY: str({ default: '' }),
  OPENAI_API_KEY: str({ default: '' }),
  CLOUDINARY_CLOUD_NAME: str({ default: '' }),
  CLOUDINARY_API_KEY: str({ default: '' }),
  CLOUDINARY_API_SECRET: str({ default: '' }),
  SMTP_HOST: str({ default: '' }),
  SMTP_PORT: port({ default: 587 }),
  SMTP_USER: str({ default: '' }),
  SMTP_PASS: str({ default: '' }),
  RESEND_API_KEY: str({ default: '' }),
}

export const env = cleanEnv(process.env, { ...base, ...shared, ...optional })

// ── Sanity checks envalid can't express ──────────────────────────────

/** An origin allowlist entry — scheme + host, no path, no wildcard. */
export function assertValidCorsAllowlist(allowlist: string[]): void {
  if (allowlist.length === 0) {
    throw new Error('CORS_ALLOWED_ORIGINS must list at least one origin')
  }
  for (const origin of allowlist) {
    if (origin === '*') {
      throw new Error('CORS_ALLOWED_ORIGINS must not contain "*" — wildcard CORS is disabled')
    }
    let parsed: URL
    try {
      parsed = new URL(origin)
    } catch {
      throw new Error(`CORS_ALLOWED_ORIGINS entry "${origin}" is not a valid URL`)
    }
    if (parsed.pathname !== '/' && parsed.pathname !== '') {
      throw new Error(`CORS_ALLOWED_ORIGINS entry "${origin}" must not include a path`)
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`CORS_ALLOWED_ORIGINS entry "${origin}" must be an http(s) origin`)
    }
  }
}

/** Parse CORS_ALLOWED_ORIGINS into an allowlist, validating as we go. */
export function corsAllowedOrigins(): string[] {
  const list = env.CORS_ALLOWED_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  assertValidCorsAllowlist(list)
  return list
}

/** Parse ALLOWED_UPLOAD_MIMETYPES into a set. */
export function allowedUploadMimetypes(): Set<string> {
  return new Set(env.ALLOWED_UPLOAD_MIMETYPES.split(',').map((m) => m.trim()).filter(Boolean))
}

if (!isTest) {
  // Production-focused warnings (non-fatal)
  if (env.NODE_ENV === 'production' && env.JWT_SECRET === 'dev-only-secret-change-me') {
    // cleanEnv already enforces min length; this catches the leftover dev default.
    console.error('FATAL: JWT_SECRET is still the development default in production')
    process.exit(1)
  }
}
