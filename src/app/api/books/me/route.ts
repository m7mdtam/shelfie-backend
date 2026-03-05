import { getPayload } from 'payload'
import { headers as getHeaders } from 'next/headers'
import config from '@/payload.config'

function getCorsHeaders(origin: string | null) {
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'https://shelfie-book.vercel.app',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
  ]

  const isAllowed = origin && allowedOrigins.includes(origin)

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  }
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get('origin')
  return new Response(null, { status: 200, headers: getCorsHeaders(origin) })
}

export async function GET(req: Request) {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers })

    // Require authentication
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
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

    return Response.json(books, { headers: corsHeaders })
  } catch (error) {
    console.error('Error fetching user books:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}

export async function PUT(req: Request) {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers })

    // Require authentication
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
    }

    const url = new URL(req.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return Response.json({ error: 'Book ID is required' }, { status: 400, headers: corsHeaders })
    }

    const body = await req.json()

    // Update user's book
    const book = await payload.update({
      collection: 'books',
      id,
      data: body,
      user,
      overrideAccess: false,
    })

    return Response.json(book, { headers: corsHeaders })
  } catch (error) {
    console.error('Error updating book:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}

export async function DELETE(req: Request) {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers })

    // Require authentication
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
    }

    const url = new URL(req.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return Response.json({ error: 'Book ID is required' }, { status: 400, headers: corsHeaders })
    }

    // Delete user's book
    await payload.delete({
      collection: 'books',
      id,
      user,
      overrideAccess: false,
    })

    return Response.json({ success: true, message: 'Book deleted' }, { headers: corsHeaders })
  } catch (error) {
    console.error('Error deleting book:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}
