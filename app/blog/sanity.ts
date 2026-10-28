import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url'

export const project = { projectId: 'q2g9o9x3', dataset: 'production' }

const builder = createImageUrlBuilder(project)

export function imageUrl(source: SanityImageSource, width: number): string {
  return builder.image(source).width(width).auto('format').url()
}
