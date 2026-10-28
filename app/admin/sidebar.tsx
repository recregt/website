import { BookOpen, Home, LayoutDashboard, LogOut, ScrollText } from 'lucide-react'
import { Form, Link, useLocation } from 'react-router'

import { Badge } from '~/components/ui/badge'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '~/components/ui/sidebar'

import type { User } from '../../server/schema.server'

export function AppSidebar({ user }: { user: User }) {
  const { pathname } = useLocation()
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <span className="font-mono text-sm tracking-tight">recregt</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[11px] tracking-widest uppercase">
            Platform
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={pathname === '/admin'} tooltip="Dashboard">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={pathname === '/admin/logs'} tooltip="Logs" asChild>
                  <Link to="/admin/logs">
                    <ScrollText />
                    <span>Logs</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Blog">
                  <Link to="/blog">
                    <BookOpen />
                    <span>Blog</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="View site">
                  <Link to="/">
                    <Home />
                    <span>View site</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between px-2">
              <p className="font-mono text-xs text-sidebar-foreground/80">@{user.handle}</p>
              <Badge variant="outline" className="font-mono text-[10px] tracking-wider uppercase">
                admin
              </Badge>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Form method="post" action="/signout">
              <button
                type="submit"
                className="flex h-8 w-full items-center gap-2 rounded-md p-2 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <LogOut className="size-4 shrink-0" />
                <span>Sign out</span>
              </button>
            </Form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
