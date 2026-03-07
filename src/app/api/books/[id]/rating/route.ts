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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  }
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get('origin')
  return new Response(null, { status: 200, headers: getCorsHeaders(origin) })
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id: bookId } = await props.params
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers })

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
    }

    const { rating } = await req.json()

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return Response.json({ error: 'Rating must be a number between 1 and 5' }, { status: 400, headers: corsHeaders })
    }

    // Check if user already rated this book
    const existing = await (payload.find as any)({
      collection: 'ratings',
      where: {
        and: [
          { book: { equals: bookId } },
          { user: { equals: user.id } },
        ],
      },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      // Update existing rating
      await (payload.update as any)({
        collection: 'ratings',
        id: existing.docs[0].id,
        data: { rating },
        user,
        overrideAccess: false,
      })
    } else {
      // Create new rating
      await (payload.create as any)({
        collection: 'ratings',
        data: { book: Number(bookId), user: user.id, rating },
        user,
        overrideAccess: false,
      })
    }

    // Calculate average
    const allRatings = await (payload.find as any)({
      collection: 'ratings',
      where: { book: { equals: bookId } },
      limit: 0,
    })

    const totalRatings = allRatings.totalDocs
    const sum = allRatings.docs.reduce((acc: number, r: any) => acc + r.rating, 0)
    const averageRating = totalRatings > 0 ? Math.round((sum / totalRatings) * 10) / 10 : 0

    return Response.json(
      {
        bookId,
        userRating: rating,
        averageRating,
        totalRatings,
      },
      { headers: corsHeaders },
    )
  } catch (error) {
    console.error('[POST /books/:id/rating] Error:', error)
    return Response.json({ error: 'Failed to submit rating' }, { status: 500, headers: corsHeaders })
  }
}
