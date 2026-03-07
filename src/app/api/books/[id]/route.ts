/* eslint-disable @typescript-eslint/no-explicit-any */
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

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers })

    const book = await payload.findByID({
      collection: 'books',
      id,
      user,
      overrideAccess: false,
    })

    // Fetch ratings for this book
    const allRatings = await (payload.find as any)({
      collection: 'ratings',
      where: { book: { equals: id } },
      limit: 0,
    })

    const totalRatings = allRatings.totalDocs
    const sum = allRatings.docs.reduce((acc: number, r: any) => acc + r.rating, 0)
    const averageRating = totalRatings > 0 ? Math.round((sum / totalRatings) * 10) / 10 : 0

    // Get current user's rating if authenticated
    let userRating: number | null = null
    if (user) {
      const userRatingResult = await (payload.find as any)({
        collection: 'ratings',
        where: {
          and: [
            { book: { equals: id } },
            { user: { equals: user.id } },
          ],
        },
        limit: 1,
      })
      userRating = userRatingResult.docs.length > 0 ? userRatingResult.docs[0].rating : null
    }

    return Response.json(
      { ...book, averageRating, userRating, totalRatings },
      { headers: corsHeaders },
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[GET /books/[id]] Error:', errorMessage)

    if (errorMessage.includes('not found') || errorMessage.includes('Unauthorized')) {
      return Response.json({ error: 'Book not found' }, { status: 404, headers: corsHeaders })
    }

    return Response.json({ error: 'Failed to fetch book' }, { status: 500, headers: corsHeaders })
  }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers })

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
    }

    const body = await req.json()

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

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers })

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
    }

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
