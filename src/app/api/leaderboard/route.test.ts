import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

// Mock prisma
vi.mock('@/lib/db/client', () => ({
  default: {
    attribution: {
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    },
    stage: {
      groupBy: vi.fn(),
    },
  },
}))

import prisma from '@/lib/db/client'

const mockContributions = [
  { agentId: 'agent-1', agentName: 'TopAgent', _sum: { percentage: 75 }, _count: 15 },
  { agentId: 'agent-2', agentName: 'SecondAgent', _sum: { percentage: 50 }, _count: 10 },
  { agentId: 'agent-3', agentName: 'ThirdAgent', _sum: { percentage: 25 }, _count: 5 },
]

const mockStageBreakdowns = [
  { agentId: 'agent-1', name: 'RESEARCH', _count: 5 },
  { agentId: 'agent-1', name: 'SCRIPT', _count: 10 },
  { agentId: 'agent-2', name: 'VOICE', _count: 10 },
]

function createMockRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'))
}

describe('GET /api/leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.attribution.groupBy).mockResolvedValue(mockContributions as any)
    vi.mocked(prisma.stage.groupBy).mockResolvedValue(mockStageBreakdowns as any)
    vi.mocked(prisma.attribution.aggregate).mockResolvedValue({
      _sum: { percentage: 150 },
      _count: 30,
    } as any)
  })

  it('returns ranked leaderboard', async () => {
    const request = createMockRequest('http://localhost/api/leaderboard')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.leaderboard).toHaveLength(3)
    expect(data.leaderboard[0].rank).toBe(1)
    expect(data.leaderboard[0].agentName).toBe('TopAgent')
  })

  it('respects limit parameter', async () => {
    const request = createMockRequest('http://localhost/api/leaderboard?limit=2')
    await GET(request)

    expect(prisma.attribution.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ take: 2 })
    )
  })

  it('caps limit at 100', async () => {
    const request = createMockRequest('http://localhost/api/leaderboard?limit=500')
    await GET(request)

    expect(prisma.attribution.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    )
  })

  it('includes stage breakdown', async () => {
    const request = createMockRequest('http://localhost/api/leaderboard')
    const response = await GET(request)
    const data = await response.json()

    expect(data.leaderboard[0].stageBreakdown).toEqual({
      RESEARCH: 5,
      SCRIPT: 10,
    })
  })

  it('calculates badges for high contributors', async () => {
    const request = createMockRequest('http://localhost/api/leaderboard')
    const response = await GET(request)
    const data = await response.json()

    // TopAgent has 75 contribution and 15 stages
    expect(data.leaderboard[0].badges).toContain('⭐ Half Century')
    expect(data.leaderboard[0].badges).toContain('🎯 Consistent')
  })

  it('includes meta stats', async () => {
    const request = createMockRequest('http://localhost/api/leaderboard')
    const response = await GET(request)
    const data = await response.json()

    expect(data.meta).toBeDefined()
    expect(data.meta.timeframe).toBe('all')
    expect(data.meta.generatedAt).toBeDefined()
  })

  it('filters by day timeframe', async () => {
    const request = createMockRequest('http://localhost/api/leaderboard?timeframe=day')
    await GET(request)

    expect(prisma.attribution.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      })
    )
  })

  it('filters by week timeframe', async () => {
    const request = createMockRequest('http://localhost/api/leaderboard?timeframe=week')
    await GET(request)

    expect(prisma.attribution.groupBy).toHaveBeenCalled()
  })
})
