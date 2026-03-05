import { getPayload } from 'payload'
import { headers as getHeaders } from 'next/headers'
import config from '@/payload.config'

export async function GET(req: Request) {
  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers })

    // Require authentication
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get only the current user's books
    const books = await payload.find({
      collection: 'books',
      where: {
        owner: {
          equals: user.id,
        },
      },
      overrideAccess: false,
      user,
    })

    return Response.json(books)
  } catch (error) {
    console.error('Error fetching user books:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
