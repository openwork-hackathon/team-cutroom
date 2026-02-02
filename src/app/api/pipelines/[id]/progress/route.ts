import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/client'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * Pipeline Progress Endpoint
 * 
 * GET /api/pipelines/:id/progress
 * 
 * Returns detailed progress information for a pipeline including:
 * - Overall completion percentage
 * - Stage-by-stage status
 * - Time estimates
 * - Agent assignments
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params

    const pipeline = await prisma.pipeline.findUnique({
      where: { id },
      include: {
        stages: {
          orderBy: { name: 'asc' },
        },
        attributions: {
          select: {
            agentId: true,
            agentName: true,
            stageName: true,
            percentage: true,
          },
        },
      },
    })

    if (!pipeline) {
      return NextResponse.json(
        { error: 'Pipeline not found' },
        { status: 404 }
      )
    }

    // Calculate progress
    const totalStages = pipeline.stages.length
    const completedStages = pipeline.stages.filter(s => s.status === 'COMPLETE').length
    const inProgressStages = pipeline.stages.filter(s => s.status === 'IN_PROGRESS' || s.status === 'CLAIMED').length
    const pendingStages = pipeline.stages.filter(s => s.status === 'PENDING').length
    const failedStages = pipeline.stages.filter(s => s.status === 'FAILED').length

    const progressPercent = totalStages > 0 
      ? Math.round((completedStages / totalStages) * 100) 
      : 0

    // Stage order for progress bar
    const stageOrder = ['RESEARCH', 'SCRIPT', 'VOICE', 'MUSIC', 'VISUAL', 'EDITOR', 'PUBLISH']
    
    // Build stage details
    const stageDetails = stageOrder.map((stageName, index) => {
      const stage = pipeline.stages.find(s => s.name === stageName)
      if (!stage) return null

      const attribution = pipeline.attributions.find(a => a.stageName === stageName)
      
      return {
        name: stageName,
        order: index + 1,
        status: stage.status,
        agentId: stage.agentId,
        agentName: stage.agentName,
        contribution: attribution?.percentage || getDefaultContribution(stageName),
        claimedAt: stage.claimedAt,
        completedAt: stage.completedAt,
        // Estimate remaining time based on average completion
        estimatedMinutes: stage.status === 'PENDING' ? getEstimatedMinutes(stageName) : null,
      }
    }).filter(Boolean)

    // Calculate ETA
    const remainingStages = stageDetails.filter(s => s?.status === 'PENDING' || s?.status === 'CLAIMED')
    const estimatedMinutesRemaining = remainingStages.reduce(
      (sum, s) => sum + (s?.estimatedMinutes || 5),
      0
    )

    return NextResponse.json({
      pipeline: {
        id: pipeline.id,
        topic: pipeline.topic,
        status: pipeline.status,
        createdAt: pipeline.createdAt,
        updatedAt: pipeline.updatedAt,
      },
      progress: {
        percent: progressPercent,
        completed: completedStages,
        inProgress: inProgressStages,
        pending: pendingStages,
        failed: failedStages,
        total: totalStages,
      },
      stages: stageDetails,
      estimate: {
        minutesRemaining: estimatedMinutesRemaining,
        eta: new Date(Date.now() + estimatedMinutesRemaining * 60 * 1000).toISOString(),
      },
      contributors: pipeline.attributions.map(a => ({
        agentId: a.agentId,
        agentName: a.agentName,
        stage: a.stageName,
        contribution: a.percentage,
      })),
    })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * Get default contribution percentage for a stage
 */
function getDefaultContribution(stageName: string): number {
  const contributions: Record<string, number> = {
    RESEARCH: 10,
    SCRIPT: 25,
    VOICE: 20,
    MUSIC: 10,
    VISUAL: 15,
    EDITOR: 15,
    PUBLISH: 5,
  }
  return contributions[stageName] || 10
}

/**
 * Get estimated minutes to complete a stage
 */
function getEstimatedMinutes(stageName: string): number {
  const estimates: Record<string, number> = {
    RESEARCH: 5,
    SCRIPT: 10,
    VOICE: 8,
    MUSIC: 5,
    VISUAL: 8,
    EDITOR: 12,
    PUBLISH: 3,
  }
  return estimates[stageName] || 5
}
