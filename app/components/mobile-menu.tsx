import { Menu, X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { type ReactNode, useState } from 'react'
import { Form, NavLink, useLocation } from 'react-router'

import { container } from '~/components/page'
import { cn } from '~/lib/utils'

import type { User } from '../../server/schema.server'
import { signInHref } from '../auth/next'

export function MobileMenu({ user }: { user: User | null }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  const { pathname, search } = useLocation()
  const here = pathname === '/signin' || pathname === '/signup' ? '/' : `${pathname}${search}`

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className="-mr-2 flex size-10 items-center justify-center rounded-md hover:bg-muted sm:hidden"
        >
          <Menu className="size-5" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex flex-col bg-background motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0 sm:hidden"
        >
          <Dialog.Title className="sr-only">Menu</Dialog.Title>
          <div className="border-b border-border">
            <div className={cn(container, 'flex h-14 items-center justify-between')}>
              <span className="font-heading text-xl font-medium tracking-tight">recregt</span>
              <Dialog.Close
                aria-label="Close menu"
                className="-mr-2 flex size-10 items-center justify-center rounded-md hover:bg-muted"
              >
                <X className="size-5" />
              </Dialog.Close>
            </div>
          </div>
          <nav aria-label="Main" className={cn(container, 'flex flex-1 flex-col gap-8 py-8')}>
            <ul className="flex flex-col gap-1">
              <Item to="/" onSelect={close}>
                Home
              </Item>
              <Item to="/projects" onSelect={close}>
                Projects
              </Item>
              <Item to="/blog" onSelect={close}>
                Blog
              </Item>
              <Item to="/stats" onSelect={close}>
                Stats
              </Item>
            </ul>
            <div className="flex flex-col gap-1 border-t border-border pt-6">
              {user ? (
                <>
                  <p className="px-3 pb-2 text-sm text-muted-foreground">
                    Signed in as <span className="text-foreground">@{user.handle}</span>
                  </p>
                  <ul className="flex flex-col gap-1">
                    <Item to="/settings" onSelect={close}>
                      Settings
                    </Item>
                  </ul>
                  <Form method="post" action="/signout" onSubmit={close}>
                    <button
                      type="submit"
                      className="w-full rounded-md px-3 py-3 text-left text-lg text-destructive hover:bg-muted"
                    >
                      Sign out
                    </button>
                  </Form>
                </>
              ) : (
                <ul className="flex flex-col gap-1">
                  <Item to={signInHref(here)} onSelect={close}>
                    Sign in
                  </Item>
                  <Item to="/signup" onSelect={close}>
                    Create an account
                  </Item>
                </ul>
              )}
            </div>
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Item({
  to,
  onSelect,
  children,
}: {
  to: string
  onSelect: () => void
  children: ReactNode
}) {
  return (
    <li>
      <NavLink
        to={to}
        end
        viewTransition
        onClick={onSelect}
        className={({ isActive }) =>
          cn(
            'block rounded-md px-3 py-3 text-lg transition-colors hover:bg-muted',
            isActive ? 'font-medium text-foreground' : 'text-muted-foreground',
          )
        }
      >
        {children}
      </NavLink>
    </li>
  )
}
