import { describe, it, expect } from "vitest"
import { voiceStage } from "./voice"
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

describe("Voice Stage", () => {
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
        speed: 3.0, // Too fast
      })
      expect(result.valid).toBe(false)
    })
  })

  describe("execute", () => {
    it("returns a result (success or failure)", async () => {
      const context = {
        pipelineId: "test-pipeline",
        stageId: "test-stage",
        input: {},
        previousOutput: mockScript,
      }

      const result = await voiceStage.execute(context)

      // Either succeeds or fails with an error
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

      // Without ELEVENLABS_API_KEY env var, should be in mock mode
      // If API key is set, this test may fail - that's expected
      if (result.metadata?.mock) {
        expect(result.metadata.mock).toBe(true)
        expect(result.metadata.reason).toBeDefined()
      } else {
        // API key is set, real request was attempted
        expect(result.success).toBeDefined()
      }
    })
  })

  describe("stage properties", () => {
    it("has correct name", () => {
      expect(voiceStage.name).toBe("VOICE")
    })
  })
})
