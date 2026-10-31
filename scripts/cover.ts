import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

import { chromium } from 'playwright-core'

import { coverWidth } from '../app/content/sanity.ts'
import { draw } from './cover-art.ts'

const size = { width: coverWidth, height: (coverWidth * 9) / 16 }

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { out: { type: 'string', default: '.covers' } },
})
if (positionals.length === 0) {
  console.error('usage: cover [--out dir] <name>...')
  process.exit(1)
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  chromiumSandbox: false,
})
await mkdir(values.out, { recursive: true })
const page = await browser.newPage({ viewport: size })

for (const seed of positionals) {
  await page.setContent('<body style="margin:0"></body>')
  const { style, accent } = await page.evaluate(draw, { seed, ...size })
  const file = join(values.out, `${seed.replace(/[^a-z0-9-]+/gi, '-')}.png`)
  await page.locator('canvas').screenshot({ path: file })
  console.log(`${file} ${style} ${accent}`)
}

await browser.close()
