#!/usr/bin/env npx tsx

/**
 * Demo Mode Pipeline Runner
 * 
 * Runs through the pipeline stages with mock outputs to demonstrate
 * the system flow. Outputs a markdown file suitable for documentation.
 * 
 * Usage:
 *   npx tsx scripts/demo-run.ts
 */

const TOPIC = 'What are AI Agents?'
const OUTPUT_FILE = 'docs/DEMO_OUTPUT.md'

interface MockStage {
  name: string
  emoji: string
  duration: string
  output: Record<string, unknown>
}

const DEMO_STAGES: MockStage[] = [
  {
    name: 'RESEARCH',
    emoji: '🔍',
    duration: '2.3s',
    output: {
      topic: TOPIC,
      facts: [
        'AI agents are autonomous systems that perceive, decide, and act',
        'Unlike chatbots, agents have memory and goal-oriented behavior',
        'Modern agents use LLMs (like GPT-4, Claude) as reasoning engines',
        'Examples: AutoGPT, Devin, Claude Computer Use, OpenClaw',
      ],
      sources: [
        { title: 'Building AI Agents', url: 'https://example.com/ai-agents' },
        { title: 'The Agent Economy', url: 'https://example.com/agent-economy' },
      ],
      hooks: [
        'Did you know AI can now work completely on its own?',
        'The future of work is autonomous agents',
      ],
      targetAudience: 'Tech-curious beginners',
      estimatedDuration: 60,
    },
  },
  {
    name: 'SCRIPT',
    emoji: '📝',
    duration: '3.1s',
    output: {
      hook: 'Did you know AI can now work completely on its own?',
      body: [
        { heading: 'Introduction', content: 'AI agents are changing everything about how we work', duration: 15 },
        { heading: 'What Makes Them Different', content: 'Unlike chatbots, agents can plan, remember, and take action', duration: 20 },
        { heading: 'Real Examples', content: 'From coding to research to creative work, agents are doing it all', duration: 15 },
        { heading: 'The Future', content: 'Soon, everyone will have their own AI agent workforce', duration: 10 },
      ],
      cta: 'Follow for more AI insights!',
      estimatedDuration: 60,
    },
  },
  {
    name: 'VOICE',
    emoji: '🎙️',
    duration: '8.2s',
    output: {
      audioUrl: 'https://storage.cutroom.ai/demo/voice-001.mp3',
      duration: 58,
      transcript: 'Did you know AI can now work completely on its own? AI agents are changing everything...',
      voice: 'alloy',
      model: 'tts-1-hd',
    },
  },
  {
    name: 'MUSIC',
    emoji: '🎵',
    duration: '1.5s',
    output: {
      audioUrl: 'https://storage.cutroom.ai/demo/music-ambient-tech.mp3',
      duration: 120,
      genre: 'ambient',
      mood: 'inspiring',
      bpm: 90,
    },
  },
  {
    name: 'VISUAL',
    emoji: '🎨',
    duration: '4.7s',
    output: {
      clips: [
        { url: 'https://storage.cutroom.ai/demo/clip-robot.mp4', duration: 5, description: 'Robot thinking' },
        { url: 'https://storage.cutroom.ai/demo/clip-code.mp4', duration: 4, description: 'Code being written' },
      ],
      images: [
        { url: 'https://storage.cutroom.ai/demo/img-agent.jpg', description: 'AI agent illustration' },
      ],
      overlays: [
        { type: 'text', content: 'AI AGENTS', style: 'title' },
      ],
    },
  },
  {
    name: 'EDITOR',
    emoji: '🎬',
    duration: '12.4s',
    output: {
      videoUrl: 'https://storage.cutroom.ai/demo/final-video.mp4',
      thumbnailUrl: 'https://storage.cutroom.ai/demo/thumbnail.jpg',
      duration: 60,
      format: { width: 1080, height: 1920, fps: 30 },
      renderTime: 12400,
    },
  },
  {
    name: 'PUBLISH',
    emoji: '🚀',
    duration: '2.1s',
    output: {
      platforms: [
        { platform: 'youtube', url: 'https://youtube.com/shorts/demo123', success: true },
        { platform: 'tiktok', url: 'https://tiktok.com/@cutroom/video/demo123', success: true },
        { platform: 'twitter', url: 'https://twitter.com/cutroom/status/demo123', success: true },
      ],
      publishedAt: new Date().toISOString(),
    },
  },
]

function generateMarkdown(): string {
  const lines: string[] = []
  
  lines.push('# Demo Output: Cutroom Pipeline')
  lines.push('')
  lines.push(`**Topic:** ${TOPIC}`)
  lines.push(`**Generated:** ${new Date().toISOString()}`)
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## Pipeline Execution')
  lines.push('')
  
  for (const stage of DEMO_STAGES) {
    lines.push(`### ${stage.emoji} ${stage.name}`)
    lines.push('')
    lines.push(`**Duration:** ${stage.duration}`)
    lines.push('')
    lines.push('```json')
    lines.push(JSON.stringify(stage.output, null, 2))
    lines.push('```')
    lines.push('')
  }
  
  lines.push('---')
  lines.push('')
  lines.push('## Attribution')
  lines.push('')
  lines.push('| Stage | Agent | Contribution |')
  lines.push('|-------|-------|--------------|')
  lines.push('| RESEARCH | ResearchBot | 10% |')
  lines.push('| SCRIPT | ScriptBot | 25% |')
  lines.push('| VOICE | VoiceBot | 20% |')
  lines.push('| MUSIC | MusicBot | 10% |')
  lines.push('| VISUAL | VisualBot | 15% |')
  lines.push('| EDITOR | EditorBot | 15% |')
  lines.push('| PUBLISH | PublishBot | 5% |')
  lines.push('')
  lines.push('**Total contributors:** 7 agents')
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('*This demo output shows the structure of a completed Cutroom pipeline.*')
  
  return lines.join('\n')
}

async function main() {
  console.log('🎬 Cutroom Demo Run')
  console.log(`   Topic: ${TOPIC}`)
  console.log('')
  
  let totalTime = 0
  
  for (const stage of DEMO_STAGES) {
    const duration = parseFloat(stage.duration)
    totalTime += duration
    
    console.log(`${stage.emoji} ${stage.name}`)
    console.log(`   ✓ Complete (${stage.duration})`)
  }
  
  console.log('')
  console.log(`⏱️  Total time: ${totalTime.toFixed(1)}s`)
  console.log('')
  
  // Write output file
  const fs = await import('fs')
  const markdown = generateMarkdown()
  fs.writeFileSync(OUTPUT_FILE, markdown)
  
  console.log(`📄 Output written to: ${OUTPUT_FILE}`)
}

main().catch(console.error)
