import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import '@fontsource-variable/newsreader'

import { visionTool } from '@sanity/vision'
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { ToolMenu, Wordmark } from './components'
import { schemaTypes } from './schemaTypes'
import { structure } from './structure'
import { theme } from './theme'

export default defineConfig({
  name: 'default',
  title: 'recregt',
  icon: Wordmark,

  projectId: 'q2g9o9x3',
  dataset: 'production',

  theme,
  studio: { components: { toolMenu: ToolMenu } },

  plugins: [structureTool({ structure }), visionTool()],

  schema: {
    types: schemaTypes,
  },
})
