import { DurableObject, env } from 'cloudflare:workers'

const port = 8080
const startupRetryMs = 100

export class ParvusContainer extends DurableObject<Env> {
  private booting: Promise<void> | null = null

  override async fetch(request: Request): Promise<Response> {
    const container = this.container()
    await this.ready(container)
    return container.getTcpPort(port).fetch(request)
  }

  private ready(container: Container): Promise<void> {
    if (container.running && !this.booting) return Promise.resolve()
    this.booting ??= boot(container).finally(() => {
      this.booting = null
    })
    return this.booting
  }

  private container(): Container {
    const container = this.ctx.container
    if (!container) throw new Error('ParvusContainer has no container attached')
    return container
  }
}

async function boot(container: Container): Promise<void> {
  if (!container.running) {
    const image = container.images.parvus
    if (!image) throw new Error('wrangler.jsonc declares no parvus image')
    container.start({
      image,
      enableInternet: true,
      env: {
        PARVUS_LISTEN: `0.0.0.0:${port}`,
        PARVUS_SECRET: env.PARVUS_SECRET,
        PARVUS_PEPPER: env.PARVUS_PEPPER,
        PARVUS_DB: env.PARVUS_DB,
        PARVUS_RP_ID: env.PARVUS_RP_ID,
        PARVUS_RP_NAME: env.PARVUS_RP_NAME,
        PARVUS_ORIGINS: env.PARVUS_ORIGINS,
        PARVUS_MAX_CREDENTIALS: env.PARVUS_MAX_CREDENTIALS,
      },
    })
  }

  let exited = false
  container
    .monitor()
    .catch(() => {})
    .finally(() => {
      exited = true
    })

  while (!exited) {
    if (await healthy(container)) return
    await scheduler.wait(startupRetryMs)
  }
  throw new Error('parvus exited while starting')
}

async function healthy(container: Container): Promise<boolean> {
  try {
    const response = await container.getTcpPort(port).fetch('http://parvus/healthz')
    return response.status === 204
  } catch {
    return false
  }
}
