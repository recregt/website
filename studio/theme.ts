import { buildLegacyTheme } from 'sanity'

const zinc = { 950: '#09090b', 500: '#71717a' }
const emerald = '#047857'

export const theme = buildLegacyTheme({
  '--font-family-base': '"Geist Variable", sans-serif',
  '--font-family-monospace': '"Geist Mono Variable", monospace',
  '--black': zinc[950],
  '--white': '#ffffff',
  '--gray': zinc[500],
  '--gray-base': zinc[500],
  '--component-bg': '#ffffff',
  '--component-text-color': zinc[950],
  '--brand-primary': emerald,
  '--focus-color': emerald,
  '--main-navigation-color': zinc[950],
  '--main-navigation-color--inverted': '#ffffff',
  '--default-button-color': zinc[500],
  '--default-button-primary-color': emerald,
  '--default-button-success-color': emerald,
  '--default-button-warning-color': '#b45309',
  '--default-button-danger-color': '#dc2626',
  '--state-info-color': '#64748b',
  '--state-success-color': emerald,
  '--state-warning-color': '#b45309',
  '--state-danger-color': '#dc2626',
})
