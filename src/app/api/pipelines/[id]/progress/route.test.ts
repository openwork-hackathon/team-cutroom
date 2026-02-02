import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

// Mock prisma
vi.mock('@/lib/db/client', () => ({
  default: {
    pipeline: {
      findUnique: vi.fn(),
    },
  },
}))

import prisma from '@/lib/db/client'

function createMockRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'))
}

const mockPipeline = {
  id: 'pipe-1',
  topic: 'AI Trends',
  status: 'SCRIPT',
  createdAt: new Date('2026-02-01'),
  updatedAt: new Date('2026-02-02'),
  stages: [
    { id: 's1', name: 'RESEARCH', status: 'COMPLETE', agentId: 'a1', agentName: 'Agent1', completedAt: new Date() },
    { id: 's2', name: 'SCRIPT', status: 'IN_PROGRESS', agentId: 'a2', agentName: 'Agent2', claimedAt: new Date() },
    { id: 's3', name: 'VOICE', status: 'PENDING', agentId: null, agentName: null },
    { id: 's4', name: 'MUSIC', status: 'PENDING', agentId: null, agentName: null },
    { id: 's5', name: 'VISUAL', status: 'PENDING', agentId: null, agentName: null },
    { id: 's6', name: 'EDITOR', status: 'PENDING', agentId: null, agentName: null },
    { id: 's7', name: 'PUBLISH', status: 'PENDING', agentId: null, agentName: null },
  ],
  attributions: [
    { agentId: 'a1', agentName: 'Agent1', stageName: 'RESEARCH', percentage: 10 },
  ],
}

describe('GET /api/pipelines/[id]/progress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns pipeline progress', async () => {
    vi.mocked(prisma.pipeline.findUnique).mockResolvedValue(mockPipeline as any)

    const request = createMockRequest('http://localhost/api/pipelines/pipe-1/progress')
    const response = await GET(request, { params: Promise.resolve({ id: 'pipe-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.pipeline.id).toBe('pipe-1')
    expect(data.progress).toBeDefined()
  })

  it('calculates progress percentage correctly', async () => {
    vi.mocked(prisma.pipeline.findUnique).mockResolvedValue(mockPipeline as any)

    const request = createMockRequest('http://localhost/api/pipelines/pipe-1/progress')
    const response = await GET(request, { params: Promise.resolve({ id: 'pipe-1' }) })
    const data = await response.json()

    // 1 of 7 stages complete = ~14%
    expect(data.progress.percent).toBe(14)
    expect(data.progress.completed).toBe(1)
    expect(data.progress.inProgress).toBe(1)
    expect(data.progress.pending).toBe(5)
  })

  it('returns 404 for unknown pipeline', async () => {
    vi.mocked(prisma.pipeline.findUnique).mockResolvedValue(null)

    const request = createMockRequest('http://localhost/api/pipelines/unknown/progress')
    const response = await GET(request, { params: Promise.resolve({ id: 'unknown' }) })

    expect(response.status).toBe(404)
  })

  it('includes stage details in order', async () => {
    vi.mocked(prisma.pipeline.findUnique).mockResolvedValue(mockPipeline as any)

    const request = createMockRequest('http://localhost/api/pipelines/pipe-1/progress')
    const response = await GET(request, { params: Promise.resolve({ id: 'pipe-1' }) })
    const data = await response.json()

    expect(data.stages[0].name).toBe('RESEARCH')
    expect(data.stages[0].order).toBe(1)
    expect(data.stages[6].name).toBe('PUBLISH')
    expect(data.stages[6].order).toBe(7)
  })

  it('includes time estimates', async () => {
    vi.mocked(prisma.pipeline.findUnique).mockResolvedValue(mockPipeline as any)

    const request = createMockRequest('http://localhost/api/pipelines/pipe-1/progress')
    const response = await GET(request, { params: Promise.resolve({ id: 'pipe-1' }) })
    const data = await response.json()

    expect(data.estimate).toBeDefined()
    expect(data.estimate.minutesRemaining).toBeGreaterThan(0)
    expect(data.estimate.eta).toBeDefined()
  })

  it('includes contributors list', async () => {
    vi.mocked(prisma.pipeline.findUnique).mockResolvedValue(mockPipeline as any)

    const request = createMockRequest('http://localhost/api/pipelines/pipe-1/progress')
    const response = await GET(request, { params: Promise.resolve({ id: 'pipe-1' }) })
    const data = await response.json()

    expect(data.contributors).toHaveLength(1)
    expect(data.contributors[0].agentName).toBe('Agent1')
  })

  it('shows agent assignments on stages', async () => {
    vi.mocked(prisma.pipeline.findUnique).mockResolvedValue(mockPipeline as any)

    const request = createMockRequest('http://localhost/api/pipelines/pipe-1/progress')
    const response = await GET(request, { params: Promise.resolve({ id: 'pipe-1' }) })
    const data = await response.json()

    const researchStage = data.stages.find((s: any) => s.name === 'RESEARCH')
    expect(researchStage.agentName).toBe('Agent1')
  })
})
