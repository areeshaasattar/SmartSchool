import XLSX from 'xlsx'
import { z } from 'zod'
import { parseSpreadsheet } from '../../src/shared/importExport/spreadsheet.js'
import { runImport, storeImport, takeImport } from '../../src/shared/importExport/pipeline.js'

describe('import/export infrastructure', () => {
  it('parses CSV and XLSX rows', () => {
    const csvRows = parseSpreadsheet(Buffer.from('code,name\nA1,Ada\n'))
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ code: 'B2', name: 'Alan' }]), 'Import')
    const xlsxRows = parseSpreadsheet(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }))
    expect(csvRows).toEqual([{ code: 'A1', name: 'Ada' }]); expect(xlsxRows).toEqual([{ code: 'B2', name: 'Alan' }])
  })

  it('collects validation errors and duplicates without fail-fast behavior', async () => {
    const report = await runImport({ schoolId: 'school', entity: 'sample', rows: [{ code: '' }, { code: 'taken' }, { code: 'ok' }], rowValidator: z.object({ code: z.string().min(1, 'Code is required') }), uniqueKey: (row) => row.code, exists: async (row) => row.code === 'taken' })
    expect(report.validRows).toEqual([{ code: 'ok' }]); expect(report.invalidRows[0].errors[0]).toContain('Code is required'); expect(report.duplicates).toEqual([{ row: 3, value: 'taken' }])
  })

  it('binds confirmation tokens to the entity and tenant', () => {
    const token = storeImport('school-a', 'student', { validRows: [{ code: 'A1' }], invalidRows: [], duplicates: [] })
    expect(takeImport(token, 'school-a', 'student')).toEqual([{ code: 'A1' }]); expect(() => takeImport(token, 'school-a', 'student')).toThrow('invalid or expired')
  })
})
