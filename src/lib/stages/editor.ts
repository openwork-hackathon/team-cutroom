import { z } from "zod"
import {
  StageHandler,
  StageContext,
  StageResult,
  ValidationResult,
  EditorOutput,
  VideoFormat,
  VoiceOutput,
  VisualOutput,
  ScriptOutput,
} from "./types"
import { 
  templateToRemotionProps, 
  getBackgroundUrl,
  calculateDurationInFrames,
  getVideoTemplate,
  RemotionTemplateProps,
} from "@/lib/templates"

// Input schema - expects voice and visual outputs from previous stages
const EditorInputSchema = z.object({
  voice: z.object({
    audioUrl: z.string(),
    duration: z.number(),
  }),
  visual: z.object({
    clips: z.array(z.any()),
    overlays: z.array(z.any()),
  }),
  format: z.object({
    width: z.number(),
    height: z.number(),
    fps: z.number(),
  }).optional(),
  // Template-based inputs
  templateId: z.string().optional(),
  template: z.any().optional(), // Pre-loaded template config from pipeline metadata
})

const DEFAULT_FORMAT: VideoFormat = {
  width: 1080,
  height: 1920, // 9:16 portrait for TikTok/Reels
  fps: 30,
  codec: "h264",
}

export const editorStage: StageHandler = {
  name: "EDITOR",

  validate(input: unknown): ValidationResult {
    const result = EditorInputSchema.safeParse(input)
    if (!result.success) {
      return {
        valid: false,
        errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
      }
    }
    return { valid: true }
  },

  async execute(context: StageContext): Promise<StageResult> {
    const startTime = Date.now()
    
    try {
      // Get inputs from previous stages
      // The pipeline manager should have accumulated outputs
      const input = context.input as any
      const voice = input.voice as VoiceOutput
      const visual = input.visual as VisualOutput
      const script = input.script as ScriptOutput | undefined
      
      const format = input.format || DEFAULT_FORMAT
      
      // Load template if specified
      let templateProps: RemotionTemplateProps | undefined
      let backgroundUrl: string | undefined
      
      if (input.templateId || input.template) {
        const template = input.template || getVideoTemplate(input.templateId)
        if (template) {
          templateProps = templateToRemotionProps(template)
          backgroundUrl = getBackgroundUrl(template.visuals)
        }
      }

      // Validate we have required inputs
      if (!voice?.audioUrl) {
        throw new Error("Voice output (audioUrl) is required")
      }
      if (!visual?.clips || visual.clips.length === 0) {
        throw new Error("Visual output (clips) is required")
      }

      // Calculate total duration from audio
      const duration = voice.duration

      // Generate video composition
      // In production: Use Remotion or ffmpeg
      const composition = generateComposition(voice, visual, format, duration, templateProps)

      // For MVP: Return mock video URL
      // In production: Actually render the video
      const videoUrl = await renderVideo(composition, context.pipelineId, templateProps)
      const thumbnailUrl = await generateThumbnail(visual.clips[0]?.url, context.pipelineId)

      const renderTime = (Date.now() - startTime) / 1000

      const output: EditorOutput = {
        videoUrl,
        duration,
        thumbnailUrl,
        format,
        renderTime,
      }

      return {
        success: true,
        output,
        artifacts: [
          { url: videoUrl, type: "video", name: "final.mp4" },
          { url: thumbnailUrl, type: "image", name: "thumbnail.jpg" },
        ],
        metadata: {
          composition: {
            clipCount: visual.clips.length,
            overlayCount: visual.overlays.length,
            hasAudio: true,
            templateId: input.templateId,
            templateStyle: templateProps?.visualStyle,
          },
          renderTime,
        },
      }
    } catch (error) {
      return {
        success: false,
        output: null,
        error: (error as Error).message,
      }
    }
  },
}

interface VideoComposition {
  format: VideoFormat
  duration: number
  tracks: {
    type: "audio" | "video" | "overlay"
    source: string
    startTime: number
    duration: number
    properties?: Record<string, unknown>
  }[]
  templateProps?: RemotionTemplateProps
}

function generateComposition(
  voice: VoiceOutput,
  visual: VisualOutput,
  format: VideoFormat,
  duration: number,
  templateProps?: RemotionTemplateProps
): VideoComposition {
  const tracks: VideoComposition["tracks"] = []

  // Add audio track
  tracks.push({
    type: "audio",
    source: voice.audioUrl,
    startTime: 0,
    duration,
  })

  // Add video clips
  for (const clip of visual.clips) {
    tracks.push({
      type: "video",
      source: clip.url,
      startTime: clip.startTime,
      duration: clip.duration,
      properties: {
        fit: "cover", // Cover the frame
      },
    })
  }

  // Add overlays
  for (const overlay of visual.overlays) {
    tracks.push({
      type: "overlay",
      source: overlay.content,
      startTime: overlay.startTime,
      duration: overlay.duration,
      properties: overlay.style,
    })
  }

  return {
    format,
    duration,
    tracks,
    templateProps, // Include template config for renderer
  }
}

async function renderVideo(
  composition: VideoComposition, 
  pipelineId: string,
  templateProps?: RemotionTemplateProps
): Promise<string> {
  // TODO: Implement actual video rendering
  // Options:
  // 1. Remotion (React-based video rendering)
  // 2. FFmpeg via serverless function
  // 3. External API like Shotstack, Creatomate
  
  // Determine composition ID based on template
  let compositionId = 'CutroomVideo'
  if (templateProps) {
    if (templateProps.isDialog) {
      compositionId = 'DialogExplainer'
    } else if (templateProps.visualStyle === 'gameplay') {
      compositionId = 'RedditMinecraft'
    } else if (templateProps.visualStyle === 'gradient') {
      compositionId = 'BedtimeStory'
    } else {
      compositionId = 'TemplateVideo'
    }
  }
  
  // For MVP: Return placeholder URL with template info
  return `https://placeholder.blob.vercel.com/video/${pipelineId}/${compositionId}/final.mp4`
}

async function generateThumbnail(clipUrl: string | undefined, pipelineId: string): Promise<string> {
  // TODO: Extract frame from first clip
  // For MVP: Return placeholder
  return `https://placeholder.blob.vercel.com/video/${pipelineId}/thumbnail.jpg`
}
