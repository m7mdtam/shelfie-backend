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

function formatComment(comment: any) {
  const user = comment.user as any
  return {
    id: String(comment.id),
    bookId: String(typeof comment.book === 'object' ? comment.book?.id : comment.book),
    userId: user ? String(typeof user === 'object' ? user.id : user) : null,
    text: comment.text,
    user: user && typeof user === 'object'
      ? { id: String(user.id), firstName: user.firstName, lastName: user.lastName, email: user.email }
      : null,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
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
    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '10', 10)

    const payload = await getPayload({ config })

    const result = await (payload.find as any)({
      collection: 'comments',
      where: { book: { equals: id } },
      page,
      limit,
      depth: 1,
      sort: '-createdAt',
    })

    return Response.json(
      {
        data: result.docs.map(formatComment),
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.totalDocs,
          pages: result.totalPages,
        },
      },
      { headers: corsHeaders },
    )
  } catch (error) {
    console.error('[GET /books/:id/comments] Error:', error)
    return Response.json({ error: 'Failed to fetch comments' }, { status: 500, headers: corsHeaders })
  }
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
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

    const { text } = await req.json()

    if (!text || typeof text !== 'string' || !text.trim()) {
      return Response.json({ error: 'text is required' }, { status: 400, headers: corsHeaders })
    }

    const comment = await (payload.create as any)({
      collection: 'comments',
      data: { book: Number(id), user: user.id, text: text.trim() },
      user,
      overrideAccess: false,
      depth: 1,
    })

    return Response.json(formatComment(comment), { status: 201, headers: corsHeaders })
  } catch (error) {
    console.error('[POST /books/:id/comments] Error:', error)
    return Response.json({ error: 'Failed to create comment' }, { status: 500, headers: corsHeaders })
  }
}
