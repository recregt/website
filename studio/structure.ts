import { CalendarIcon } from '@sanity/icons/Calendar'
import { DocumentsIcon } from '@sanity/icons/Documents'
import { LinkRemovedIcon } from '@sanity/icons/LinkRemoved'
import { ProjectsIcon } from '@sanity/icons/Projects'
import type { StructureResolver } from 'sanity/structure'

const newestFirst = [{ field: 'publishedAt', direction: 'desc' as const }]

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.documentTypeListItem('project').title('Projects').icon(ProjectsIcon),
      S.divider(),
      S.listItem()
        .title('Posts')
        .icon(DocumentsIcon)
        .child(S.documentTypeList('post').title('Posts').defaultOrdering(newestFirst)),
      S.listItem()
        .title('Scheduled')
        .icon(CalendarIcon)
        .child(
          S.documentList()
            .title('Scheduled')
            .schemaType('post')
            .filter('_type == "post" && publishedAt > now()')
            .defaultOrdering(newestFirst),
        ),
      S.listItem()
        .title('Without a project')
        .icon(LinkRemovedIcon)
        .child(
          S.documentList()
            .title('Without a project')
            .schemaType('post')
            .filter('_type == "post" && count(coalesce(projects, [])) == 0')
            .defaultOrdering(newestFirst),
        ),
    ])
