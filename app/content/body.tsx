import { PortableText, type PortableTextTypeComponentProps } from '@portabletext/react'

import type { Post } from '../../server/content.server'
import { imageUrl } from './sanity'

type BodyImage = Extract<Post['body'][number], { _type: 'image' }>

const components = {
  types: {
    image: ({ value }: PortableTextTypeComponentProps<BodyImage>) => (
      <img src={imageUrl(value, 1200)} alt={value.alt ?? ''} loading="lazy" />
    ),
  },
}

export function Body({ value }: { value: Post['body'] }) {
  return (
    <div className="prose">
      <PortableText value={value} components={components} />
    </div>
  )
}
