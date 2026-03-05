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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

    // Get all media files
    const media = await payload.find({
      collection: 'media',
      overrideAccess: false,
      user,
    })

    return Response.json(media, { headers: corsHeaders })
  } catch (error) {
    console.error('Error fetching media:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  try {
    console.log('[POST /media] Starting upload')

    const headers = await getHeaders()
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers })

    // Require authentication for upload
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
    }
    console.log('[POST /media] User authenticated:', user.id)

    // Parse multipart form data
    console.log('[POST /media] Parsing FormData')
    const formData = await req.formData()
    const fileData = formData.get('file') as File
    const alt = (formData.get('alt') as string) || fileData?.name || 'Uploaded image'

    if (!fileData) {
      console.log('[POST /media] No file provided in FormData')
      return Response.json({ error: 'No file provided' }, { status: 400, headers: corsHeaders })
    }

    console.log('[POST /media] File received:', {
      name: fileData.name,
      type: fileData.type,
      size: fileData.size,
    })

    // Convert File to buffer for Payload
    console.log('[POST /media] Converting file to buffer')
    const buffer = Buffer.from(await fileData.arrayBuffer())

    const file = {
      name: fileData.name,
      data: buffer,
      mimetype: fileData.type,
      size: fileData.size,
    }

    // Create media entry with file
    console.log('[POST /media] Creating media entry in Payload with alt:', alt)
    const media = await payload.create({
      collection: 'media',
      data: { alt },
      file,
      user,
      overrideAccess: false,
    })

    console.log('[POST /media] Media created successfully:', media.id)
    return Response.json(media, { status: 201, headers: corsHeaders })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : ''
    console.error('[POST /media] Upload failed:', errorMessage)
    console.error('[POST /media] Stack:', stack)
    console.error('[POST /media] Full error:', error)
    return Response.json(
      {
        error: 'Failed to upload media',
        details: errorMessage,
        stack: stack,
      },
      { status: 500, headers: corsHeaders },
    )
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
      return Response.json({ error: 'Media ID is required' }, { status: 400, headers: corsHeaders })
    }

    const body = await req.json()

    // Update media
    const media = await payload.update({
      collection: 'media',
      id,
      data: body,
      user,
      overrideAccess: false,
    })

    return Response.json(media, { headers: corsHeaders })
  } catch (error) {
    console.error('Error updating media:', error)
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
      return Response.json({ error: 'Media ID is required' }, { status: 400, headers: corsHeaders })
    }

    // Delete media
    await payload.delete({
      collection: 'media',
      id,
      user,
      overrideAccess: false,
    })

    return Response.json({ success: true, message: 'Media deleted' }, { headers: corsHeaders })
  } catch (error) {
    console.error('Error deleting media:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}
