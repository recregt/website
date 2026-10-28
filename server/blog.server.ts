import { createClient } from '@sanity/client'
import { defineQuery } from 'groq'

import { project } from '../app/blog/sanity'

const sanity = createClient({ ...project, apiVersion: '2026-10-28', useCdn: true })

const postsQuery = defineQuery(`
  *[_type == "post" && defined(slug.current) && publishedAt <= now()] | order(publishedAt desc) {
    "slug": slug.current, title, summary, publishedAt
  }
`)

const postQuery = defineQuery(`
  *[_type == "post" && slug.current == $slug && publishedAt <= now()][0] {
    title, summary, publishedAt, coverImage, body
  }
`)

export async function listPosts() {
  const posts = await sanity.fetch(postsQuery)
  return posts.map((post) => ({
    slug: published(post.slug, 'slug'),
    title: published(post.title, 'title'),
    summary: published(post.summary, 'summary'),
    publishedAt: new Date(published(post.publishedAt, 'publishedAt')),
  }))
}

export async function findPost(slug: string) {
  const post = await sanity.fetch(postQuery, { slug })
  if (!post) return null
  return {
    title: published(post.title, 'title'),
    summary: published(post.summary, 'summary'),
    publishedAt: new Date(published(post.publishedAt, 'publishedAt')),
    coverImage: post.coverImage,
    body: published(post.body, 'body'),
  }
}

export type Post = NonNullable<Awaited<ReturnType<typeof findPost>>>

function published<T>(value: T | null, field: string): T {
  if (value === null) throw new Error(`published post without ${field}`)
  return value
}
