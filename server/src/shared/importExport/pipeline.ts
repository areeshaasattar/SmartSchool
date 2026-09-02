import { randomUUID } from 'crypto'
import { z } from 'zod'

export interface InvalidImportRow { row: number; errors: string[]; data: Record<string, string> }
export interface ImportReport<T> { validRows: T[]; invalidRows: InvalidImportRow[]; duplicates: Array<{ row: number; value: string }> }
interface StoredImport<T> { expiresAt: number; schoolId: string; entity: string; rows: T[]; duplicates: Array<{ row: number; value: string }> }
const imports = new Map<string, StoredImport<unknown>>()

export async function runImport<T>({ schoolId, entity, rows, rowValidator, uniqueKey, exists }: { schoolId: string; entity: string; rows: Record<string, string>[]; rowValidator: z.ZodType<T>; uniqueKey: (row: T) => string; exists: (row: T) => Promise<boolean> }): Promise<ImportReport<T>> {
  const validRows: T[] = []; const invalidRows: InvalidImportRow[] = []; const duplicates: Array<{ row: number; value: string }> = []
  const seen = new Set<string>()
  for (const [index, raw] of rows.entries()) {
    const parsed = rowValidator.safeParse(raw)
    if (!parsed.success) { invalidRows.push({ row: index + 2, data: raw, errors: parsed.error.issues.map((issue) => `${issue.path.join('.') || 'row'}: ${issue.message}`) }); continue }
    const value = uniqueKey(parsed.data)
    if (seen.has(value) || await exists(parsed.data)) { duplicates.push({ row: index + 2, value }); continue }
    seen.add(value)
    validRows.push(parsed.data)
  }
  return { validRows, invalidRows, duplicates }
}

export function storeImport<T>(schoolId: string, entity: string, report: ImportReport<T>): string {
  const token = randomUUID(); imports.set(token, { schoolId, entity, rows: report.validRows, duplicates: report.duplicates, expiresAt: Date.now() + 15 * 60_000 }); return token
}
export function takeImport<T>(token: string, schoolId: string, entity: string): T[] {
  const stored = imports.get(token); imports.delete(token)
  if (!stored || stored.expiresAt < Date.now() || stored.schoolId !== schoolId || stored.entity !== entity) throw new Error('Import validation token is invalid or expired')
  return stored.rows as T[]
}
