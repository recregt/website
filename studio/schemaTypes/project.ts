import { defineArrayMember, defineField, defineType } from 'sanity'
import { defineIncomingReferenceDecoration } from 'sanity/structure'

import { body, coverImage, slug, summary, title } from './fields'

type Linked = { _ref: string; _key: string }

const posts = defineIncomingReferenceDecoration({
  name: 'posts',
  title: 'Posts',
  description: 'Posts about this project.',
  types: [{ type: 'post' }],
  onLinkDocument: (document, reference) => {
    const linked = (document.projects ?? []) as Linked[]
    if (linked.some((entry) => entry._ref === reference._ref)) return false
    return { ...document, projects: [...linked, { ...reference, _key: crypto.randomUUID() }] }
  },
})

export const statuses = [
  { title: 'Active', value: 'active' },
  { title: 'Archived', value: 'archived' },
]

export const project = defineType({
  name: 'project',
  type: 'document',
  fields: [
    title,
    slug,
    summary,
    defineField({
      name: 'year',
      type: 'number',
      validation: (rule) => rule.required().integer(),
    }),
    defineField({
      name: 'status',
      type: 'string',
      options: { list: statuses, layout: 'radio', direction: 'horizontal' },
      initialValue: 'active',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'featured',
      type: 'boolean',
      description: 'Show on the home page.',
      initialValue: false,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'stack',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      options: { layout: 'tags' },
    }),
    defineField({ name: 'repository', type: 'url' }),
    defineField({ name: 'website', type: 'url' }),
    coverImage,
    body,
  ],
  renderMembers: (members) => [...members, posts],
  orderings: [
    { title: 'Newest first', name: 'yearDesc', by: [{ field: 'year', direction: 'desc' }] },
  ],
  preview: {
    select: {
      title: 'title',
      year: 'year',
      status: 'status',
      featured: 'featured',
      media: 'coverImage',
    },
    prepare: ({ title, year, status, featured, media }) => {
      const label = statuses.find((option) => option.value === status)?.title
      const parts = [year, label, featured && 'Featured']
      return { title, subtitle: parts.filter(Boolean).join(' · '), media }
    },
  },
})
