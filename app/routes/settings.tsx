import { data, Form, redirect, useFetcher, useNavigation } from 'react-router'

import { Page } from '~/components/page'
import { PageHeader } from '~/components/page-header'
import { Section } from '~/components/section'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

import { requireUser } from '../../server/access.server'
import * as parvus from '../../server/parvus/client.server'
import { clearCookie, sessionCookie } from '../../server/session.server'
import { findAccount, renameAccount } from '../../server/users.server'
import { handleRules, normalizeHandle } from '../auth/protocol'
import { postDate } from '../blog/list'
import type { Route } from './+types/settings'

type RenameError = 'invalid_handle' | 'handle_taken'

const renameErrors: Record<RenameError, string> = {
  invalid_handle: handleRules,
  handle_taken: 'That handle is taken.',
}

export const meta: Route.MetaFunction = () => [
  { title: 'Settings · recregt' },
  { name: 'robots', content: 'noindex' },
]

export async function loader({ context }: Route.LoaderArgs) {
  const user = requireUser(context)
  const account = await findAccount(user.id)
  if (!account) throw data(null, { status: 401 })
  return { handle: account.handle, memberSince: account.createdAt }
}

export async function action({ context, request }: Route.ActionArgs) {
  const user = requireUser(context)
  const form = await request.formData()
  const intent = form.get('intent')

  if (intent === 'rename') {
    const handle = normalizeHandle(String(form.get('handle') ?? ''))
    if (!handle) return renameFailed('invalid_handle')
    if (handle !== user.handle && !(await renameAccount(user.id, handle)))
      return renameFailed('handle_taken')
    return { saved: handle }
  }

  if (intent === 'sign-out-everywhere') {
    await parvus.logoutAll(user.id)
    return redirect('/', { headers: { 'set-cookie': await clearCookie(sessionCookie) } })
  }

  throw data(null, { status: 400 })
}

function renameFailed(error: RenameError) {
  return data({ error }, { status: error === 'handle_taken' ? 409 : 400 })
}

export default function Settings({ loaderData: { handle, memberSince } }: Route.ComponentProps) {
  return (
    <Page narrow>
      <PageHeader title="Settings" description="Your account on recregt." />

      <Section title="Profile">
        <dl className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <dt className="text-sm font-medium">Handle</dt>
            <dd>
              <HandleForm handle={handle} />
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-sm font-medium">Member since</dt>
            <dd className="text-sm text-muted-foreground">{postDate.format(memberSince)}</dd>
          </div>
        </dl>
      </Section>

      <Section title="Sessions">
        <div className="flex flex-col items-start gap-4">
          <p className="text-sm text-muted-foreground">
            Sign out on every device where you are signed in, including this one. You will need your
            passkey to sign back in.
          </p>
          <SignOutEverywhere />
        </div>
      </Section>
    </Page>
  )
}

function HandleForm({ handle }: { handle: string }) {
  const fetcher = useFetcher<typeof action>()
  const busy = fetcher.state !== 'idle'
  const result = fetcher.data
  return (
    <fetcher.Form method="post" className="flex flex-col gap-2">
      <input type="hidden" name="intent" value="rename" />
      <div className="flex max-w-md gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
            @
          </span>
          <Input
            name="handle"
            aria-label="Handle"
            defaultValue={handle}
            required
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            className="h-10 pl-7"
          />
        </div>
        <Button type="submit" variant="outline" className="h-10" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
      </div>
      {result && 'error' in result ? (
        <p role="alert" className="text-sm text-destructive">
          {renameErrors[result.error]}
        </p>
      ) : result ? (
        <p role="status" className="text-sm text-success">
          Saved. You are now @{result.saved}.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">{handleRules}</p>
      )}
    </fetcher.Form>
  )
}

function SignOutEverywhere() {
  const navigation = useNavigation()
  const busy = navigation.formData?.get('intent') === 'sign-out-everywhere'
  return (
    <Form method="post">
      <input type="hidden" name="intent" value="sign-out-everywhere" />
      <Button type="submit" variant="outline" disabled={busy}>
        {busy ? 'Signing out…' : 'Sign out of all devices'}
      </Button>
    </Form>
  )
}
