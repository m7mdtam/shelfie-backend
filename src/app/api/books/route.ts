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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  }
}

// Helper function to enrich a book with rating information
async function enrichBookWithRatings(
  book: any,
  bookId: string | number,
  userId: string | number | null,
  payload: any,
) {
  // Fetch ratings for this book
  const allRatings = await (payload.find as any)({
    collection: 'ratings',
    where: { book: { equals: String(bookId) } },
    limit: 0,
  })

  const totalRatings = allRatings.totalDocs
  const sum = allRatings.docs.reduce((acc: number, r: any) => acc + r.rating, 0)
  const averageRating = totalRatings > 0 ? Math.round((sum / totalRatings) * 10) / 10 : 0

  // Get current user's rating if authenticated
  let userRating: number | null = null
  if (userId) {
    const userRatingResult = await (payload.find as any)({
      collection: 'ratings',
      where: {
        and: [{ book: { equals: String(bookId) } }, { user: { equals: String(userId) } }],
      },
      limit: 1,
    })
    userRating = userRatingResult.docs.length > 0 ? userRatingResult.docs[0].rating : null
  }

  return {
    ...book,
    averageRating,
    userRating,
    totalRatings,
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

    // Parse query parameters
    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '10', 10)
    const page = parseInt(url.searchParams.get('page') || '1', 10)

    // Build where clause from query parameters
    const whereParams: Record<string, any> = {}
    const whereKeys = new Set<string>()

    url.searchParams.forEach((value, key) => {
      if (key.startsWith('where[')) {
        whereKeys.add(key)
      }
    })

    // Parse where parameters: where[field][operator]=value
    if (whereKeys.size > 0) {
      const fieldFilters: Record<string, any> = {}

      whereKeys.forEach((key) => {
        const match = key.match(/where\[([^\]]+)\]\[([^\]]+)\]/)
        if (match) {
          const [, field, operator] = match
          const value = url.searchParams.get(key)

          if (!fieldFilters[field]) {
            fieldFilters[field] = {}
          }
          fieldFilters[field][operator] = value
        }
      })

      // If multiple filters, use AND; otherwise use the single filter
      if (Object.keys(fieldFilters).length > 1) {
        whereParams.and = Object.entries(fieldFilters).map(([field, operators]) => ({
          [field]: operators,
        }))
      } else if (Object.keys(fieldFilters).length === 1) {
        const [field, operators] = Object.entries(fieldFilters)[0]
        whereParams[field] = operators
      }
    }

    // Get books with pagination and filters
    const books = await payload.find({
      collection: 'books',
      limit,
      page,
      ...(Object.keys(whereParams).length > 0 && { where: whereParams }),
      overrideAccess: false,
      user,
    })

    // Enrich each book with rating information
    const enrichedBooks = await Promise.all(
      books.docs.map((book) =>
        enrichBookWithRatings(book, String(book.id), user?.id ? String(user.id) : null, payload),
      ),
    )

    return Response.json(
      {
        ...books,
        docs: enrichedBooks,
      },
      { headers: corsHeaders },
    )
  } catch (error) {
    console.error('Error fetching books:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}
