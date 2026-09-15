import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const rx = /from\s+['`"`]([^'`;]+)['`"`]/g

function walk(p) {
  let entries
  try {
    entries = readFileSync(p, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const cur = join(p, entry.name)
    if (entry.isDirectory()) {
      walk(cur)
    } else if (/\.ts$/.test(entry.name)) {
      const s = readFileSync(cur, 'utf8')
      let m
      while ((m = rx.exec(s))) {
        const v = m[1]
        if (!v || !/^(\.\.?\/)/.test(v)) continue
        const t = resolve(dirname(cur), v)
        const candidate = /\.ts$|\.js$|\.json$/i.test(v) ? t : `${t}.ts`
        if (!existsSync(t) && existsSync(candidate)) {
          console.log('BROKEN ' + cur.replace(/^[\\/]/, ''))
          console.log('  from: ' + v)
          console.log('  to  : ' + candidate.replace(/^[\\/]/, ''))
        }
      }
    }
  }
}

walk('src')
