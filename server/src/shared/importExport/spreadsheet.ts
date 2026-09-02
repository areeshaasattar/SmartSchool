import XLSX from 'xlsx'
import PDFDocument from 'pdfkit'

export type ExportFormat = 'csv' | 'xlsx' | 'pdf'
export interface ExportColumn { key: string; label: string }

export function parseSpreadsheet(buffer: Buffer): Record<string, string>[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', raw: false })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) throw new Error('The uploaded spreadsheet has no worksheets')
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' }).map((row) =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim(), String(value).trim()])),
  )
}

export async function exportData({ format, columns, rows }: { format: ExportFormat; columns: ExportColumn[]; rows: Record<string, unknown>[] }): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
  const flatRows = rows.map((row) => Object.fromEntries(columns.map((column) => [column.label, String(row[column.key] ?? '')])))
  if (format === 'csv' || format === 'xlsx') {
    const worksheet = XLSX.utils.json_to_sheet(flatRows, { header: columns.map((column) => column.label) })
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, 'Export')
    return format === 'csv'
      ? { buffer: Buffer.from(XLSX.utils.sheet_to_csv(worksheet), 'utf8'), contentType: 'text/csv; charset=utf-8', extension: 'csv' }
      : { buffer: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extension: 'xlsx' }
  }
  const document = new PDFDocument({ layout: 'landscape', margin: 30 }); const chunks: Buffer[] = []
  document.on('data', (chunk: Buffer) => chunks.push(chunk)); const finished = new Promise<Buffer>((resolve) => document.on('end', () => resolve(Buffer.concat(chunks))))
  document.fontSize(14).text('SmartSchool Export'); document.moveDown(0.5); document.fontSize(8).text(columns.map((column) => column.label).join(' | '))
  rows.forEach((row) => document.text(columns.map((column) => String(row[column.key] ?? '')).join(' | ')))
  document.end(); return { buffer: await finished, contentType: 'application/pdf', extension: 'pdf' }
}
