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
    'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
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

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
    }

    return Response.json(user, { headers: corsHeaders })
  } catch (error) {
    console.error('[GET /users/me] Error:', error)
    return Response.json({ error: 'Failed to fetch user' }, { status: 500, headers: corsHeaders })
  }
}

export async function PATCH(req: Request) {
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

    // Update user profile
    const updated = await payload.update({
      collection: 'users',
      id: user.id,
      data: body,
      user,
      overrideAccess: false,
    })

    return Response.json(updated, { headers: corsHeaders })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[PATCH /users/me] Error:', errorMessage)

    if (errorMessage.includes('Unauthorized')) {
      return Response.json({ error: 'Access denied' }, { status: 403, headers: corsHeaders })
    }

    return Response.json({ error: 'Failed to update user' }, { status: 500, headers: corsHeaders })
  }
}
