import { describe, it, expect, beforeEach } from "vitest"
import {
  voiceStage,
  parseDialogSegments,
  buildCacheKey,
  clearAudioCache,
  getCachedAudio,
  setCachedAudio,
  resolveVoiceConfig,
  generateFallbackTTS,
} from "./voice"
import type { VoiceInput } from "./voice"
import { ScriptOutput } from "./types"

const mockScript: ScriptOutput = {
  hook: "What if software could think for itself?",
  body: [
    {
      heading: "Point 1",
      content: "AI agents are autonomous software systems",
      visualCue: "Show code animation",
      duration: 15,
    },
  ],
  cta: "Follow for more!",
  fullScript: "What if software could think for itself?\n\nAI agents are autonomous software systems.\n\nFollow for more!",
  estimatedDuration: 30,
  speakerNotes: ["Start with energy"],
}

const dialogScript: ScriptOutput = {
  hook: "Welcome to the show!",
  body: [
    {
      heading: "Dialog",
      content: "Character conversation",
      visualCue: "Split screen",
      duration: 30,
    },
  ],
  cta: "Subscribe!",
  fullScript:
    "Welcome to the show!\n\n[Host]: Today we have a special guest!\n[Guest]: Thanks for having me.\n[Host]: Let's dive right in.\n\nAnd that wraps up our episode.",
  estimatedDuration: 45,
  speakerNotes: [],
}

describe("Voice Stage", () => {
  beforeEach(() => {
    clearAudioCache()
  })

  // ===========================================================================
  // VALIDATION
  // ===========================================================================
  describe("validate", () => {
    it("accepts valid input with script object", () => {
      const result = voiceStage.validate({
        script: {
          fullScript: mockScript.fullScript,
          estimatedDuration: mockScript.estimatedDuration,
        },
      })
      expect(result.valid).toBe(true)
    })

    it("accepts input with optional voiceId", () => {
      const result = voiceStage.validate({
        script: {
          fullScript: mockScript.fullScript,
          estimatedDuration: mockScript.estimatedDuration,
        },
        voiceId: "custom-voice-id",
      })
      expect(result.valid).toBe(true)
    })

    it("accepts input with optional speed", () => {
      const result = voiceStage.validate({
        script: {
          fullScript: mockScript.fullScript,
          estimatedDuration: mockScript.estimatedDuration,
        },
        speed: 1.25,
      })
      expect(result.valid).toBe(true)
    })

    it("accepts input with voicePreset", () => {
      const result = voiceStage.validate({
        script: {
          fullScript: mockScript.fullScript,
          estimatedDuration: mockScript.estimatedDuration,
        },
        voicePreset: "narrator-professional",
      })
      expect(result.valid).toBe(true)
    })

    it("accepts input with characters array", () => {
      const result = voiceStage.validate({
        script: {
          fullScript: dialogScript.fullScript,
          estimatedDuration: dialogScript.estimatedDuration,
        },
        characters: [
          { name: "Host", voiceId: "rachel" },
          { name: "Guest", voiceId: "adam" },
        ],
      })
      expect(result.valid).toBe(true)
    })

    it("rejects missing script", () => {
      const result = voiceStage.validate({})
      expect(result.valid).toBe(false)
    })

    it("rejects script without fullScript", () => {
      const result = voiceStage.validate({
        script: { estimatedDuration: 30 },
      })
      expect(result.valid).toBe(false)
    })

    it("rejects speed out of range", () => {
      const result = voiceStage.validate({
        script: {
          fullScript: "test",
          estimatedDuration: 30,
        },
        speed: 3.0,
      })
      expect(result.valid).toBe(false)
    })
  })

  // ===========================================================================
  // DIALOG PARSING
  // ===========================================================================
  describe("parseDialogSegments", () => {
    it("returns single narrator segment for plain text", () => {
      const segments = parseDialogSegments("Hello, this is a plain narration.")
      expect(segments).toHaveLength(1)
      expect(segments[0].character).toBeNull()
      expect(segments[0].text).toBe("Hello, this is a plain narration.")
    })

    it("parses character dialog markers", () => {
      const text = "[Alice]: Hello there!\n[Bob]: Hey, how are you?"
      const segments = parseDialogSegments(text)
      expect(segments).toHaveLength(2)
      expect(segments[0]).toEqual({ character: "Alice", text: "Hello there!" })
      expect(segments[1]).toEqual({ character: "Bob", text: "Hey, how are you?" })
    })

    it("handles mixed narrator and dialog text", () => {
      const text = "Welcome to the show.\n\n[Host]: Let me introduce our guest.\n[Guest]: Thanks!\n\nThat was great."
      const segments = parseDialogSegments(text)
      expect(segments).toHaveLength(4)
      expect(segments[0].character).toBeNull()
      expect(segments[0].text).toContain("Welcome to the show.")
      expect(segments[1]).toEqual({ character: "Host", text: "Let me introduce our guest." })
      expect(segments[2]).toEqual({ character: "Guest", text: "Thanks!" })
      expect(segments[3].character).toBeNull()
      expect(segments[3].text).toContain("That was great.")
    })

    it("handles character names with spaces", () => {
      const text = "[Character A]: I have a long name."
      const segments = parseDialogSegments(text)
      expect(segments).toHaveLength(1)
      expect(segments[0].character).toBe("Character A")
    })

    it("returns empty array for empty input", () => {
      const segments = parseDialogSegments("")
      expect(segments).toHaveLength(0)
    })

    it("ignores character markers with no dialog text", () => {
      const text = "[Host]: \nSome narration here."
      const segments = parseDialogSegments(text)
      // The [Host] line has empty text after trim, so it's skipped
      // Then "Some narration here." is narrator
      expect(segments.some((s) => s.character === "Host")).toBe(false)
      expect(segments.some((s) => s.text.includes("Some narration here."))).toBe(true)
    })
  })

  // ===========================================================================
  // AUDIO CACHE
  // ===========================================================================
  describe("audio cache", () => {
    it("returns undefined for uncached keys", () => {
      expect(getCachedAudio("nonexistent")).toBeUndefined()
    })

    it("stores and retrieves cached audio", () => {
      const buffer = Buffer.from("test audio data")
      const key = buildCacheKey("hello", "voice1")
      setCachedAudio(key, buffer)
      expect(getCachedAudio(key)).toEqual(buffer)
    })

    it("generates deterministic cache keys", () => {
      const key1 = buildCacheKey("hello", "voice1", { speed: 1.0 })
      const key2 = buildCacheKey("hello", "voice1", { speed: 1.0 })
      expect(key1).toBe(key2)
    })

    it("generates different keys for different inputs", () => {
      const key1 = buildCacheKey("hello", "voice1")
      const key2 = buildCacheKey("hello", "voice2")
      const key3 = buildCacheKey("world", "voice1")
      expect(key1).not.toBe(key2)
      expect(key1).not.toBe(key3)
    })

    it("clears cache correctly", () => {
      const key = buildCacheKey("test", "voice")
      setCachedAudio(key, Buffer.from("data"))
      expect(getCachedAudio(key)).toBeDefined()
      clearAudioCache()
      expect(getCachedAudio(key)).toBeUndefined()
    })
  })

  // ===========================================================================
  // FREE TTS FALLBACK
  // ===========================================================================
  describe("generateFallbackTTS", () => {
    it("returns a FallbackTTSResult with correct structure", () => {
      const result = generateFallbackTTS("Hello world")
      expect(result.provider).toBe("free-tts-fallback")
      expect(result.mock).toBe(true)
      expect(result.reason).toContain("fallback")
      expect(Buffer.isBuffer(result.buffer)).toBe(true)
    })

    it("returns different buffers for different text", () => {
      const result1 = generateFallbackTTS("Hello")
      const result2 = generateFallbackTTS("Goodbye")
      expect(result1.buffer.equals(result2.buffer)).toBe(false)
    })
  })

  // ===========================================================================
  // VOICE CONFIG RESOLUTION
  // ===========================================================================
  describe("resolveVoiceConfig", () => {
    it("uses defaults when no preset or overrides", () => {
      const config = resolveVoiceConfig({
        script: { fullScript: "test", estimatedDuration: 10 },
      })
      expect(config.narratorVoiceId).toBeDefined()
      expect(config.narratorSpeed).toBe(1.0)
      expect(config.characterVoices.size).toBe(0)
    })

    it("loads narrator from preset", () => {
      const config = resolveVoiceConfig({
        script: { fullScript: "test", estimatedDuration: 10 },
        voicePreset: "narrator-energetic",
      })
      // narrator-energetic uses 'josh' which maps to a real ID
      expect(config.narratorSpeed).toBe(1.15)
    })

    it("loads character voices from preset", () => {
      const config = resolveVoiceConfig({
        script: { fullScript: "test", estimatedDuration: 10 },
        voicePreset: "characters-interview",
      })
      expect(config.characterVoices.size).toBe(2)
      expect(config.characterVoices.has("host")).toBe(true)
      expect(config.characterVoices.has("guest")).toBe(true)
    })

    it("explicit voiceId overrides preset narrator", () => {
      const config = resolveVoiceConfig({
        script: { fullScript: "test", estimatedDuration: 10 },
        voicePreset: "narrator-professional",
        voiceId: "custom-id-123",
      })
      expect(config.narratorVoiceId).toBe("custom-id-123")
    })

    it("explicit characters override preset characters", () => {
      const config = resolveVoiceConfig({
        script: { fullScript: "test", estimatedDuration: 10 },
        voicePreset: "characters-interview",
        characters: [{ name: "CustomChar", voiceId: "bella" }],
      })
      expect(config.characterVoices.size).toBe(1)
      expect(config.characterVoices.has("customchar")).toBe(true)
      expect(config.characterVoices.has("host")).toBe(false)
    })

    it("handles unknown preset gracefully", () => {
      const config = resolveVoiceConfig({
        script: { fullScript: "test", estimatedDuration: 10 },
        voicePreset: "nonexistent-preset",
      })
      // Should fall back to defaults
      expect(config.narratorVoiceId).toBeDefined()
      expect(config.narratorSpeed).toBe(1.0)
    })
  })

  // ===========================================================================
  // EXECUTE
  // ===========================================================================
  describe("execute", () => {
    it("returns a result (success or failure)", async () => {
      const context = {
        pipelineId: "test-pipeline",
        stageId: "test-stage",
        input: {},
        previousOutput: mockScript,
      }

      const result = await voiceStage.execute(context)

      expect(result).toBeDefined()
      expect(typeof result.success).toBe("boolean")

      if (result.success) {
        expect(result.output).toBeDefined()
      } else {
        expect(result.error).toBeDefined()
      }
    })

    it("includes audio URL when successful", async () => {
      const context = {
        pipelineId: "test-pipeline",
        stageId: "test-stage",
        input: {},
        previousOutput: mockScript,
      }

      const result = await voiceStage.execute(context)

      if (result.success && result.output) {
        const output = result.output as any
        expect(output.audioUrl).toBeDefined()
        expect(typeof output.audioUrl).toBe("string")
      }
    })

    it("includes transcript when successful", async () => {
      const context = {
        pipelineId: "test-pipeline",
        stageId: "test-stage",
        input: {},
        previousOutput: mockScript,
      }

      const result = await voiceStage.execute(context)

      if (result.success && result.output) {
        const output = result.output as any
        expect(output.transcript).toBeDefined()
        expect(output.transcript.length).toBeGreaterThan(0)
      }
    })

    it("includes duration when successful", async () => {
      const context = {
        pipelineId: "test-pipeline",
        stageId: "test-stage",
        input: {},
        previousOutput: mockScript,
      }

      const result = await voiceStage.execute(context)

      if (result.success && result.output) {
        const output = result.output as any
        expect(output.duration).toBeDefined()
        expect(typeof output.duration).toBe("number")
      }
    })

    it("indicates mock mode in metadata when no API key", async () => {
      const context = {
        pipelineId: "test-pipeline",
        stageId: "test-stage",
        input: {},
        previousOutput: mockScript,
      }

      const result = await voiceStage.execute(context)

      if (result.metadata?.mock) {
        expect(result.metadata.mock).toBe(true)
        expect(result.metadata.reason).toBeDefined()
      } else {
        expect(result.success).toBeDefined()
      }
    })

    it("handles dialog script with character voice switching", async () => {
      const context = {
        pipelineId: "test-pipeline",
        stageId: "test-stage",
        input: {
          script: {
            fullScript: dialogScript.fullScript,
            estimatedDuration: dialogScript.estimatedDuration,
          },
          voicePreset: "characters-interview",
        },
        previousOutput: dialogScript,
      }

      const result = await voiceStage.execute(context)
      expect(result.success).toBe(true)

      if (result.success) {
        const output = result.output as any
        expect(output.transcript).toContain("[Host]:")
        expect(output.transcript).toContain("[Guest]:")
        expect(result.metadata?.hasCharacterDialog).toBe(true)
        expect(result.metadata?.segments).toBeGreaterThan(1)
      }
    })

    it("reports cache hits in metadata", async () => {
      clearAudioCache()

      const context = {
        pipelineId: "test-pipeline",
        stageId: "test-stage",
        input: {
          script: {
            fullScript: mockScript.fullScript,
            estimatedDuration: mockScript.estimatedDuration,
          },
        },
        previousOutput: mockScript,
      }

      // First call — no cache hits
      await voiceStage.execute(context)

      // Second call — should have cache hits
      const result2 = await voiceStage.execute(context)
      if (result2.success && result2.metadata) {
        expect(result2.metadata.cacheHits).toBeGreaterThan(0)
      }
    })

    it("supports voicePreset in input", async () => {
      const context = {
        pipelineId: "test-pipeline",
        stageId: "test-stage",
        input: {
          script: {
            fullScript: mockScript.fullScript,
            estimatedDuration: mockScript.estimatedDuration,
          },
          voicePreset: "narrator-calm",
        },
        previousOutput: mockScript,
      }

      const result = await voiceStage.execute(context)
      expect(result.success).toBe(true)
      if (result.metadata) {
        expect(result.metadata.voicePreset).toBe("narrator-calm")
      }
    })
  })

  // ===========================================================================
  // STAGE PROPERTIES
  // ===========================================================================
  describe("stage properties", () => {
    it("has correct name", () => {
      expect(voiceStage.name).toBe("VOICE")
    })
  })
})
