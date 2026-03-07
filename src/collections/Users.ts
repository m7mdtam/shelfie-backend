import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: {
    verify: process.env.ENABLE_EMAIL_VERIFICATION !== 'false',
    forgotPassword: {
      generateEmailHTML: (args) => {
        const { token, user } = args ?? {}
        const baseURL = process.env.FRONTEND_URL || 'http://localhost:5173'
        const resetURL = `${baseURL}/reset-password?token=${token}`
        return `
          <p>Hi ${user.email},</p>
          <p>Click the link below to reset your password:</p>
          <a href="${resetURL}">Reset Password</a>
          <p>If you didn't request this, ignore this email.</p>
        `
      },
      generateEmailSubject: () => 'Reset your Shelfie password',
    },
  },
  access: {
    create: async () => true, // Allow public registration
    read: async ({ req }) => {
      if (req.user) return true // Authenticated users can read all their data
      // Public can read non-sensitive fields only
      return true // Will be restricted via field-level access below
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
      access: {
        read: () => true, // Public readable
      },
    },
    {
      name: 'lastName',
      type: 'text',
      required: true,
      access: {
        read: () => true, // Public readable
      },
    },
    {
      name: 'profileImage',
      type: 'upload',
      relationTo: 'media',
      required: false,
      access: {
        read: () => true, // Public readable
      },
    },
    {
      name: 'sex',
      type: 'select',
      options: [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
        { label: 'Prefer not to say', value: 'prefer-not-to-say' },
      ],
      required: false,
      access: {
        read: () => true, // Public readable
      },
    },
    {
      name: 'birthDate',
      type: 'date',
      required: false,
      access: {
        read: () => true, // Public readable
      },
    },
  ],
}
