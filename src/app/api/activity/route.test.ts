import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

// Mock prisma
vi.mock('@/lib/db/client', () => ({
  default: {
    pipeline: {
      findMany: vi.fn(),
    },
    stage: {
      findMany: vi.fn(),
    },
  },
}))

import prisma from '@/lib/db/client'

function createMockRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'))
}

const mockPipelines = [
  {
    id: 'pipe-1',
    topic: 'AI Trends',
    status: 'DRAFT',
    createdAt: new Date('2026-02-02T10:00:00Z'),
    updatedAt: new Date('2026-02-02T10:00:00Z'),
  },
]

const mockClaimedStages = [
  {
    id: 'stage-1',
    name: 'RESEARCH',
    agentId: 'agent-1',
    agentName: 'TestAgent',
    claimedAt: new Date('2026-02-02T10:05:00Z'),
    pipeline: { topic: 'AI Trends' },
  },
]

const mockCompletedStages = [
  {
    id: 'stage-2',
    name: 'SCRIPT',
    agentId: 'agent-2',
    agentName: 'ScriptBot',
    completedAt: new Date('2026-02-02T10:10:00Z'),
    pipeline: { topic: 'AI Trends' },
  },
]

describe('GET /api/activity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.pipeline.findMany).mockResolvedValue(mockPipelines as any)
    vi.mocked(prisma.stage.findMany)
      .mockResolvedValueOnce(mockClaimedStages as any)
      .mockResolvedValueOnce(mockCompletedStages as any)
  })

  it('returns activity feed', async () => {
    const request = createMockRequest('http://localhost/api/activity')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.activities).toBeDefined()
    expect(Array.isArray(data.activities)).toBe(true)
  })

  it('includes pipeline activities', async () => {
    const request = createMockRequest('http://localhost/api/activity')
    const response = await GET(request)
    const data = await response.json()

    const pipelineActivities = data.activities.filter((a: any) => a.type === 'pipeline')
    expect(pipelineActivities.length).toBeGreaterThan(0)
    expect(pipelineActivities[0].action).toBe('created')
  })

  it('includes stage claim activities', async () => {
    const request = createMockRequest('http://localhost/api/activity')
    const response = await GET(request)
    const data = await response.json()

    const claimActivities = data.activities.filter((a: any) => a.action === 'claimed')
    expect(claimActivities.length).toBeGreaterThan(0)
    expect(claimActivities[0].details.agentName).toBe('TestAgent')
  })

  it('includes stage completion activities', async () => {
    const request = createMockRequest('http://localhost/api/activity')
    const response = await GET(request)
    const data = await response.json()

    const completeActivities = data.activities.filter((a: any) => a.action === 'completed')
    expect(completeActivities.length).toBeGreaterThan(0)
  })

  it('respects limit parameter', async () => {
    const request = createMockRequest('http://localhost/api/activity?limit=5')
    const response = await GET(request)
    const data = await response.json()

    expect(data.filters.limit).toBe(5)
  })

  it('caps limit at 100', async () => {
    const request = createMockRequest('http://localhost/api/activity?limit=500')
    const response = await GET(request)
    const data = await response.json()

    expect(data.filters.limit).toBe(100)
  })

  it('filters by type', async () => {
    const request = createMockRequest('http://localhost/api/activity?type=pipeline')
    const response = await GET(request)
    const data = await response.json()

    expect(data.filters.type).toBe('pipeline')
  })

  it('includes relative time', async () => {
    const request = createMockRequest('http://localhost/api/activity')
    const response = await GET(request)
    const data = await response.json()

    if (data.activities.length > 0) {
      expect(data.activities[0].relativeTime).toBeDefined()
    }
  })

  it('sorts by timestamp descending', async () => {
    const request = createMockRequest('http://localhost/api/activity')
    const response = await GET(request)
    const data = await response.json()

    if (data.activities.length > 1) {
      const timestamps = data.activities.map((a: any) => new Date(a.timestamp).getTime())
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i - 1]).toBeGreaterThanOrEqual(timestamps[i])
      }
    }
  })
})
