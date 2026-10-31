import { defineArrayMember, defineField, defineType } from 'sanity'
import { isIncomingReferenceCreation } from 'sanity/structure'

import { body, coverImage, slug, summary, title } from './fields'

const date = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' })

export const post = defineType({
  name: 'post',
  type: 'document',
  fields: [
    title,
    slug,
    defineField({
      name: 'publishedAt',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),
    summary,
    defineField({
      name: 'projects',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'project' }] })],
      validation: (rule) => rule.unique(),
    }),
    coverImage,
    body,
  ],
  initialValue: (params) =>
    isIncomingReferenceCreation(params)
      ? { projects: [{ ...params.reference, _key: crypto.randomUUID() }] }
      : {},
  orderings: [
    {
      title: 'Newest first',
      name: 'publishedAtDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: {
      title: 'title',
      publishedAt: 'publishedAt',
      project: 'projects.0.title',
      projects: 'projects',
      media: 'coverImage',
    },
    prepare: ({ title, publishedAt, project, projects, media }) => {
      const others = Array.isArray(projects) ? projects.length - 1 : 0
      const parts = [
        publishedAt ? date.format(new Date(publishedAt)) : 'No date',
        project && (others > 0 ? `${project} +${others}` : project),
      ]
      return { title, subtitle: parts.filter(Boolean).join(' · '), media }
    },
  },
})
