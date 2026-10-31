import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'q2g9o9x3',
    dataset: 'production',
  },
  typegen: {
    path: '../{app,server}/**/*.{ts,tsx}',
    schema: 'schema.json',
    generates: '../sanity.types.ts',
    overloadClientMethods: true,
  },
  deployment: { autoUpdates: false },
})
