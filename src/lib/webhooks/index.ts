import prisma from '@/lib/db/client'

/**
 * Webhook Notification System
 * 
 * Sends notifications to registered webhook URLs when events occur.
 */

export type WebhookEvent = 
  | 'pipeline.created'
  | 'pipeline.started'
  | 'pipeline.completed'
  | 'pipeline.failed'
  | 'stage.claimed'
  | 'stage.started'
  | 'stage.completed'
  | 'stage.failed'

export interface WebhookPayload {
  event: WebhookEvent
  timestamp: string
  data: Record<string, unknown>
}

// In-memory webhook registry (in production, store in database)
const webhooks: Map<string, { url: string; events: WebhookEvent[] }> = new Map()

export function registerWebhook(id: string, url: string, events: WebhookEvent[]) {
  webhooks.set(id, { url, events })
}

export function unregisterWebhook(id: string) {
  webhooks.delete(id)
}

export function listWebhooks(): Array<{ id: string; url: string; events: WebhookEvent[] }> {
  return Array.from(webhooks.entries()).map(([id, config]) => ({
    id,
    ...config,
  }))
}

export async function sendWebhook(event: WebhookEvent, data: Record<string, unknown>) {
  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  }
  
  const matchingWebhooks = Array.from(webhooks.entries())
    .filter(([, config]) => config.events.includes(event))
  
  const results = await Promise.allSettled(
    matchingWebhooks.map(async ([id, config]) => {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Cutroom-Event': event,
          'X-Webhook-ID': id,
        },
        body: JSON.stringify(payload),
      })
      
      if (!response.ok) {
        throw new Error(`Webhook ${id} failed: ${response.status}`)
      }
      
      return { id, status: 'sent' }
    })
  )
  
  return results
}

// Helper functions for specific events
export async function notifyPipelineCreated(pipelineId: string) {
  const pipeline = await prisma.pipeline.findUnique({
    where: { id: pipelineId },
    select: { id: true, topic: true, status: true, createdAt: true },
  })
  
  if (pipeline) {
    await sendWebhook('pipeline.created', { pipeline })
  }
}

export async function notifyPipelineCompleted(pipelineId: string) {
  const pipeline = await prisma.pipeline.findUnique({
    where: { id: pipelineId },
    include: {
      stages: { select: { name: true, agentName: true, status: true } },
      attributions: { select: { agentName: true, percentage: true } },
    },
  })
  
  if (pipeline) {
    await sendWebhook('pipeline.completed', { pipeline })
  }
}

export async function notifyStageCompleted(stageId: string) {
  const stage = await prisma.stage.findUnique({
    where: { id: stageId },
    include: {
      pipeline: { select: { id: true, topic: true } },
    },
  })
  
  if (stage) {
    await sendWebhook('stage.completed', {
      stage: {
        id: stage.id,
        name: stage.name,
        agentId: stage.agentId,
        agentName: stage.agentName,
      },
      pipeline: stage.pipeline,
    })
  }
}
