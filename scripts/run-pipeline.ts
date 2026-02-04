#!/usr/bin/env npx tsx

/**
 * End-to-End Pipeline Runner
 * 
 * Runs a complete Cutroom pipeline from topic to final output.
 * 
 * Usage:
 *   npx tsx scripts/run-pipeline.ts "Top 5 AI tools for developers"
 *   npx tsx scripts/run-pipeline.ts --topic "What are AI agents?" --skip-publish
 */

// Load environment variables from .env.local
import { config } from 'dotenv'
config({ path: '.env.local' })

import { 
  STAGE_ORDER, 
  getStageHandler, 
  StageContext, 
  StageResult,
  ResearchOutput,
  ScriptOutput,
  VoiceOutput,
  MusicOutput,
  VisualOutput,
  EditorOutput,
  PublishOutput,
} from '../src/lib/stages'
import { StageName } from '@prisma/client'

// Parse CLI arguments
interface RunOptions {
  topic: string
  description?: string
  skipPublish?: boolean
  skipMusic?: boolean
  dryRun?: boolean
  verbose?: boolean
}

function parseArgs(): RunOptions {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.error('Usage: npx tsx scripts/run-pipeline.ts "Your topic here"')
    console.error('       npx tsx scripts/run-pipeline.ts --topic "Topic" --skip-publish')
    process.exit(1)
  }
  
  // Simple topic string
  if (!args[0].startsWith('--')) {
    return { topic: args.join(' ') }
  }
  
  // Parse flags
  const options: RunOptions = { topic: '' }
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--topic':
        options.topic = args[++i]
        break
      case '--description':
        options.description = args[++i]
        break
      case '--skip-publish':
        options.skipPublish = true
        break
      case '--skip-music':
        options.skipMusic = true
        break
      case '--dry-run':
        options.dryRun = true
        break
      case '--verbose':
      case '-v':
        options.verbose = true
        break
    }
  }
  
  if (!options.topic) {
    console.error('Error: --topic is required')
    process.exit(1)
  }
  
  return options
}

// Stage output accumulator
interface PipelineState {
  topic: string
  description?: string
  research?: ResearchOutput
  script?: ScriptOutput
  voice?: VoiceOutput
  music?: MusicOutput
  visual?: VisualOutput
  editor?: EditorOutput
  publish?: PublishOutput
}

// Logging helpers
function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`)
}

function logStage(stage: string, status: 'start' | 'complete' | 'skip' | 'fail', details?: string) {
  const icons = {
    start: '🚀',
    complete: '✅',
    skip: '⏭️',
    fail: '❌',
  }
  const icon = icons[status]
  log(`${icon} ${stage}: ${status.toUpperCase()}${details ? ` - ${details}` : ''}`)
}

async function runStage(
  stageName: StageName,
  state: PipelineState,
  options: RunOptions
): Promise<StageResult> {
  const handler = getStageHandler(stageName)
  
  // Build context with previous stage output
  let previousOutput: unknown
  let input: Record<string, unknown> = { topic: state.topic }
  
  switch (stageName) {
    case 'RESEARCH':
      input = { topic: state.topic, description: state.description }
      break
    case 'SCRIPT':
      previousOutput = state.research
      input = { research: state.research }
      break
    case 'VOICE':
      previousOutput = state.script
      input = { script: state.script }
      break
    case 'MUSIC':
      previousOutput = state.script
      input = { script: state.script }
      break
    case 'VISUAL':
      previousOutput = state.script
      input = { script: state.script }
      break
    case 'EDITOR':
      previousOutput = {
        voice: state.voice,
        music: state.music,
        visual: state.visual,
        script: state.script,
      }
      input = {
        voice: state.voice,
        music: state.music,
        visual: state.visual,
        script: state.script,
      }
      break
    case 'PUBLISH':
      previousOutput = state.editor
      input = { editor: state.editor }
      break
  }
  
  const context: StageContext = {
    pipelineId: `local-${Date.now()}`,
    stageId: `${stageName.toLowerCase()}-${Date.now()}`,
    input,
    previousOutput,
    dryRun: options.dryRun,
  }
  
  return handler.execute(context)
}

async function main() {
  const options = parseArgs()
  
  console.log('\n' + '='.repeat(60))
  console.log('🎬 CUTROOM PIPELINE RUNNER')
  console.log('='.repeat(60))
  log(`Topic: ${options.topic}`)
  if (options.description) log(`Description: ${options.description}`)
  if (options.dryRun) log('Mode: DRY RUN (no actual API calls)')
  console.log('='.repeat(60) + '\n')
  
  const state: PipelineState = {
    topic: options.topic,
    description: options.description,
  }
  
  const startTime = Date.now()
  
  // Determine which stages to run
  const stagesToRun = STAGE_ORDER.filter(stage => {
    if (options.skipPublish && stage === 'PUBLISH') return false
    if (options.skipMusic && stage === 'MUSIC') return false
    return true
  })
  
  // Run each stage in sequence
  for (const stageName of stagesToRun) {
    logStage(stageName, 'start')
    
    try {
      const result = await runStage(stageName, state, options)
      
      if (!result.success) {
        logStage(stageName, 'fail', result.error)
        console.error('\n❌ Pipeline failed at stage:', stageName)
        console.error('Error:', result.error)
        process.exit(1)
      }
      
      // Store output in state
      switch (stageName) {
        case 'RESEARCH':
          state.research = result.output as ResearchOutput
          break
        case 'SCRIPT':
          state.script = result.output as ScriptOutput
          break
        case 'VOICE':
          state.voice = result.output as VoiceOutput
          break
        case 'MUSIC':
          state.music = result.output as MusicOutput
          break
        case 'VISUAL':
          state.visual = result.output as VisualOutput
          break
        case 'EDITOR':
          state.editor = result.output as EditorOutput
          break
        case 'PUBLISH':
          state.publish = result.output as PublishOutput
          break
      }
      
      // Log completion with key metrics
      const metrics = formatMetrics(stageName, result)
      logStage(stageName, 'complete', metrics)
      
      if (options.verbose) {
        console.log('  Output:', JSON.stringify(result.output, null, 2).slice(0, 500) + '...')
      }
      
    } catch (error) {
      logStage(stageName, 'fail', (error as Error).message)
      console.error('\n❌ Pipeline failed at stage:', stageName)
      console.error('Error:', error)
      process.exit(1)
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1)
  
  console.log('\n' + '='.repeat(60))
  console.log('🎉 PIPELINE COMPLETE')
  console.log('='.repeat(60))
  log(`Total duration: ${duration}s`)
  log(`Stages completed: ${stagesToRun.length}`)
  
  if (state.editor?.videoUrl) {
    log(`Video URL: ${state.editor.videoUrl}`)
    log(`Video duration: ${state.editor.duration}s`)
  }
  
  if (state.publish?.platforms) {
    log('Published to:')
    for (const p of state.publish.platforms) {
      log(`  ${p.platform}: ${p.success ? p.url : `FAILED - ${p.error}`}`)
    }
  }
  
  console.log('='.repeat(60) + '\n')
  
  // Output final state as JSON for programmatic use
  if (options.verbose) {
    console.log('\nFull pipeline state:')
    console.log(JSON.stringify(state, null, 2))
  }
}

function formatMetrics(stageName: StageName, result: StageResult): string {
  const output = result.output
  if (!output) return ''
  
  switch (stageName) {
    case 'RESEARCH': {
      const o = output as ResearchOutput
      return `${o.facts?.length || 0} facts, ${o.sources?.length || 0} sources`
    }
    case 'SCRIPT': {
      const o = output as ScriptOutput
      return `${o.estimatedDuration || 0}s estimated`
    }
    case 'VOICE': {
      const o = output as VoiceOutput
      return `${o.duration || 0}s audio`
    }
    case 'MUSIC': {
      const o = output as MusicOutput
      return `${o.duration || 0}s track`
    }
    case 'VISUAL': {
      const o = output as VisualOutput
      return `${o.clips?.length || 0} clips, ${o.overlays?.length || 0} overlays`
    }
    case 'EDITOR': {
      const o = output as EditorOutput
      return `${o.duration || 0}s video, ${o.renderTime || 0}s render`
    }
    case 'PUBLISH': {
      const o = output as PublishOutput
      return `${o.platforms?.length || 0} platforms`
    }
    default:
      return ''
  }
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
