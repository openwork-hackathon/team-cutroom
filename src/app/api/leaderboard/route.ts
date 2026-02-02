import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/client'

/**
 * Leaderboard Endpoint
 * 
 * GET /api/leaderboard
 * 
 * Returns ranked list of agents by contribution.
 * Useful for gamification and hackathon demos.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const timeframe = searchParams.get('timeframe') // 'day', 'week', 'month', 'all'

    // Calculate date filter
    let dateFilter: Date | undefined
    if (timeframe === 'day') {
      dateFilter = new Date(Date.now() - 24 * 60 * 60 * 1000)
    } else if (timeframe === 'week') {
      dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    } else if (timeframe === 'month') {
      dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }

    // Get agent contributions
    const contributions = await prisma.attribution.groupBy({
      by: ['agentId', 'agentName'],
      where: dateFilter ? { createdAt: { gte: dateFilter } } : undefined,
      _sum: { percentage: true },
      _count: true,
      orderBy: { _sum: { percentage: 'desc' } },
      take: limit,
    })

    // Get stage breakdown for each agent
    const agentIds = contributions.map(c => c.agentId).filter(Boolean) as string[]
    
    const stageBreakdowns = await prisma.stage.groupBy({
      by: ['agentId', 'name'],
      where: {
        agentId: { in: agentIds },
        status: 'COMPLETE',
        ...(dateFilter ? { completedAt: { gte: dateFilter } } : {}),
      },
      _count: true,
    })

    // Build stage breakdown map
    const breakdownMap: Record<string, Record<string, number>> = {}
    for (const sb of stageBreakdowns) {
      if (!sb.agentId) continue
      if (!breakdownMap[sb.agentId]) {
        breakdownMap[sb.agentId] = {}
      }
      breakdownMap[sb.agentId][sb.name] = sb._count
    }

    // Format leaderboard
    const leaderboard = contributions.map((c, index) => ({
      rank: index + 1,
      agentId: c.agentId,
      agentName: c.agentName,
      totalContribution: c._sum.percentage || 0,
      stagesCompleted: c._count,
      stageBreakdown: breakdownMap[c.agentId || ''] || {},
      // Calculate badges based on achievements
      badges: calculateBadges(c._sum.percentage || 0, c._count, breakdownMap[c.agentId || '']),
    }))

    // Get total stats
    const totalAgents = await prisma.attribution.groupBy({
      by: ['agentId'],
      where: dateFilter ? { createdAt: { gte: dateFilter } } : undefined,
    })

    const totalContributions = await prisma.attribution.aggregate({
      where: dateFilter ? { createdAt: { gte: dateFilter } } : undefined,
      _sum: { percentage: true },
      _count: true,
    })

    return NextResponse.json({
      leaderboard,
      meta: {
        timeframe: timeframe || 'all',
        totalAgents: totalAgents.length,
        totalContributions: totalContributions._count,
        totalPercentage: totalContributions._sum.percentage || 0,
        generatedAt: new Date().toISOString(),
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
 * Calculate achievement badges for an agent
 */
function calculateBadges(
  contribution: number,
  stages: number,
  breakdown: Record<string, number> = {}
): string[] {
  const badges: string[] = []

  // Contribution badges
  if (contribution >= 100) badges.push('🏆 Century Club')
  if (contribution >= 50) badges.push('⭐ Half Century')
  if (contribution >= 25) badges.push('🌟 Rising Star')

  // Volume badges
  if (stages >= 50) badges.push('🔥 Machine')
  if (stages >= 20) badges.push('💪 Workhorse')
  if (stages >= 10) badges.push('🎯 Consistent')

  // Specialist badges
  const stageTypes = Object.keys(breakdown)
  if (stageTypes.length >= 5) badges.push('🌈 Versatile')
  
  const maxStage = Object.entries(breakdown).sort(([,a], [,b]) => b - a)[0]
  if (maxStage && maxStage[1] >= 5) {
    const specialistBadges: Record<string, string> = {
      RESEARCH: '🔍 Research Pro',
      SCRIPT: '✍️ Script Master',
      VOICE: '🎙️ Voice Artist',
      MUSIC: '🎵 Music Maven',
      VISUAL: '🎨 Visual Guru',
      EDITOR: '🎬 Edit Wizard',
      PUBLISH: '📢 Publisher',
    }
    if (specialistBadges[maxStage[0]]) {
      badges.push(specialistBadges[maxStage[0]])
    }
  }

  return badges
}
