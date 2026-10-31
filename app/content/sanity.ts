import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url'

export const sanityConfig = { projectId: 'q2g9o9x3', dataset: 'production' }

export const coverWidth = 1600

const builder = createImageUrlBuilder(sanityConfig)

export function imageUrl(source: SanityImageSource, width: number): string {
  return builder.image(source).width(width).auto('format').url()
}
