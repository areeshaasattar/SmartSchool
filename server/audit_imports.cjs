const fs = require('fs')
const path = require('path')

function scanDir(root, list) {
  let entries
  try {
    entries = fs.readdirSync(root, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    const cur = path.join(root, e.name)
    if (e.isDirectory()) {
      scanDir(cur, list)
    } else if (/\.ts$/.test(e.name) || /\.js$/.test(e.name)) {
      list.push(cur)
    }
  }
}

function analyzeFile(file) {
  const s = fs.readFileSync(file, 'utf8')
  const res = []
  const rx = /from\s+['"`]([^'`;]+)['"`]/g
  let m
  while ((m = rx.exec(s))) {
    const v = m[1]
    if (!v || !/^\.\.?(\/|$)/.test(v)) continue
    res.push(v)
  }
  return res
}

const files = []
scanDir('server/src', files)
scanDir('ai-service/app', files)

const problems = []
files.forEach((file) => {
  const imports = analyzeFile(file)
  const dir = path.dirname(file)
  imports.forEach((v) => {
    const resolved = path.resolve(dir, v)
    const ex1 = fs.existsSync(resolved)
    const ex2 = fs.existsSync(resolved + '.ts')
    const ex3 = fs.existsSync(resolved.replace(/\.js$/, '.ts'))
    if (!ex1 && !ex2 && !ex3) {
      problems.push({ file, import: v, resolved })
    }
  })
})

console.log('FILES_SCANNED=' + files.length)
console.log('PROBLEMS=' + problems.length)
problems.forEach((p) => {
  console.log('PROBLEM ' + p.file)
  console.log('  import: ' + p.import)
  console.log('  resolved: ' + p.resolved)
})

if (problems.length === 0) {
  console.log('NO_BROKEN_LOCAL_IMPORTS')
}
