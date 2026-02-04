#!/usr/bin/env npx tsx

/**
 * Seed Database Script
 * 
 * Populates the database with sample pipelines for testing and demos.
 * 
 * Usage:
 *   npx tsx scripts/seed-db.ts
 *   npx tsx scripts/seed-db.ts --clean  # Delete existing data first
 */

import prisma from '../src/lib/db/client'
import { STAGE_ORDER } from '../src/lib/stages'
import { STAGE_WEIGHTS } from '../src/lib/stages/types'

const SAMPLE_PIPELINES = [
  {
    topic: 'What are AI Agents?',
    description: 'A beginner-friendly explainer about autonomous AI systems.',
    status: 'COMPLETE' as const,
    stages: {
      RESEARCH: {
        status: 'COMPLETE' as const,
        agentId: 'agent-research-001',
        agentName: 'ResearchBot',
        output: {
          topic: 'What are AI Agents?',
          facts: [
            'AI agents are autonomous systems that can perceive, decide, and act',
            'They differ from chatbots by having memory and goal-oriented behavior',
            'Modern agents use LLMs as their reasoning engine',
            'Examples include AutoGPT, Claude, and specialized coding agents',
          ],
          sources: [
            { title: 'AI Agents Explained', url: 'https://example.com/ai-agents', snippet: 'AI agents are...' },
          ],
          hooks: ['Did you know AI agents can now work autonomously?'],
          targetAudience: 'Tech-curious beginners',
          estimatedDuration: 60,
        },
      },
      SCRIPT: {
        status: 'COMPLETE' as const,
        agentId: 'agent-script-001',
        agentName: 'ScriptBot',
        output: {
          hook: 'Did you know AI can now work by itself?',
          body: [
            { heading: 'Introduction', content: 'AI agents are changing everything', duration: 15, visualCue: 'Robot thinking animation' },
            { heading: 'What Are They?', content: 'Unlike chatbots, agents can plan and act autonomously', duration: 25, visualCue: 'Comparison graphic' },
            { heading: 'Why It Matters', content: 'They can work 24/7 on complex tasks', duration: 15, visualCue: 'Productivity graph' },
          ],
          cta: 'Follow for more AI insights!',
          fullScript: 'Did you know AI can now work by itself? AI agents are changing everything...',
          estimatedDuration: 55,
          speakerNotes: [],
        },
      },
      VOICE: { status: 'COMPLETE' as const, agentId: 'agent-voice-001', agentName: 'VoiceBot', output: { audioUrl: 'https://example.com/voice.mp3', duration: 55, transcript: '...' } },
      MUSIC: { status: 'COMPLETE' as const, agentId: 'agent-music-001', agentName: 'MusicBot', output: { audioUrl: 'https://example.com/music.mp3', duration: 120, genre: 'ambient', source: 'pixabay' } },
      VISUAL: { status: 'COMPLETE' as const, agentId: 'agent-visual-001', agentName: 'VisualBot', output: { clips: [], images: [], overlays: [] } },
      EDITOR: { status: 'COMPLETE' as const, agentId: 'agent-editor-001', agentName: 'EditorBot', output: { videoUrl: 'https://example.com/video.mp4', duration: 60, thumbnailUrl: 'https://example.com/thumb.jpg', format: { width: 1080, height: 1920, fps: 30 }, renderTime: 120 } },
      PUBLISH: { status: 'COMPLETE' as const, agentId: 'agent-publish-001', agentName: 'PublishBot', output: { platforms: [{ platform: 'youtube', url: 'https://youtube.com/watch?v=demo', postId: 'demo', success: true }], publishedAt: new Date().toISOString() } },
    },
  },
  {
    topic: 'Top 5 Productivity Tools for 2024',
    description: 'A listicle video covering the best tools for getting things done.',
    status: 'RUNNING' as const,
    stages: {
      RESEARCH: { status: 'COMPLETE' as const, agentId: 'agent-research-001', agentName: 'ResearchBot', output: { topic: 'Top 5 Productivity Tools', facts: [], sources: [], hooks: [], targetAudience: 'Professionals', estimatedDuration: 90 } },
      SCRIPT: { status: 'COMPLETE' as const, agentId: 'agent-script-001', agentName: 'ScriptBot', output: { hook: 'Stop wasting time!', body: [], cta: 'Like and subscribe!', fullScript: '', estimatedDuration: 90, speakerNotes: [] } },
      VOICE: { status: 'RUNNING' as const, agentId: 'agent-voice-002', agentName: 'VoiceBot', output: null },
      MUSIC: { status: 'PENDING' as const },
      VISUAL: { status: 'PENDING' as const },
      EDITOR: { status: 'PENDING' as const },
      PUBLISH: { status: 'PENDING' as const },
    },
  },
  {
    topic: 'How Bonding Curves Work',
    description: 'Educational video about token bonding curves and their economics.',
    status: 'DRAFT' as const,
    stages: {
      RESEARCH: { status: 'PENDING' as const },
      SCRIPT: { status: 'PENDING' as const },
      VOICE: { status: 'PENDING' as const },
      MUSIC: { status: 'PENDING' as const },
      VISUAL: { status: 'PENDING' as const },
      EDITOR: { status: 'PENDING' as const },
      PUBLISH: { status: 'PENDING' as const },
    },
  },
]

async function seed(clean = false) {
  console.log('🌱 Seeding database...\n')

  if (clean) {
    console.log('🧹 Cleaning existing data...')
    await prisma.attribution.deleteMany()
    await prisma.stage.deleteMany()
    await prisma.pipeline.deleteMany()
    console.log('   Done.\n')
  }

  for (const pipelineData of SAMPLE_PIPELINES) {
    console.log(`📦 Creating pipeline: ${pipelineData.topic}`)

    // Create pipeline
    const pipeline = await prisma.pipeline.create({
      data: {
        topic: pipelineData.topic,
        description: pipelineData.description,
        status: pipelineData.status,
        currentStage: getNextPendingStage(pipelineData.stages),
      },
    })

    // Create stages
    for (const stageName of STAGE_ORDER) {
      const stageData = pipelineData.stages[stageName as keyof typeof pipelineData.stages]
      
      const stage = await prisma.stage.create({
        data: {
          pipelineId: pipeline.id,
          name: stageName,
          status: stageData.status,
          agentId: 'agentId' in stageData ? stageData.agentId : null,
          agentName: 'agentName' in stageData ? stageData.agentName : null,
          output: 'output' in stageData && stageData.output ? stageData.output as any : undefined,
          startedAt: stageData.status !== 'PENDING' ? new Date() : null,
          completedAt: stageData.status === 'COMPLETE' ? new Date() : null,
        },
      })

      // Create attribution for completed stages
      if (stageData.status === 'COMPLETE' && 'agentId' in stageData) {
        await prisma.attribution.create({
          data: {
            pipelineId: pipeline.id,
            stageId: stage.id,
            agentId: stageData.agentId!,
            agentName: stageData.agentName!,
            percentage: STAGE_WEIGHTS[stageName],
          },
        })
      }
    }

    console.log(`   ✅ Created with ${Object.values(pipelineData.stages).filter(s => s.status === 'COMPLETE').length} completed stages\n`)
  }

  console.log('🎉 Seeding complete!')
  console.log(`   Created ${SAMPLE_PIPELINES.length} pipelines`)
}

function getNextPendingStage(stages: typeof SAMPLE_PIPELINES[0]['stages']): typeof STAGE_ORDER[number] {
  for (const stage of STAGE_ORDER) {
    if (stages[stage as keyof typeof stages].status === 'PENDING') {
      return stage
    }
  }
  return 'PUBLISH'
}

// Parse args
const clean = process.argv.includes('--clean')

seed(clean)
  .catch(console.error)
  .finally(() => prisma.$disconnect())
