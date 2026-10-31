import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

import { chromium } from 'playwright-core'

const viewports = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 844 },
}
const schemes = ['light', 'dark'] as const

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    base: { type: 'string', default: 'http://localhost:5173' },
    out: { type: 'string', default: '.screenshots' },
    state: { type: 'string' },
  },
})
const paths =
  positionals.length > 0
    ? positionals
    : ['/', '/projects', '/tools', '/blog', '/signin', '/stats', '/stats/requests']

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  chromiumSandbox: false,
})
await mkdir(values.out, { recursive: true })

for (const [device, viewport] of Object.entries(viewports)) {
  for (const colorScheme of schemes) {
    const page = await browser.newPage({
      viewport,
      colorScheme,
      reducedMotion: 'reduce',
      storageState: values.state,
    })
    for (const path of paths) {
      await page.goto(new URL(path, values.base).href, { waitUntil: 'load' })
      await page.waitForSelector('html[data-hydrated]', { state: 'attached' })
      await page.evaluate(async () => {
        await document.fonts.ready
        await new Promise((done) => requestAnimationFrame(done))
      })
      const file = join(values.out, `${slug(path)}.${device}.${colorScheme}.png`)
      await page.screenshot({ path: file, fullPage: true })
      console.log(file)
    }
    await page.close()
  }
}

await browser.close()

function slug(path: string): string {
  return path
    .replace(/^\/$/, 'home')
    .replace(/^\//, '')
    .replace(/[^a-z0-9]+/gi, '-')
}
