import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/client'

/**
 * Activity Feed Endpoint
 * 
 * GET /api/activity
 * 
 * Returns recent activity across the platform including:
 * - Pipeline creations
 * - Stage claims and completions
 * - Agent contributions
 * 
 * Great for dashboards and real-time monitoring.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const type = searchParams.get('type') // 'pipeline', 'stage', 'all'

    const activities: Array<{
      id: string
      type: string
      action: string
      timestamp: Date
      details: Record<string, unknown>
    }> = []

    // Get recent pipeline activity
    if (!type || type === 'all' || type === 'pipeline') {
      const recentPipelines = await prisma.pipeline.findMany({
        orderBy: { createdAt: 'desc' },
        take: Math.floor(limit / 2),
        select: {
          id: true,
          topic: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      for (const pipeline of recentPipelines) {
        activities.push({
          id: `pipeline-${pipeline.id}`,
          type: 'pipeline',
          action: 'created',
          timestamp: pipeline.createdAt,
          details: {
            pipelineId: pipeline.id,
            topic: pipeline.topic,
            status: pipeline.status,
          },
        })
      }
    }

    // Get recent stage activity
    if (!type || type === 'all' || type === 'stage') {
      // Recently claimed stages
      const claimedStages = await prisma.stage.findMany({
        where: {
          claimedAt: { not: null },
        },
        orderBy: { claimedAt: 'desc' },
        take: Math.floor(limit / 3),
        select: {
          id: true,
          name: true,
          agentId: true,
          agentName: true,
          claimedAt: true,
          pipeline: {
            select: { topic: true },
          },
        },
      })

      for (const stage of claimedStages) {
        if (stage.claimedAt) {
          activities.push({
            id: `claim-${stage.id}`,
            type: 'stage',
            action: 'claimed',
            timestamp: stage.claimedAt,
            details: {
              stageId: stage.id,
              stageName: stage.name,
              agentId: stage.agentId,
              agentName: stage.agentName,
              pipelineTopic: stage.pipeline.topic,
            },
          })
        }
      }

      // Recently completed stages
      const completedStages = await prisma.stage.findMany({
        where: {
          status: 'COMPLETE',
          completedAt: { not: null },
        },
        orderBy: { completedAt: 'desc' },
        take: Math.floor(limit / 3),
        select: {
          id: true,
          name: true,
          agentId: true,
          agentName: true,
          completedAt: true,
          pipeline: {
            select: { topic: true },
          },
        },
      })

      for (const stage of completedStages) {
        if (stage.completedAt) {
          activities.push({
            id: `complete-${stage.id}`,
            type: 'stage',
            action: 'completed',
            timestamp: stage.completedAt,
            details: {
              stageId: stage.id,
              stageName: stage.name,
              agentId: stage.agentId,
              agentName: stage.agentName,
              pipelineTopic: stage.pipeline.topic,
            },
          })
        }
      }
    }

    // Sort by timestamp descending and limit
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    const limitedActivities = activities.slice(0, limit)

    // Format for response
    const formattedActivities = limitedActivities.map(a => ({
      ...a,
      timestamp: a.timestamp.toISOString(),
      relativeTime: getRelativeTime(a.timestamp),
    }))

    return NextResponse.json({
      activities: formattedActivities,
      count: formattedActivities.length,
      filters: {
        type: type || 'all',
        limit,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * Get human-readable relative time
 */
function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}
