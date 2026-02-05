import { z } from "zod"
import { createHash } from "crypto"
import {
  StageHandler,
  StageContext,
  StageResult,
  ValidationResult,
  VoiceOutput,
  ScriptOutput,
} from "./types"
import { VOICE_PRESETS, getVoicePreset } from "../templates/presets/voice"
import type { VoicePreset, CharacterVoice, NarratorConfig } from "../templates/types"

// ============================================================================
// SCHEMAS
// ============================================================================

const VoiceInputSchema = z.object({
  script: z.object({
    fullScript: z.string(),
    estimatedDuration: z.number(),
  }),
  voiceId: z.string().optional(),
  speed: z.number().min(0.5).max(2.0).optional(),
  voicePreset: z.string().optional(),
  characters: z
    .array(
      z.object({
        name: z.string(),
        voiceId: z.string(),
        provider: z.string().optional(),
        pitch: z.number().optional(),
        speed: z.number().optional(),
        style: z.string().optional(),
        color: z.string().optional(),
      })
    )
    .optional(),
})

export type VoiceInput = z.infer<typeof VoiceInputSchema>

// ============================================================================
// CONSTANTS
// ============================================================================

const ELEVENLABS_API = "https://api.elevenlabs.io/v1"
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM" // Rachel - default voice

/** ElevenLabs voice name → voice ID mapping */
const VOICE_REGISTRY: Record<string, string> = {
  rachel: "21m00Tcm4TlvDq8ikWAM",
  adam: "pNInz6obpgDQGcFmaJgB",
  josh: "TxGEqnHWrfWFTfGW9XjX",
  bella: "EXAVITQu4vr4xnSDxMaL",
  sam: "yoZ06aMxZJJ28mfd3POQ",
  callum: "N2lVS1w4EtoT3dr4eOWO",
}

// ============================================================================
// DIALOG SEGMENT PARSING
// ============================================================================

/** A parsed segment from a script with optional character attribution */
export interface DialogSegment {
  /** Character name, or null for narrator / unattributed text */
  character: string | null
  /** The dialog or narration text */
  text: string
}

/**
 * Parse a script into dialog segments.
 * Detects `[CharacterName]: dialog text` patterns and splits accordingly.
 * Unattributed text is returned with `character: null` (narrator).
 */
export function parseDialogSegments(script: string): DialogSegment[] {
  const segments: DialogSegment[] = []
  // Match lines starting with [Name]: or accumulate narrator text
  const lines = script.split("\n")
  let currentNarratorBuffer = ""

  const characterPattern = /^\[([^\]]+)\]:\s*(.*)/

  for (const line of lines) {
    const match = line.match(characterPattern)
    if (match) {
      // Flush any accumulated narrator text
      if (currentNarratorBuffer.trim()) {
        segments.push({ character: null, text: currentNarratorBuffer.trim() })
        currentNarratorBuffer = ""
      }
      const characterName = match[1].trim()
      const dialogText = match[2].trim()
      if (dialogText) {
        segments.push({ character: characterName, text: dialogText })
      }
    } else {
      // Narrator / unattributed text
      currentNarratorBuffer += (currentNarratorBuffer ? "\n" : "") + line
    }
  }

  // Flush remaining narrator text
  if (currentNarratorBuffer.trim()) {
    segments.push({ character: null, text: currentNarratorBuffer.trim() })
  }

  return segments
}

// ============================================================================
// AUDIO CACHE
// ============================================================================

/** In-memory cache for generated audio keyed by content hash */
const audioCache = new Map<string, Buffer>()

/** Build a deterministic cache key from generation parameters */
export function buildCacheKey(text: string, voiceId: string, settings: Record<string, unknown> = {}): string {
  const payload = JSON.stringify({ text, voiceId, ...settings })
  return createHash("sha256").update(payload).digest("hex")
}

/** Get cached audio, or undefined */
export function getCachedAudio(key: string): Buffer | undefined {
  return audioCache.get(key)
}

/** Store audio in cache */
export function setCachedAudio(key: string, buffer: Buffer): void {
  audioCache.set(key, buffer)
}

/** Clear the audio cache (useful for testing) */
export function clearAudioCache(): void {
  audioCache.clear()
}

// ============================================================================
// FREE TTS FALLBACK
// ============================================================================

/** Metadata returned by the fallback provider */
export interface FallbackTTSResult {
  /** Audio buffer (mock silence for now, but structured for real provider) */
  buffer: Buffer
  /** Provider name */
  provider: "free-tts-fallback"
  /** Whether this is a mock (no real audio generated) */
  mock: true
  /** Reason for using fallback */
  reason: string
}

/**
 * Free TTS fallback provider.
 * Returns a mock audio buffer with metadata.
 * Structured so a real free provider (e.g., Mozilla TTS, espeak) can plug in.
 */
export function generateFallbackTTS(text: string, _voiceId?: string): FallbackTTSResult {
  // Create a minimal "silent" MP3 buffer as placeholder
  // In a real integration, this would call a free TTS engine
  const mockBuffer = Buffer.from(
    "MOCK_AUDIO_" + createHash("md5").update(text).digest("hex"),
    "utf-8"
  )

  return {
    buffer: mockBuffer,
    provider: "free-tts-fallback",
    mock: true,
    reason: "ElevenLabs API key not configured; using fallback provider",
  }
}

// ============================================================================
// VOICE PRESET RESOLUTION
// ============================================================================

/** Resolved voice configuration for generation */
export interface ResolvedVoiceConfig {
  narratorVoiceId: string
  narratorSpeed: number
  characterVoices: Map<string, CharacterVoice>
  effects?: VoicePreset["effects"]
}

/**
 * Resolve voice configuration from input parameters and/or preset.
 * Priority: explicit input > preset > defaults
 */
export function resolveVoiceConfig(input: VoiceInput): ResolvedVoiceConfig {
  let preset: VoicePreset | undefined

  // Load preset if specified
  if (input.voicePreset) {
    preset = getVoicePreset(input.voicePreset)
  }

  // Narrator voice: explicit voiceId > preset narrator > default
  let narratorVoiceId = DEFAULT_VOICE_ID
  let narratorSpeed = input.speed || 1.0

  if (input.voiceId) {
    narratorVoiceId = resolveVoiceId(input.voiceId)
  } else if (preset?.narrator) {
    narratorVoiceId = resolveVoiceId(preset.narrator.voiceId)
    narratorSpeed = preset.narrator.speed || narratorSpeed
  }

  // Character voices: explicit characters > preset characters
  const characterVoices = new Map<string, CharacterVoice>()

  if (input.characters && input.characters.length > 0) {
    for (const char of input.characters) {
      characterVoices.set(char.name.toLowerCase(), char as CharacterVoice)
    }
  } else if (preset?.characters) {
    for (const char of preset.characters) {
      characterVoices.set(char.name.toLowerCase(), char)
    }
  }

  return {
    narratorVoiceId,
    narratorSpeed,
    characterVoices,
    effects: preset?.effects,
  }
}

/** Resolve a voice name to an ElevenLabs voice ID */
function resolveVoiceId(voiceIdOrName: string): string {
  // If it's in the registry, map it; otherwise treat as raw ID
  return VOICE_REGISTRY[voiceIdOrName.toLowerCase()] || voiceIdOrName
}

// ============================================================================
// AUDIO GENERATION
// ============================================================================

/**
 * Generate audio for a single segment.
 * Uses cache, falls back to free TTS when no API key.
 */
async function generateSegmentAudio(
  text: string,
  voiceId: string,
  speed: number,
  apiKey: string | undefined,
  dryRun: boolean
): Promise<{ buffer: Buffer; cached: boolean; mock: boolean; provider: string }> {
  const cacheKey = buildCacheKey(text, voiceId, { speed })

  // Check cache first
  const cached = getCachedAudio(cacheKey)
  if (cached) {
    return { buffer: cached, cached: true, mock: false, provider: "cache" }
  }

  // No API key or dry run → fallback
  if (!apiKey || dryRun) {
    const fallback = generateFallbackTTS(text, voiceId)
    setCachedAudio(cacheKey, fallback.buffer)
    return { buffer: fallback.buffer, cached: false, mock: true, provider: fallback.provider }
  }

  // Call ElevenLabs
  const resolvedId = resolveVoiceId(voiceId)
  const buffer = await generateSpeech(text, resolvedId, apiKey, speed)
  setCachedAudio(cacheKey, buffer)
  return { buffer, cached: false, mock: false, provider: "elevenlabs" }
}

async function generateSpeech(text: string, voiceId: string, apiKey: string, speed: number = 1.0): Promise<Buffer> {
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
        speed,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ElevenLabs API error: ${error}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

// ============================================================================
// HELPERS
// ============================================================================

function cleanTextForTTS(text: string): string {
  return text
    .replace(/\*\*.*?\*\*/g, "") // Remove **bold**
    .replace(/#{1,6}\s/g, "") // Remove headings
    .replace(/\n{3,}/g, "\n\n") // Normalize newlines
    .trim()
}

/**
 * Clean text for TTS but preserve character markers for dialog parsing.
 * Only removes formatting, not [Character]: patterns.
 */
function cleanTextPreservingDialog(text: string): string {
  return text
    .replace(/\*\*.*?\*\*/g, "") // Remove **bold**
    .replace(/#{1,6}\s/g, "") // Remove headings
    .replace(/\n{3,}/g, "\n\n") // Normalize newlines
    .trim()
}

function estimateDuration(text: string): number {
  const words = text.split(/\s+/).length
  return Math.round(words / 2.5)
}

async function uploadAudio(buffer: Buffer, pipelineId: string, stageId: string): Promise<string> {
  const filename = `audio/${pipelineId}/${stageId}.mp3`
  // TODO: Integrate with Vercel Blob
  return `https://placeholder.blob.vercel.com/${filename}`
}

function createMockOutput(text: string, estimatedDuration: number, reason: string = "ELEVENLABS_API_KEY not configured"): StageResult {
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
      reason,
    },
  }
}

// ============================================================================
// STAGE HANDLER
// ============================================================================

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
      const input = context.input as unknown as VoiceInput
      const apiKey = process.env.ELEVENLABS_API_KEY

      // Resolve voice configuration (preset + explicit overrides)
      const voiceConfig = resolveVoiceConfig(input)

      // Clean text while preserving dialog markers
      const cleanedText = cleanTextPreservingDialog(script.fullScript)

      // Parse dialog segments
      const segments = parseDialogSegments(cleanedText)
      const hasCharacterDialog = segments.some((s) => s.character !== null)

      // Generate audio for each segment
      const segmentResults: Array<{
        segment: DialogSegment
        buffer: Buffer
        voiceId: string
        cached: boolean
        mock: boolean
        provider: string
      }> = []

      for (const segment of segments) {
        // Determine voice for this segment
        let segmentVoiceId = voiceConfig.narratorVoiceId
        let segmentSpeed = voiceConfig.narratorSpeed

        if (segment.character) {
          const charKey = segment.character.toLowerCase()
          const charVoice = voiceConfig.characterVoices.get(charKey)
          if (charVoice) {
            segmentVoiceId = resolveVoiceId(charVoice.voiceId)
            segmentSpeed = charVoice.speed || segmentSpeed
          }
        }

        // Clean the segment text (remove any remaining brackets for narrator segments)
        const segmentText = segment.character
          ? segment.text
          : segment.text.replace(/\[.*?\]/g, "").trim()

        if (!segmentText) continue

        const result = await generateSegmentAudio(
          segmentText,
          segmentVoiceId,
          segmentSpeed,
          apiKey,
          context.dryRun || false
        )

        segmentResults.push({
          segment,
          buffer: result.buffer,
          voiceId: segmentVoiceId,
          cached: result.cached,
          mock: result.mock,
          provider: result.provider,
        })
      }

      // Combine results
      const combinedBuffer = Buffer.concat(segmentResults.map((r) => r.buffer))
      const fullTranscript = segmentResults
        .map((r) =>
          r.segment.character
            ? `[${r.segment.character}]: ${r.segment.text}`
            : r.segment.text
        )
        .join("\n\n")

      const audioUrl = await uploadAudio(combinedBuffer, context.pipelineId, context.stageId)
      const duration = estimateDuration(fullTranscript)
      const isMock = segmentResults.every((r) => r.mock)
      const cacheHits = segmentResults.filter((r) => r.cached).length

      const output: VoiceOutput = {
        audioUrl,
        duration,
        transcript: fullTranscript,
        timestamps: [],
      }

      return {
        success: true,
        output,
        metadata: {
          ...(isMock && {
            mock: true,
            reason: context.dryRun
              ? "dry run mode"
              : "ELEVENLABS_API_KEY not configured",
          }),
          voiceId: voiceConfig.narratorVoiceId,
          speed: voiceConfig.narratorSpeed,
          textLength: fullTranscript.length,
          segments: segmentResults.length,
          cacheHits,
          hasCharacterDialog,
          ...(voiceConfig.effects && { effects: voiceConfig.effects }),
          ...(input.voicePreset && { voicePreset: input.voicePreset }),
          characterVoices: hasCharacterDialog
            ? segmentResults
                .filter((r) => r.segment.character)
                .reduce(
                  (acc, r) => {
                    if (r.segment.character && !acc[r.segment.character]) {
                      acc[r.segment.character] = r.voiceId
                    }
                    return acc
                  },
                  {} as Record<string, string>
                )
            : undefined,
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
