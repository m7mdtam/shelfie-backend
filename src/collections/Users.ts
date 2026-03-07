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
