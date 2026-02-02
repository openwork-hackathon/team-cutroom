import prisma from '@/lib/db/client'
import { PipelineStatus, StageStatus, StageName, Pipeline, Stage } from '@prisma/client'

// Stage execution order
export const STAGE_ORDER: StageName[] = [
  'RESEARCH',
  'SCRIPT', 
  'VOICE',
  'MUSIC',
  'VISUAL',
  'EDITOR',
  'PUBLISH'
]

// Get next stage in order
export function getNextStageName(current: StageName): StageName | null {
  const idx = STAGE_ORDER.indexOf(current)
  if (idx === -1 || idx === STAGE_ORDER.length - 1) return null
  return STAGE_ORDER[idx + 1]
}

// Create a new pipeline with all stages
export async function createPipeline(topic: string, description?: string): Promise<Pipeline & { stages: Stage[] }> {
  return prisma.pipeline.create({
    data: {
      topic,
      description,
      status: 'DRAFT',
      currentStage: 'RESEARCH',
      stages: {
        create: STAGE_ORDER.map(name => ({
          name,
          status: 'PENDING'
        }))
      }
    },
    include: { stages: true }
  })
}

// Start pipeline execution
export async function startPipeline(pipelineId: string): Promise<Pipeline> {
  return prisma.pipeline.update({
    where: { id: pipelineId },
    data: { status: 'RUNNING' }
  })
}

// Claim a stage for an agent
export async function claimStage(
  pipelineId: string, 
  stageName: StageName, 
  agentId: string, 
  agentName: string
): Promise<Stage> {
  // Verify pipeline is running
  const pipeline = await prisma.pipeline.findUnique({
    where: { id: pipelineId }
  })
  
  if (!pipeline || pipeline.status !== 'RUNNING') {
    throw new Error('Pipeline not in running state')
  }
  
  // Verify this is the current stage or previous is complete
  const stage = await prisma.stage.findUnique({
    where: { pipelineId_name: { pipelineId, name: stageName } }
  })
  
  if (!stage) {
    throw new Error('Stage not found')
  }
  
  if (stage.status !== 'PENDING') {
    throw new Error('Stage not available for claiming')
  }
  
  // Check if previous stage is complete (if not first)
  const stageIdx = STAGE_ORDER.indexOf(stageName)
  if (stageIdx > 0) {
    const prevStageName = STAGE_ORDER[stageIdx - 1]
    const prevStage = await prisma.stage.findUnique({
      where: { pipelineId_name: { pipelineId, name: prevStageName } }
    })
    
    if (!prevStage || (prevStage.status !== 'COMPLETE' && prevStage.status !== 'SKIPPED')) {
      throw new Error('Previous stage not complete')
    }
  }
  
  return prisma.stage.update({
    where: { id: stage.id },
    data: {
      status: 'CLAIMED',
      agentId,
      agentName,
      startedAt: new Date()
    }
  })
}

// Mark stage as running
export async function startStage(stageId: string): Promise<Stage> {
  return prisma.stage.update({
    where: { id: stageId },
    data: { status: 'RUNNING' }
  })
}

// Complete a stage with output
export async function completeStage(
  stageId: string, 
  output: unknown, 
  artifacts: string[] = []
): Promise<{ stage: Stage; pipeline: Pipeline }> {
  const stage = await prisma.stage.update({
    where: { id: stageId },
    data: {
      status: 'COMPLETE',
      output: output as any,
      artifacts,
      completedAt: new Date()
    },
    include: { pipeline: true }
  })
  
  // Check if pipeline is complete
  const nextStageName = getNextStageName(stage.name)
  
  let pipeline: Pipeline
  if (!nextStageName) {
    // This was the last stage
    pipeline = await prisma.pipeline.update({
      where: { id: stage.pipelineId },
      data: { status: 'COMPLETE' }
    })
  } else {
    // Update current stage pointer
    pipeline = await prisma.pipeline.update({
      where: { id: stage.pipelineId },
      data: { currentStage: nextStageName }
    })
  }
  
  return { stage, pipeline }
}

// Fail a stage
export async function failStage(stageId: string, error: string): Promise<{ stage: Stage; pipeline: Pipeline }> {
  const stage = await prisma.stage.update({
    where: { id: stageId },
    data: {
      status: 'FAILED',
      error,
      completedAt: new Date()
    }
  })
  
  const pipeline = await prisma.pipeline.update({
    where: { id: stage.pipelineId },
    data: { status: 'FAILED' }
  })
  
  return { stage, pipeline }
}

// Get pipeline with all stages
export async function getPipeline(pipelineId: string) {
  return prisma.pipeline.findUnique({
    where: { id: pipelineId },
    include: { 
      stages: { 
        orderBy: { createdAt: 'asc' } 
      } 
    }
  })
}

// List pipelines
export async function listPipelines(limit = 20, status?: PipelineStatus) {
  return prisma.pipeline.findMany({
    where: status ? { status } : undefined,
    include: { stages: true },
    orderBy: { createdAt: 'desc' },
    take: limit
  })
}

// Get available stages (for agents looking for work)
export async function getAvailableStages() {
  // Find stages that are PENDING and whose previous stage is COMPLETE
  const runningPipelines = await prisma.pipeline.findMany({
    where: { status: 'RUNNING' },
    include: { stages: { orderBy: { createdAt: 'asc' } } }
  })
  
  const available: (Stage & { pipeline: Pipeline })[] = []
  
  for (const pipeline of runningPipelines) {
    for (let i = 0; i < pipeline.stages.length; i++) {
      const stage = pipeline.stages[i]
      
      if (stage.status !== 'PENDING') continue
      
      // Check if previous stage is complete (or this is first stage)
      if (i === 0 || ['COMPLETE', 'SKIPPED'].includes(pipeline.stages[i - 1].status)) {
        available.push({ ...stage, pipeline })
      }
    }
  }
  
  return available
}
