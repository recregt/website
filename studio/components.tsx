import { LaunchIcon } from '@sanity/icons/Launch'
import { Button, Flex, Stack } from '@sanity/ui'
import type { ToolMenuProps } from 'sanity'

const site = 'https://recregt.com'

export function Wordmark() {
  return (
    <span
      style={{
        fontFamily: '"Newsreader Variable", serif',
        fontWeight: 500,
        lineHeight: 1,
      }}
    >
      r
    </span>
  )
}

export function ToolMenu(props: ToolMenuProps) {
  const sidebar = props.context === 'sidebar'
  const Layout = sidebar ? Stack : Flex
  return (
    <Layout gap={1}>
      {props.renderDefault(props)}
      <Button
        as="a"
        href={site}
        target="_blank"
        rel="noreferrer"
        mode="bleed"
        icon={LaunchIcon}
        text="View site"
        justify={sidebar ? 'flex-start' : 'center'}
      />
    </Layout>
  )
}
