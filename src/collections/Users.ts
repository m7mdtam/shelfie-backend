import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: {
    verify: true,
  },
  access: {
    create: async () => true, // Allow public registration
    read: async ({ req }) => {
      if (req.user) return true // Authenticated users can read their own data
      return false
    },
    update: async ({ req }) => {
      if (req.user) return true // Users can update their own account
      return false
    },
    delete: async ({ req }) => {
      if (req.user) return true
      return false
    },
  },
  fields: [
    {
      name: 'firstName',
      type: 'text',
      required: true,
    },
    {
      name: 'lastName',
      type: 'text',
      required: true,
    },
  ],
}
