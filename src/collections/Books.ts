import type { CollectionConfig } from 'payload'

export const Books: CollectionConfig = {
  slug: 'books',
  admin: {
    useAsTitle: 'title',
  },
  access: {
    read: ({ req: { user } }) => {
      if (user) return true
      return { isPublic: { equals: true } }
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => {
      if (!user) return false
      return { owner: { equals: user.id } }
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      return { owner: { equals: user.id } }
    },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'author',
      type: 'text',
      required: true,
    },
    {
      name: 'genre',
      type: 'select',
      options: [
        { label: 'Fiction', value: 'fiction' },
        { label: 'Non-Fiction', value: 'non-fiction' },
        { label: 'Fantasy', value: 'fantasy' },
        { label: 'Science Fiction', value: 'science-fiction' },
        { label: 'Mystery', value: 'mystery' },
        { label: 'Thriller', value: 'thriller' },
        { label: 'Romance', value: 'romance' },
        { label: 'Historical Fiction', value: 'historical-fiction' },
        { label: 'Biography', value: 'biography' },
        { label: 'Self-Help', value: 'self-help' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'want-to-read',
      options: [
        { label: 'Want to Read', value: 'want-to-read' },
        { label: 'Reading', value: 'reading' },
        { label: 'Finished', value: 'finished' },
      ],
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'isPublic',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'isDownloadable',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'downloadLink',
      type: 'text',
      validate: (value: string | null | undefined, { data }: { data: Record<string, unknown> }) => {
        if (data?.isDownloadable && !value) {
          return 'Download link is required when the book is downloadable.'
        }
        return true
      },
      admin: {
        condition: (data) => Boolean(data?.isDownloadable),
      },
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hooks: {
        beforeChange: [
          ({ req, value }) => {
            if (!value && req.user) return req.user.id
            return value
          },
        ],
      },
    },
  ],
}
