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
    'Access-Control-Allow-Methods': 'PUT, DELETE, OPTIONS',
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

export async function PUT(req: Request, props: { params: Promise<{ commentId: string }> }) {
  const { commentId } = await props.params
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

    const comment = await (payload.update as any)({
      collection: 'comments',
      id: commentId,
      data: { text: text.trim() },
      user,
      overrideAccess: false,
      depth: 1,
    })

    return Response.json(formatComment(comment), { headers: corsHeaders })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[PUT /comments/:commentId] Error:', errorMessage)
    if (errorMessage.includes('not found') || errorMessage.includes('Unauthorized')) {
      return Response.json({ error: 'Comment not found or insufficient permissions' }, { status: 404, headers: corsHeaders })
    }
    return Response.json({ error: 'Failed to update comment' }, { status: 500, headers: corsHeaders })
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ commentId: string }> }) {
  const { commentId } = await props.params
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers })

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
    }

    await (payload.delete as any)({
      collection: 'comments',
      id: commentId,
      user,
      overrideAccess: false,
    })

    return new Response(null, { status: 204, headers: corsHeaders })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[DELETE /comments/:commentId] Error:', errorMessage)
    if (errorMessage.includes('not found') || errorMessage.includes('Unauthorized')) {
      return Response.json({ error: 'Comment not found or insufficient permissions' }, { status: 404, headers: corsHeaders })
    }
    return Response.json({ error: 'Failed to delete comment' }, { status: 500, headers: corsHeaders })
  }
}
