import { createClient } from '@sanity/client'
import { defineQuery } from 'groq'

import { sanityConfig } from '../app/content/sanity'
import type { PostsQueryResult } from '../sanity.types'

const sanity = createClient({ ...sanityConfig, apiVersion: '2026-10-28', useCdn: true })

const postsQuery = defineQuery(`
  *[_type == "post" && defined(slug.current) && publishedAt <= now()] | order(publishedAt desc) {
    "slug": slug.current, title, summary, publishedAt,
    "projects": projects[]->{ "slug": slug.current, title }
  }
`)

const postQuery = defineQuery(`
  *[_type == "post" && slug.current == $slug && publishedAt <= now()][0] {
    title, summary, publishedAt, coverImage, body,
    "projects": projects[]->{
      "slug": slug.current, title,
      "posts": *[
        _type == "post" && references(^._id) && _id != ^.^._id
        && defined(slug.current) && publishedAt <= now()
      ] | order(publishedAt desc) {
        "slug": slug.current, title, summary, publishedAt,
        "projects": projects[]->{ "slug": slug.current, title }
      }
    }
  }
`)

const projectsQuery = defineQuery(`
  *[_type == "project" && defined(slug.current)] {
    "slug": slug.current, title, summary, year, status, featured,
    "posts": count(*[_type == "post" && references(^._id) && defined(slug.current) && publishedAt <= now()]),
    "lastPostAt": *[
      _type == "post" && references(^._id) && defined(slug.current) && publishedAt <= now()
    ] | order(publishedAt desc)[0].publishedAt
  }
`)

const projectQuery = defineQuery(`
  *[_type == "project" && slug.current == $slug][0] {
    title, summary, year, status, stack, repository, website, coverImage, body,
    "posts": *[
      _type == "post" && references(^._id) && defined(slug.current) && publishedAt <= now()
    ] | order(publishedAt desc) {
      "slug": slug.current, title, summary, publishedAt,
      "projects": projects[]->{ "slug": slug.current, title }
    }
  }
`)

export type ProjectLink = { slug: string; title: string }

export type PostSummary = {
  slug: string
  title: string
  summary: string
  publishedAt: Date
  projects: ProjectLink[]
}

export async function listPosts(): Promise<PostSummary[]> {
  const posts = await sanity.fetch(postsQuery)
  return posts.map((post) => summarize(post))
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
    projects: (post.projects ?? []).map((entry) => {
      const project = link(entry)
      return { ...project, posts: entry.posts.map((other) => summarize(other, project.slug)) }
    }),
  }
}

export type Post = NonNullable<Awaited<ReturnType<typeof findPost>>>

export async function listProjects() {
  const projects = await sanity.fetch(projectsQuery)
  return projects
    .map((project) => ({
      slug: published(project.slug, 'slug'),
      title: published(project.title, 'title'),
      summary: published(project.summary, 'summary'),
      year: published(project.year, 'year'),
      status: published(project.status, 'status'),
      featured: published(project.featured, 'featured'),
      posts: project.posts,
      lastPostAt: project.lastPostAt === null ? null : new Date(project.lastPostAt),
    }))
    .sort(
      (a, b) =>
        (b.lastPostAt?.getTime() ?? Number.NEGATIVE_INFINITY) -
          (a.lastPostAt?.getTime() ?? Number.NEGATIVE_INFINITY) || b.year - a.year,
    )
}

export type ProjectSummary = Awaited<ReturnType<typeof listProjects>>[number]

export async function findProject(slug: string) {
  const project = await sanity.fetch(projectQuery, { slug })
  if (!project) return null
  return {
    title: published(project.title, 'title'),
    summary: published(project.summary, 'summary'),
    year: published(project.year, 'year'),
    status: published(project.status, 'status'),
    stack: project.stack ?? [],
    repository: project.repository,
    website: project.website,
    coverImage: project.coverImage,
    body: published(project.body, 'body'),
    posts: project.posts.map((post) => summarize(post, slug)),
  }
}

export type Project = NonNullable<Awaited<ReturnType<typeof findProject>>>

function summarize(post: PostsQueryResult[number], context?: string): PostSummary {
  return {
    slug: published(post.slug, 'slug'),
    title: published(post.title, 'title'),
    summary: published(post.summary, 'summary'),
    publishedAt: new Date(published(post.publishedAt, 'publishedAt')),
    projects: (post.projects ?? []).map(link).filter((project) => project.slug !== context),
  }
}

function link(project: { slug: string | null; title: string | null }): ProjectLink {
  return { slug: published(project.slug, 'slug'), title: published(project.title, 'title') }
}

function published<T>(value: T | null, field: string): T {
  if (value === null) throw new Error(`published document without ${field}`)
  return value
}
