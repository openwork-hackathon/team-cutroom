import { z } from "zod"
import {
  StageHandler,
  StageContext,
  StageResult,
  ValidationResult,
  ScriptOutput,
  ScriptSection,
  ResearchOutput,
} from "./types"

// Input schema - expects research output from previous stage
const ScriptInputSchema = z.object({
  research: z.object({
    topic: z.string(),
    facts: z.array(z.string()),
    hooks: z.array(z.string()),
    targetAudience: z.string(),
    estimatedDuration: z.number(),
  }),
  style: z.enum(["educational", "entertaining", "news", "tutorial"]).optional(),
  duration: z.number().optional(),
})

export const scriptStage: StageHandler = {
  name: "SCRIPT",

  validate(input: unknown): ValidationResult {
    const result = ScriptInputSchema.safeParse(input)
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
      // Get research from previous stage output or input
      const research = (context.previousOutput || context.input) as ResearchOutput
      const style = (context.input as any).style || "educational"
      const targetDuration = (context.input as any).duration || research.estimatedDuration || 60

      // Calculate word count (~150 words per minute)
      const targetWords = Math.round((targetDuration / 60) * 150)

      // Select best hook
      const hook = research.hooks[0] || `Let's talk about ${research.topic}`

      // Generate script sections from facts
      const sections = generateSections(research.facts, research.topic, targetDuration)

      // Create full script
      const fullScript = [
        hook,
        ...sections.map((s) => s.content),
        "Follow for more!",
      ].join("\n\n")

      const output: ScriptOutput = {
        hook,
        body: sections,
        cta: "Follow for more!",
        fullScript,
        estimatedDuration: targetDuration,
        speakerNotes: [
          "Start with energy - hook needs to grab attention",
          "Pause briefly between sections",
          "End with clear call to action",
        ],
      }

      return {
        success: true,
        output,
        metadata: {
          style,
          targetWords,
          actualWords: countWords(fullScript),
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

function generateSections(facts: string[], topic: string, duration: number): ScriptSection[] {
  const numSections = Math.min(facts.length, Math.ceil(duration / 15)) // ~15 sec per section
  const sectionDuration = Math.round(duration / numSections)

  return facts.slice(0, numSections).map((fact, i) => ({
    heading: `Point ${i + 1}`,
    content: fact,
    visualCue: generateVisualCue(fact, topic),
    duration: sectionDuration,
  }))
}

function generateVisualCue(fact: string, topic: string): string {
  // Simple visual cue generation - in production, use LLM
  const keywords = fact.toLowerCase()
  
  if (keywords.includes("growth") || keywords.includes("increase")) {
    return "Show upward trending graph animation"
  }
  if (keywords.includes("expert") || keywords.includes("professional")) {
    return "Show professional/expert b-roll"
  }
  if (keywords.includes("data") || keywords.includes("statistic")) {
    return "Display statistic as text overlay"
  }
  
  return `Show relevant b-roll for: ${topic}`
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length
}
