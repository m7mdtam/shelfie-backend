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

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  try {
    const { id } = params
    const headers = await getHeaders()
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers })

    // Get single book - access control handled by Payload
    const book = await payload.findByID({
      collection: 'books',
      id,
      user,
      overrideAccess: false,
    })

    return Response.json(book, { headers: corsHeaders })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[GET /books/[id]] Error:', errorMessage)

    // Return 404 if book not found or access denied
    if (errorMessage.includes('not found') || errorMessage.includes('Unauthorized')) {
      return Response.json({ error: 'Book not found' }, { status: 404, headers: corsHeaders })
    }

    return Response.json({ error: 'Failed to fetch book' }, { status: 500, headers: corsHeaders })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  try {
    const { id } = params
    const headers = await getHeaders()
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers })

    // Require authentication
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
    }

    const body = await req.json()

    // Update book - access control (ownership) handled by Payload
    const book = await payload.update({
      collection: 'books',
      id,
      data: body,
      user,
      overrideAccess: false,
    })

    return Response.json(book, { headers: corsHeaders })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[PUT /books/[id]] Error:', errorMessage)

    if (errorMessage.includes('not found') || errorMessage.includes('Unauthorized')) {
      return Response.json(
        { error: 'Book not found or insufficient permissions' },
        { status: 404, headers: corsHeaders },
      )
    }

    return Response.json({ error: 'Failed to update book' }, { status: 500, headers: corsHeaders })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  try {
    const { id } = params
    const headers = await getHeaders()
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers })

    // Require authentication
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
    }

    // Delete book - access control (ownership) handled by Payload
    await payload.delete({
      collection: 'books',
      id,
      user,
      overrideAccess: false,
    })

    return Response.json({ success: true, message: 'Book deleted' }, { headers: corsHeaders })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[DELETE /books/[id]] Error:', errorMessage)

    if (errorMessage.includes('not found') || errorMessage.includes('Unauthorized')) {
      return Response.json(
        { error: 'Book not found or insufficient permissions' },
        { status: 404, headers: corsHeaders },
      )
    }

    return Response.json({ error: 'Failed to delete book' }, { status: 500, headers: corsHeaders })
  }
}
