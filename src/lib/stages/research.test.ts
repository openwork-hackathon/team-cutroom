import { describe, it, expect } from "vitest"
import { researchStage } from "./research"

describe("Research Stage", () => {
  describe("validate", () => {
    it("accepts valid input with topic", () => {
      const result = researchStage.validate({ topic: "AI agents" })
      expect(result.valid).toBe(true)
      expect(result.errors).toBeUndefined()
    })

    it("accepts valid input with topic and description", () => {
      const result = researchStage.validate({
        topic: "AI agents",
        description: "Focus on autonomous coding agents",
      })
      expect(result.valid).toBe(true)
    })

    it("rejects missing topic", () => {
      const result = researchStage.validate({})
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors?.length).toBeGreaterThan(0)
    })

    it("rejects empty topic", () => {
      const result = researchStage.validate({ topic: "" })
      expect(result.valid).toBe(false)
    })

    it("rejects null input", () => {
      const result = researchStage.validate(null)
      expect(result.valid).toBe(false)
    })
  })

  describe("execute", () => {
    it("returns successful result with research output", async () => {
      const context = {
        pipelineId: "test-pipeline",
        stageId: "test-stage",
        input: { topic: "AI coding agents" },
      }

      const result = await researchStage.execute(context)

      expect(result.success).toBe(true)
      expect(result.output).toBeDefined()

      const output = result.output as any
      expect(output.topic).toBe("AI coding agents")
      expect(output.facts).toBeDefined()
      expect(output.facts.length).toBeGreaterThan(0)
      expect(output.hooks).toBeDefined()
      expect(output.hooks.length).toBeGreaterThan(0)
      expect(output.targetAudience).toBeDefined()
      expect(output.estimatedDuration).toBeDefined()
    })

    it("includes sources in output", async () => {
      const context = {
        pipelineId: "test-pipeline",
        stageId: "test-stage",
        input: { topic: "Machine learning" },
      }

      const result = await researchStage.execute(context)
      const output = result.output as any

      expect(output.sources).toBeDefined()
      expect(Array.isArray(output.sources)).toBe(true)
    })

    it("includes metadata about the request", async () => {
      const context = {
        pipelineId: "test-pipeline",
        stageId: "test-stage",
        input: { topic: "Test topic" },
      }

      const result = await researchStage.execute(context)

      expect(result.metadata).toBeDefined()
      expect(result.metadata?.promptUsed).toBeDefined()
    })
  })

  describe("stage properties", () => {
    it("has correct name", () => {
      expect(researchStage.name).toBe("RESEARCH")
    })
  })
})
