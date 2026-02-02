import { describe, it, expect } from "vitest"
import {
  STAGE_ORDER,
  STAGE_WEIGHTS,
  type ValidationResult,
  type StageResult,
} from "./types"

describe("Stage Types", () => {
  describe("STAGE_ORDER", () => {
    it("has 7 stages", () => {
      expect(STAGE_ORDER).toHaveLength(7)
    })

    it("starts with RESEARCH", () => {
      expect(STAGE_ORDER[0]).toBe("RESEARCH")
    })

    it("ends with PUBLISH", () => {
      expect(STAGE_ORDER[6]).toBe("PUBLISH")
    })

    it("has correct order", () => {
      expect(STAGE_ORDER).toEqual([
        "RESEARCH",
        "SCRIPT",
        "VOICE",
        "MUSIC",
        "VISUAL",
        "EDITOR",
        "PUBLISH",
      ])
    })
  })

  describe("STAGE_WEIGHTS", () => {
    it("has weights for all stages", () => {
      for (const stage of STAGE_ORDER) {
        expect(STAGE_WEIGHTS[stage]).toBeDefined()
        expect(typeof STAGE_WEIGHTS[stage]).toBe("number")
      }
    })

    it("weights sum to 100", () => {
      const total = Object.values(STAGE_WEIGHTS).reduce((a, b) => a + b, 0)
      expect(total).toBe(100)
    })

    it("all weights are positive", () => {
      for (const weight of Object.values(STAGE_WEIGHTS)) {
        expect(weight).toBeGreaterThan(0)
      }
    })
  })

  describe("ValidationResult type", () => {
    it("valid result has valid: true", () => {
      const result: ValidationResult = { valid: true }
      expect(result.valid).toBe(true)
      expect(result.errors).toBeUndefined()
    })

    it("invalid result has errors", () => {
      const result: ValidationResult = {
        valid: false,
        errors: ["Missing topic"],
      }
      expect(result.valid).toBe(false)
      expect(result.errors).toContain("Missing topic")
    })
  })

  describe("StageResult type", () => {
    it("success result structure", () => {
      const result: StageResult = {
        success: true,
        output: { topic: "test" },
        artifacts: [
          { url: "https://example.com/file.mp3", type: "audio", name: "voice.mp3" },
        ],
      }
      expect(result.success).toBe(true)
      expect(result.output).toBeDefined()
      expect(result.artifacts).toHaveLength(1)
    })

    it("failure result structure", () => {
      const result: StageResult = {
        success: false,
        output: null,
        error: "API rate limit exceeded",
      }
      expect(result.success).toBe(false)
      expect(result.error).toBe("API rate limit exceeded")
    })
  })
})
