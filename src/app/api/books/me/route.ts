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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

    // Parse query parameters
    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '10', 10)
    const page = parseInt(url.searchParams.get('page') || '1', 10)

    // Build where clause - start with owner filter, add additional filters from query
    const whereParams: Record<string, any> = {}
    const filters: any[] = [{ owner: { equals: user.id } }]

    // Parse additional where parameters from query: where[field][operator]=value
    const whereKeys = new Set<string>()
    url.searchParams.forEach((value, key) => {
      if (key.startsWith('where[')) {
        whereKeys.add(key)
      }
    })

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

      // Add field filters to the filters array
      Object.entries(fieldFilters).forEach(([field, operators]) => {
        filters.push({ [field]: operators })
      })
    }

    // Build final where clause with AND
    if (filters.length > 1) {
      whereParams.and = filters
    } else {
      whereParams.owner = { equals: user.id }
    }

    // Get user's books with pagination and filters
    const books = await payload.find({
      collection: 'books',
      limit,
      page,
      where: whereParams,
      overrideAccess: false,
      user,
    })

    return Response.json(books, { headers: corsHeaders })
  } catch (error) {
    console.error('Error fetching user books:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers })

    // Require authentication for creating books
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
    }

    const body = await req.json()

    // Create a new book (owner is auto-assigned to current user by the Payload hook)
    const book = await payload.create({
      collection: 'books',
      data: body,
      user,
      overrideAccess: false,
      draft: false,
    })

    return Response.json(book, { status: 201, headers: corsHeaders })
  } catch (error) {
    console.error('Error creating book:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}
