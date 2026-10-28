import type { ReactNode } from 'react'
import { Link } from 'react-router'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb'
import { Separator } from '~/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '~/components/ui/sidebar'
import { cn } from '~/lib/utils'

import type { User } from '../../server/schema.server'
import type { Range } from './ranges'
import { ranges } from './ranges'
import { AppSidebar } from './sidebar'

export function AdminShell({
  user,
  crumb,
  children,
}: {
  user: User
  crumb?: string
  children: ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 h-4!" />
          <Breadcrumb>
            <BreadcrumbList className="font-mono text-xs">
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink asChild>
                  <Link to="/">recregt</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink asChild>
                  <Link to="/admin">admin</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {crumb && (
                <>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{crumb}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export function RangeTabs({ range }: { range: Range }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5">
      {Object.keys(ranges).map((option) => (
        <Link
          key={option}
          to={`?range=${option}`}
          aria-current={option === range ? 'page' : undefined}
          className={cn(
            'rounded-md px-2.5 py-1 font-mono text-xs transition-colors',
            option === range
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option}
        </Link>
      ))}
    </div>
  )
}
