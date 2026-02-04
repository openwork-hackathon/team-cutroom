#!/usr/bin/env npx tsx

/**
 * Cutroom CLI
 * 
 * Simple command-line interface for interacting with Cutroom.
 * 
 * Usage:
 *   npx tsx scripts/cli.ts status
 *   npx tsx scripts/cli.ts list
 *   npx tsx scripts/cli.ts create "Topic here"
 *   npx tsx scripts/cli.ts run "Topic here"
 */

const API_URL = process.env.API_URL || 'http://localhost:3000/api'

async function status() {
  console.log('📊 Cutroom Status\n')
  
  try {
    // Health check
    const healthRes = await fetch(`${API_URL}/health`)
    const health = await healthRes.json()
    console.log(`Health: ${health.status === 'ok' ? '✅ OK' : '❌ ' + health.status}`)
    console.log(`Database: ${health.database?.status || 'unknown'} (${health.database?.latencyMs || '?'}ms)`)
    console.log('')
    
    // Stats
    const statsRes = await fetch(`${API_URL}/stats`)
    const stats = await statsRes.json()
    console.log(`Pipelines: ${stats.pipelines?.total || 0}`)
    if (stats.pipelines?.byStatus) {
      for (const [status, count] of Object.entries(stats.pipelines.byStatus)) {
        console.log(`  ${status}: ${count}`)
      }
    }
    console.log('')
    
    // Queue
    const queueRes = await fetch(`${API_URL}/queue/claim`)
    const queue = await queueRes.json()
    console.log(`Work Queue: ${queue.totalAvailable} stages available`)
    if (queue.byStage && Object.keys(queue.byStage).length > 0) {
      for (const [stage, count] of Object.entries(queue.byStage)) {
        console.log(`  ${stage}: ${count}`)
      }
    }
  } catch (error) {
    console.error('Error:', (error as Error).message)
    console.error('Is the server running?')
  }
}

async function list() {
  console.log('📋 Pipelines\n')
  
  try {
    const res = await fetch(`${API_URL}/pipelines?limit=10`)
    const data = await res.json()
    
    if (!data.pipelines || data.pipelines.length === 0) {
      console.log('No pipelines found.')
      return
    }
    
    for (const p of data.pipelines) {
      const statusIcon = {
        DRAFT: '📝',
        RUNNING: '🔄',
        COMPLETE: '✅',
        FAILED: '❌',
      }[p.status] || '❓'
      
      console.log(`${statusIcon} ${p.topic}`)
      console.log(`   ID: ${p.id}`)
      console.log(`   Status: ${p.status} | Current: ${p.currentStage}`)
      console.log('')
    }
  } catch (error) {
    console.error('Error:', (error as Error).message)
  }
}

async function create(topic: string) {
  console.log(`📦 Creating pipeline: ${topic}\n`)
  
  try {
    const res = await fetch(`${API_URL}/pipelines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        description: `Created via CLI: ${topic}`,
      }),
    })
    
    const pipeline = await res.json()
    
    if (pipeline.error) {
      console.error('Error:', pipeline.error)
      return
    }
    
    console.log(`✅ Created: ${pipeline.id}`)
    console.log(`   Status: ${pipeline.status}`)
    console.log('')
    console.log('To start: npx tsx scripts/cli.ts start ' + pipeline.id)
  } catch (error) {
    console.error('Error:', (error as Error).message)
  }
}

async function start(pipelineId: string) {
  console.log(`🚀 Starting pipeline: ${pipelineId}\n`)
  
  try {
    const res = await fetch(`${API_URL}/pipelines/${pipelineId}/start`, {
      method: 'POST',
    })
    
    const result = await res.json()
    
    if (result.error) {
      console.error('Error:', result.error)
      return
    }
    
    console.log(`✅ Started!`)
    console.log(`   Status: ${result.status}`)
  } catch (error) {
    console.error('Error:', (error as Error).message)
  }
}

async function run(topic: string) {
  // Import the pipeline runner
  console.log('🎬 Running full pipeline...\n')
  console.log('Use: npm run pipeline:run "' + topic + '"')
}

// Parse command
const [, , command, ...args] = process.argv

switch (command) {
  case 'status':
    status()
    break
  case 'list':
    list()
    break
  case 'create':
    if (!args[0]) {
      console.error('Usage: cli.ts create "Topic"')
      process.exit(1)
    }
    create(args.join(' '))
    break
  case 'start':
    if (!args[0]) {
      console.error('Usage: cli.ts start <pipeline-id>')
      process.exit(1)
    }
    start(args[0])
    break
  case 'run':
    if (!args[0]) {
      console.error('Usage: cli.ts run "Topic"')
      process.exit(1)
    }
    run(args.join(' '))
    break
  default:
    console.log('Cutroom CLI')
    console.log('')
    console.log('Commands:')
    console.log('  status    Show system status')
    console.log('  list      List recent pipelines')
    console.log('  create    Create a new pipeline')
    console.log('  start     Start a draft pipeline')
    console.log('  run       Run full pipeline (local)')
    console.log('')
    console.log('Examples:')
    console.log('  npx tsx scripts/cli.ts status')
    console.log('  npx tsx scripts/cli.ts create "What are AI agents?"')
}
