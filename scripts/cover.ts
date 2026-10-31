import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

import { chromium } from 'playwright-core'

import { cover } from '../app/content/sanity.ts'
import { draw } from './cover-art.ts'

const size = { width: cover.width, height: cover.height }

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { out: { type: 'string', default: '.covers' }, style: { type: 'string' } },
})
if (positionals.length === 0) {
  console.error('usage: cover [--out dir] [--style name] <name>...')
  process.exit(1)
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  chromiumSandbox: false,
})
await mkdir(values.out, { recursive: true })
const page = await browser.newPage({ viewport: size, deviceScaleFactor: cover.density })

for (const seed of positionals) {
  await page.setContent('<body style="margin:0"></body>')
  const { style, accent } = await page.evaluate(draw, {
    seed,
    ...size,
    density: cover.density,
    style: values.style,
  })
  const name = [seed, values.style].filter(Boolean).join('-')
  const file = join(values.out, `${name.replace(/[^a-z0-9-]+/gi, '-')}.png`)
  await page.locator('canvas').screenshot({ path: file })
  console.log(`${file} ${style} ${accent}`)
}

await browser.close()
