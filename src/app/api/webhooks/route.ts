import { NextRequest, NextResponse } from 'next/server'
import { 
  registerWebhook, 
  unregisterWebhook, 
  listWebhooks,
  WebhookEvent 
} from '@/lib/webhooks'
import { z } from 'zod'

const WebhookSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
  events: z.array(z.enum([
    'pipeline.created',
    'pipeline.started', 
    'pipeline.completed',
    'pipeline.failed',
    'stage.claimed',
    'stage.started',
    'stage.completed',
    'stage.failed',
  ])),
})

/**
 * List webhooks
 */
export async function GET() {
  return NextResponse.json({
    webhooks: listWebhooks(),
  })
}

/**
 * Register a webhook
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = WebhookSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: result.error.errors },
        { status: 400 }
      )
    }
    
    const { id, url, events } = result.data
    registerWebhook(id, url, events as WebhookEvent[])
    
    return NextResponse.json({
      registered: true,
      id,
      url,
      events,
    })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * Unregister a webhook
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Webhook id is required' },
        { status: 400 }
      )
    }
    
    unregisterWebhook(id)
    
    return NextResponse.json({
      unregistered: true,
      id,
    })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
