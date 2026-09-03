import { readFileSync } from 'node:fs'
import { scan } from '../src/scan'

for (const path of process.argv.slice(2)) {
  const started = performance.now()
  const result = scan(new Uint8Array(readFileSync(path)))
  const ms = (performance.now() - started).toFixed(0)

  console.log(`\n########## ${path}  (${ms}ms, ${result.fileCount} files, status=${result.status})`)
  if (result.rejection) console.log('  REJECTED:', JSON.stringify(result.rejection))
  console.log(`  checksPassed=${result.checksPassed} erroredRules=${result.erroredRules.join(',') || 'none'}`)

  for (const f of result.findings) {
    console.log(`\n  [${f.severity}/${f.basis}] ${f.ruleId}: ${f.title}`)
    console.log(`    why: ${f.why}`)
    console.log(`    fix: ${f.fix}`)
    if (f.evidence) {
      console.log(`    evidence: ${f.evidence.file} @${f.evidence.offset}`)
      console.log(`    excerpt: ${JSON.stringify(f.evidence.excerpt.slice(0, 220))}`)
    } else {
      console.log('    evidence: none')
    }
  }
  console.log('\n  justifications:', JSON.stringify(result.justifications).slice(0, 600))
}
