import { spawnSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { parseArgs } from 'node:util'

import { chromium } from 'playwright-core'

const { values } = parseArgs({
  options: {
    base: { type: 'string', default: 'http://localhost:5173' },
    state: { type: 'string', default: '.screenshots/session.json' },
  },
})

const handle = `review-${Date.now().toString(36)}`

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  chromiumSandbox: false,
})
const context = await browser.newContext()
const page = await context.newPage()
const devtools = await context.newCDPSession(page)
await devtools.send('WebAuthn.enable')
await devtools.send('WebAuthn.addVirtualAuthenticator', {
  options: {
    protocol: 'ctap2',
    transport: 'internal',
    hasResidentKey: true,
    hasUserVerification: true,
    isUserVerified: true,
    automaticPresenceSimulation: true,
  },
})

await page.goto(new URL('/signup', values.base).href)
await page.waitForSelector('html[data-hydrated]', { state: 'attached' })
await page.fill('#handle', handle)
await page.getByRole('button', { name: 'Continue with a passkey' }).click()
await page.getByLabel('I have saved this code').check()
await page.getByRole('button', { name: 'Sign in to finish' }).click()
await page.getByRole('button', { name: `@${handle}` }).waitFor()

const promoted = spawnSync(
  'pnpm',
  [
    'exec',
    'wrangler',
    'd1',
    'execute',
    'DB',
    '--local',
    '--command',
    `UPDATE users SET role = 'admin' WHERE handle = '${handle}'`,
  ],
  { encoding: 'utf8' },
)
if (promoted.status !== 0) throw new Error(`promoting ${handle} failed: ${promoted.stderr}`)

await mkdir(dirname(values.state), { recursive: true })
await context.storageState({ path: values.state })
await browser.close()
console.log(`signed in as local admin @${handle}, session saved to ${values.state}`)
