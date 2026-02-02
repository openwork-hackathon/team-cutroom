import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/client'
import { STAGE_ORDER } from '@/lib/stages'
import { StageName } from '@prisma/client'

/**
 * Agent Dashboard
 * 
 * GET /api/dashboard
 * 
 * Returns everything an agent needs to get started:
 * - Available work matching their capabilities
 * - Their own stats
 * - Recent activity
 * 
 * Query params:
 * - agentId: Filter stats to this agent
 * - capabilities: Comma-separated list of stage names to filter work
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const capabilitiesParam = searchParams.get('capabilities')
    const capabilities = capabilitiesParam 
      ? capabilitiesParam.split(',') as StageName[]
      : STAGE_ORDER

    // Get running pipelines with available work
    const runningPipelines = await prisma.pipeline.findMany({
      where: { status: 'RUNNING' },
      include: { 
        stages: { orderBy: { createdAt: 'asc' } } 
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // Calculate available work
    const availableWork: Array<{
      pipelineId: string
      topic: string
      stage: StageName
      priority: number
    }> = []

    for (const pipeline of runningPipelines) {
      for (let i = 0; i < pipeline.stages.length; i++) {
        const stage = pipeline.stages[i]
        
        if (stage.status !== 'PENDING') continue
        if (!capabilities.includes(stage.name)) continue
        
        // Check if previous is complete
        if (i > 0 && !['COMPLETE', 'SKIPPED'].includes(pipeline.stages[i - 1].status)) continue
        
        availableWork.push({
          pipelineId: pipeline.id,
          topic: pipeline.topic,
          stage: stage.name,
          priority: STAGE_ORDER.indexOf(stage.name), // Lower = higher priority
        })
      }
    }

    // Sort by priority (earlier stages first)
    availableWork.sort((a, b) => a.priority - b.priority)

    // Get agent stats if agentId provided
    let agentStats = null
    if (agentId) {
      const attributions = await prisma.attribution.aggregate({
        where: { agentId },
        _sum: { percentage: true },
        _count: true,
      })
      
      const recentWork = await prisma.stage.findMany({
        where: { agentId, status: 'COMPLETE' },
        include: { pipeline: { select: { topic: true } } },
        orderBy: { completedAt: 'desc' },
        take: 5,
      })
      
      agentStats = {
        totalContribution: attributions._sum.percentage || 0,
        stagesCompleted: attributions._count || 0,
        recentWork: recentWork.map(s => ({
          stage: s.name,
          topic: s.pipeline.topic,
          completedAt: s.completedAt,
        })),
      }
    }

    // Get recent completions (activity feed)
    const recentCompletions = await prisma.stage.findMany({
      where: { status: 'COMPLETE' },
      include: { 
        pipeline: { select: { topic: true } } 
      },
      orderBy: { completedAt: 'desc' },
      take: 10,
    })

    // System stats
    const pipelineCounts = await prisma.pipeline.groupBy({
      by: ['status'],
      _count: true,
    })

    return NextResponse.json({
      availableWork: availableWork.slice(0, 10),
      totalAvailable: availableWork.length,
      agentStats,
      activity: recentCompletions.map(s => ({
        stage: s.name,
        topic: s.pipeline.topic,
        agent: s.agentName,
        completedAt: s.completedAt,
      })),
      system: {
        pipelines: Object.fromEntries(
          pipelineCounts.map(p => [p.status, p._count])
        ),
        runningPipelines: runningPipelines.length,
      },
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
