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
      const thumbnailUrl = await generateThumbnail(visual.clips[0]?.url, context.pipelineId, composition, templateProps)

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

function getCompositionId(templateProps?: RemotionTemplateProps): string {
  if (!templateProps) return "CutroomVideo"
  if (templateProps.isDialog) return "DialogExplainer"
  if (templateProps.visualStyle === "gameplay") return "RedditMinecraft"
  if (templateProps.visualStyle === "gradient") return "BedtimeStory"
  return "TemplateVideo"
}

function buildInputProps(
  composition: VideoComposition,
  templateProps?: RemotionTemplateProps
): Record<string, unknown> {
  const overlays = composition.tracks.filter((t) => t.type === "overlay")
  const voiceTrack = composition.tracks.find((t) => t.type === "audio")
  const videoTracks = composition.tracks.filter((t) => t.type === "video")

  return {
    title: "Cutroom Video",
    script: {
      hook: overlays[0]?.source || "Welcome",
      sections:
        overlays.slice(1).map((t) => ({
          heading: "",
          content: t.source as string,
          duration: t.duration,
        })) || [],
      cta: "Follow for more!",
    },
    voiceUrl: voiceTrack?.source,
    clips: videoTracks.map((t) => ({
      url: t.source,
      startTime: t.startTime,
      duration: t.duration,
    })),
    ...(templateProps && { template: templateProps }),
  }
}

async function renderVideo(
  composition: VideoComposition,
  pipelineId: string,
  templateProps?: RemotionTemplateProps
): Promise<string> {
  const compositionId = getCompositionId(templateProps)

  // Skip actual rendering in test environment
  if (process.env.NODE_ENV === "test") {
    return `https://placeholder.blob.vercel.com/video/${pipelineId}/${compositionId}/final.mp4`
  }

  try {
    const { renderVideoToFile } = await import("@/lib/rendering")
    const { uploadVideoBlob } = await import("@/lib/storage")
    const path = await import("path")
    const fs = await import("fs")

    const inputProps = buildInputProps(composition, templateProps)
    const fps = composition.format.fps || 30
    const durationInFrames = Math.ceil(composition.duration * fps)

    const tmpDir = path.resolve(process.cwd(), ".tmp")
    const outputPath = path.join(tmpDir, `${pipelineId}-${Date.now()}.mp4`)

    console.log(`Rendering video: composition=${compositionId}, duration=${composition.duration}s`)

    await renderVideoToFile(compositionId, inputProps, durationInFrames, outputPath)

    const buffer = fs.readFileSync(outputPath)
    console.log(`Video rendered, size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`)

    const videoUrl = await uploadVideoBlob(buffer, pipelineId, compositionId)

    // Clean up temp file
    try {
      fs.unlinkSync(outputPath)
    } catch {
      // Ignore cleanup errors
    }

    return videoUrl
  } catch (error) {
    console.error("Video rendering failed, using placeholder:", (error as Error).message)
    return `https://placeholder.blob.vercel.com/video/${pipelineId}/${compositionId}/final.mp4`
  }
}

async function generateThumbnail(
  clipUrl: string | undefined,
  pipelineId: string,
  composition?: VideoComposition,
  templateProps?: RemotionTemplateProps
): Promise<string> {
  // Skip actual rendering in test environment
  if (process.env.NODE_ENV === "test" || !composition) {
    return `https://placeholder.blob.vercel.com/video/${pipelineId}/thumbnail.jpg`
  }

  try {
    const { renderThumbnailToFile } = await import("@/lib/rendering")
    const { uploadThumbnailBlob } = await import("@/lib/storage")
    const path = await import("path")
    const fs = await import("fs")

    const compositionId = getCompositionId(templateProps)
    const inputProps = buildInputProps(composition, templateProps)

    const tmpDir = path.resolve(process.cwd(), ".tmp")
    const outputPath = path.join(tmpDir, `thumb-${pipelineId}-${Date.now()}.jpg`)

    await renderThumbnailToFile(compositionId, inputProps, 30, outputPath)

    const buffer = fs.readFileSync(outputPath)
    const thumbnailUrl = await uploadThumbnailBlob(buffer, pipelineId)

    try {
      fs.unlinkSync(outputPath)
    } catch {
      // Ignore cleanup errors
    }

    return thumbnailUrl
  } catch (error) {
    console.error("Thumbnail generation failed, using placeholder:", (error as Error).message)
    return `https://placeholder.blob.vercel.com/video/${pipelineId}/thumbnail.jpg`
  }
}
