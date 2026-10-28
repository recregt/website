import { env } from 'cloudflare:workers'
import { Container } from '@cloudflare/containers'

const port = 8080

export class ParvusContainer extends Container {
  override defaultPort = port
  override envVars = {
    PARVUS_LISTEN: `0.0.0.0:${port}`,
    PARVUS_SECRET: env.PARVUS_SECRET,
    PARVUS_PEPPER: env.PARVUS_PEPPER,
    PARVUS_DB: env.PARVUS_DB,
    PARVUS_RP_ID: env.PARVUS_RP_ID,
    PARVUS_RP_NAME: env.PARVUS_RP_NAME,
    PARVUS_ORIGINS: env.PARVUS_ORIGINS,
    PARVUS_MAX_CREDENTIALS: env.PARVUS_MAX_CREDENTIALS,
  }
}
