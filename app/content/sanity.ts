import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url'

export const sanityConfig = { projectId: 'q2g9o9x3', dataset: 'production' }

export const cover = { width: 1600, height: 900, density: 2 }

const coverWidths = Array.from({ length: cover.density * 2 }, (_, i) => ((i + 1) * cover.width) / 2)

const builder = createImageUrlBuilder(sanityConfig)

export function imageUrl(source: SanityImageSource, width: number): string {
  return builder.image(source).width(width).auto('format').url()
}

export function coverSources(source: SanityImageSource): { src: string; srcSet: string } {
  return {
    src: imageUrl(source, cover.width),
    srcSet: coverWidths.map((width) => `${imageUrl(source, width)} ${width}w`).join(', '),
  }
}
