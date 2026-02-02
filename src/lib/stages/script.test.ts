import { describe, it, expect } from "vitest"
import { scriptStage } from "./script"
import { ResearchOutput } from "./types"

const mockResearch: ResearchOutput = {
  topic: "AI agents",
  facts: [
    "AI agents are autonomous software systems",
    "They can perform tasks without human intervention",
    "Growth in the AI agent market is accelerating",
    "Experts predict widespread adoption by 2030",
  ],
  sources: [],
  hooks: ["What if software could think for itself?"],
  targetAudience: "Tech professionals",
  estimatedDuration: 60,
}

describe("Script Stage", () => {
  describe("validate", () => {
    it("accepts valid input with research object", () => {
      const result = scriptStage.validate({ research: mockResearch })
      expect(result.valid).toBe(true)
    })

    it("accepts input with optional style", () => {
      const result = scriptStage.validate({
        research: mockResearch,
        style: "educational",
      })
      expect(result.valid).toBe(true)
    })

    it("rejects missing research", () => {
      const result = scriptStage.validate({})
      expect(result.valid).toBe(false)
    })

    it("rejects invalid style", () => {
      const result = scriptStage.validate({
        research: mockResearch,
        style: "invalid-style",
      })
      expect(result.valid).toBe(false)
    })

    it("rejects research missing required fields", () => {
      const result = scriptStage.validate({
        research: { topic: "test" }, // Missing facts, hooks, etc.
      })
      expect(result.valid).toBe(false)
    })
  })

  describe("execute", () => {
    it("returns successful result with script output", async () => {
      const context = {
        pipelineId: "test-pipeline",
        stageId: "test-stage",
        input: {},
        previousOutput: mockResearch,
      }

      const result = await scriptStage.execute(context)

      expect(result.success).toBe(true)
      expect(result.output).toBeDefined()
    })

    it("generates hook from research", async () => {
      const context = {
        pipelineId: "test-pipeline",
        stageId: "test-stage",
        input: {},
        previousOutput: mockResearch,
      }

      const result = await scriptStage.execute(context)
      const output = result.output as any

      expect(output.hook).toBe(mockResearch.hooks[0])
    })

    it("generates body sections from facts", async () => {
      const context = {
        pipelineId: "test-pipeline",
        stageId: "test-stage",
        input: {},
        previousOutput: mockResearch,
      }

      const result = await scriptStage.execute(context)
      const output = result.output as any

      expect(output.body).toBeDefined()
      expect(Array.isArray(output.body)).toBe(true)
      expect(output.body.length).toBeGreaterThan(0)
    })

    it("each section has required fields", async () => {
      const context = {
        pipelineId: "test-pipeline",
        stageId: "test-stage",
        input: {},
        previousOutput: mockResearch,
      }

      const result = await scriptStage.execute(context)
      const output = result.output as any

      for (const section of output.body) {
        expect(section.heading).toBeDefined()
        expect(section.content).toBeDefined()
        expect(section.visualCue).toBeDefined()
        expect(section.duration).toBeDefined()
        expect(typeof section.duration).toBe("number")
      }
    })

    it("includes CTA", async () => {
      const context = {
        pipelineId: "test-pipeline",
        stageId: "test-stage",
        input: {},
        previousOutput: mockResearch,
      }

      const result = await scriptStage.execute(context)
      const output = result.output as any

      expect(output.cta).toBeDefined()
      expect(output.cta.length).toBeGreaterThan(0)
    })

    it("generates full script", async () => {
      const context = {
        pipelineId: "test-pipeline",
        stageId: "test-stage",
        input: {},
        previousOutput: mockResearch,
      }

      const result = await scriptStage.execute(context)
      const output = result.output as any

      expect(output.fullScript).toBeDefined()
      expect(output.fullScript).toContain(output.hook)
    })

    it("respects custom duration", async () => {
      const context = {
        pipelineId: "test-pipeline",
        stageId: "test-stage",
        input: { duration: 30 },
        previousOutput: mockResearch,
      }

      const result = await scriptStage.execute(context)
      const output = result.output as any

      expect(output.estimatedDuration).toBe(30)
    })
  })

  describe("stage properties", () => {
    it("has correct name", () => {
      expect(scriptStage.name).toBe("SCRIPT")
    })
  })
})
