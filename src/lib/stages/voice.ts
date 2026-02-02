import { z } from "zod"
import {
  StageHandler,
  StageContext,
  StageResult,
  ValidationResult,
  VoiceOutput,
  ScriptOutput,
} from "./types"

// Input schema - expects script output from previous stage
const VoiceInputSchema = z.object({
  script: z.object({
    fullScript: z.string(),
    estimatedDuration: z.number(),
  }),
  voiceId: z.string().optional(),
  speed: z.number().min(0.5).max(2.0).optional(),
})

const ELEVENLABS_API = "https://api.elevenlabs.io/v1"
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM" // Rachel - default voice

export const voiceStage: StageHandler = {
  name: "VOICE",

  validate(input: unknown): ValidationResult {
    const result = VoiceInputSchema.safeParse(input)
    if (!result.success) {
      return {
        valid: false,
        errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
      }
    }
    return { valid: true }
  },

  async execute(context: StageContext): Promise<StageResult> {
    try {
      // Get script from previous stage output or input
      const script = (context.previousOutput || (context.input as any).script) as ScriptOutput
      const voiceId = (context.input as any).voiceId || process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID
      const speed = (context.input as any).speed || 1.0

      // Clean script text for TTS (remove visual cues, speaker notes)
      const cleanedText = cleanTextForTTS(script.fullScript)

      // Check for API key
      const apiKey = process.env.ELEVENLABS_API_KEY
      if (!apiKey) {
        // Return mock output for development
        return createMockOutput(cleanedText, script.estimatedDuration)
      }

      // Generate speech via ElevenLabs
      const audioBuffer = await generateSpeech(cleanedText, voiceId, apiKey)

      // Upload to storage (TODO: integrate Vercel Blob)
      const audioUrl = await uploadAudio(audioBuffer, context.pipelineId, context.stageId)

      // Calculate actual duration (estimate based on text length)
      const duration = estimateDuration(cleanedText)

      const output: VoiceOutput = {
        audioUrl,
        duration,
        transcript: cleanedText,
        timestamps: [], // TODO: Request timestamps from ElevenLabs
      }

      return {
        success: true,
        output,
        metadata: {
          voiceId,
          speed,
          textLength: cleanedText.length,
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

function cleanTextForTTS(text: string): string {
  // Remove markdown, brackets, visual cues, etc.
  return text
    .replace(/\[.*?\]/g, "") // Remove [brackets]
    .replace(/\*\*.*?\*\*/g, "") // Remove **bold**
    .replace(/#{1,6}\s/g, "") // Remove headings
    .replace(/\n{3,}/g, "\n\n") // Normalize newlines
    .trim()
}

function estimateDuration(text: string): number {
  // ~150 words per minute = 2.5 words per second
  const words = text.split(/\s+/).length
  return Math.round(words / 2.5)
}

async function generateSpeech(text: string, voiceId: string, apiKey: string): Promise<Buffer> {
  const response = await fetch(`${ELEVENLABS_API}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ElevenLabs API error: ${error}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

async function uploadAudio(buffer: Buffer, pipelineId: string, stageId: string): Promise<string> {
  // TODO: Integrate with Vercel Blob
  // For now, return a placeholder URL
  const filename = `audio/${pipelineId}/${stageId}.mp3`
  
  // In production:
  // import { put } from "@vercel/blob"
  // const blob = await put(filename, buffer, { access: "public", contentType: "audio/mpeg" })
  // return blob.url
  
  return `https://placeholder.blob.vercel.com/${filename}`
}

function createMockOutput(text: string, estimatedDuration: number): StageResult {
  const output: VoiceOutput = {
    audioUrl: "https://placeholder.blob.vercel.com/audio/mock.mp3",
    duration: estimatedDuration,
    transcript: text,
    timestamps: [],
  }

  return {
    success: true,
    output,
    metadata: {
      mock: true,
      reason: "ELEVENLABS_API_KEY not configured",
    },
  }
}
