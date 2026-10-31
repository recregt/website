import { defineArrayMember, defineField } from 'sanity'

const alt = defineField({
  name: 'alt',
  title: 'Alternative Text',
  type: 'string',
  validation: (rule) => rule.required(),
})

export const title = defineField({
  name: 'title',
  type: 'string',
  validation: (rule) => rule.required(),
})

export const slug = defineField({
  name: 'slug',
  type: 'slug',
  options: { source: 'title' },
  validation: (rule) => rule.required(),
})

export const summary = defineField({
  name: 'summary',
  type: 'text',
  rows: 3,
  validation: (rule) => rule.required().max(200),
})

export const coverImage = defineField({
  name: 'coverImage',
  type: 'image',
  options: { hotspot: true },
  fields: [alt],
})

export const body = defineField({
  name: 'body',
  type: 'array',
  of: [
    defineArrayMember({ type: 'block' }),
    defineArrayMember({ type: 'image', options: { hotspot: true }, fields: [alt] }),
  ],
  validation: (rule) => rule.required(),
})
