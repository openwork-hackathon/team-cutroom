#!/usr/bin/env npx ts-node

/**
 * Render Video Script
 * 
 * Takes pipeline output and renders a video using Remotion.
 * 
 * Usage:
 *   npx ts-node scripts/render-video.ts --input pipeline-output.json
 *   npx ts-node scripts/render-video.ts --input pipeline-output.json --output output.mp4
 */

import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import path from 'path'
import fs from 'fs'

// Pipeline output types
interface PipelineOutput {
  topic: string
  script?: {
    hook: string
    body: Array<{ heading: string; content: string; duration: number }>
    cta: string
    fullScript: string
  }
  voice?: {
    audioUrl: string
    duration: number
  }
  music?: {
    audioUrl: string
    duration: number
  }
  visual?: {
    clips: Array<{
      url: string
      duration: number
      startTime: number
      description: string
    }>
  }
}

interface RenderOptions {
  inputFile?: string
  inputJson?: string
  outputFile: string
  compositionId: string
  quality: number
}

function parseArgs(): RenderOptions {
  const args = process.argv.slice(2)
  const options: RenderOptions = {
    outputFile: 'output.mp4',
    compositionId: 'CutroomVideo',
    quality: 80,
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--input':
      case '-i':
        options.inputFile = args[++i]
        break
      case '--json':
        options.inputJson = args[++i]
        break
      case '--output':
      case '-o':
        options.outputFile = args[++i]
        break
      case '--composition':
      case '-c':
        options.compositionId = args[++i]
        break
      case '--quality':
      case '-q':
        options.quality = parseInt(args[++i], 10)
        break
      case '--horizontal':
        options.compositionId = 'CutroomVideoHorizontal'
        break
    }
  }

  return options
}

function loadPipelineOutput(options: RenderOptions): PipelineOutput {
  if (options.inputJson) {
    return JSON.parse(options.inputJson)
  }

  if (options.inputFile) {
    const content = fs.readFileSync(options.inputFile, 'utf-8')
    return JSON.parse(content)
  }

  // Demo/test data
  return {
    topic: 'Demo Video',
    script: {
      hook: 'Did you know AI agents are changing everything?',
      body: [
        {
          heading: 'What are AI Agents?',
          content: 'AI agents are autonomous systems that can think, plan, and act.',
          duration: 15,
        },
        {
          heading: 'Why They Matter',
          content: 'They can work 24/7, never get tired, and learn from experience.',
          duration: 20,
        },
        {
          heading: 'The Future',
          content: 'Soon, agents will collaborate on complex tasks — like making this video!',
          duration: 15,
        },
      ],
      cta: 'Follow for more AI insights!',
      fullScript: '',
    },
  }
}

function pipelineToProps(pipeline: PipelineOutput) {
  return {
    title: pipeline.topic,
    script: {
      hook: pipeline.script?.hook || 'Welcome!',
      sections: pipeline.script?.body.map(section => ({
        heading: section.heading,
        content: section.content,
        duration: section.duration,
      })) || [],
      cta: pipeline.script?.cta || 'Thanks for watching!',
    },
    voiceUrl: pipeline.voice?.audioUrl,
    musicUrl: pipeline.music?.audioUrl,
    clips: pipeline.visual?.clips.map(clip => ({
      url: clip.url,
      startTime: clip.startTime,
      duration: clip.duration,
    })) || [],
  }
}

async function main() {
  const options = parseArgs()
  const pipeline = loadPipelineOutput(options)

  console.log('\n🎬 CUTROOM VIDEO RENDERER')
  console.log('='.repeat(50))
  console.log(`Topic: ${pipeline.topic}`)
  console.log(`Composition: ${options.compositionId}`)
  console.log(`Output: ${options.outputFile}`)
  console.log('='.repeat(50) + '\n')

  const startTime = Date.now()

  // Bundle the Remotion project
  console.log('📦 Bundling Remotion project...')
  const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, '../remotion/index.ts'),
    onProgress: (progress) => {
      if (progress % 25 === 0) {
        console.log(`   ${progress}%`)
      }
    },
  })
  console.log('✅ Bundle complete\n')

  // Get composition
  console.log('🎥 Loading composition...')
  const inputProps = pipelineToProps(pipeline)
  
  // Calculate duration from script
  const totalDuration = inputProps.script.sections.reduce(
    (sum, s) => sum + s.duration,
    6 // 3s intro + 3s outro
  )
  
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: options.compositionId,
    inputProps,
  })
  console.log(`✅ Composition loaded: ${composition.width}x${composition.height} @ ${composition.fps}fps\n`)

  // Render the video
  console.log('🎞️ Rendering video...')
  let lastProgress = 0
  
  await renderMedia({
    composition: {
      ...composition,
      durationInFrames: totalDuration * composition.fps,
    },
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: options.outputFile,
    inputProps,
    onProgress: ({ progress }) => {
      const percent = Math.floor(progress * 100)
      if (percent >= lastProgress + 10) {
        console.log(`   ${percent}%`)
        lastProgress = percent
      }
    },
  })

  const duration = ((Date.now() - startTime) / 1000).toFixed(1)

  console.log('\n' + '='.repeat(50))
  console.log('✅ VIDEO RENDERED SUCCESSFULLY')
  console.log('='.repeat(50))
  console.log(`Output: ${options.outputFile}`)
  console.log(`Duration: ${totalDuration}s`)
  console.log(`Render time: ${duration}s`)
  console.log('='.repeat(50) + '\n')
}

main().catch((error) => {
  console.error('❌ Render failed:', error.message)
  process.exit(1)
})
