import { z } from "zod"
import {
  StageHandler,
  StageContext,
  StageResult,
  ValidationResult,
  ResearchOutput,
  Source,
} from "./types"

// Input schema for research stage
const ResearchInputSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  description: z.string().optional(),
})

export const researchStage: StageHandler = {
  name: "RESEARCH",

  validate(input: unknown): ValidationResult {
    const result = ResearchInputSchema.safeParse(input)
    if (!result.success) {
      return {
        valid: false,
        errors: result.error.errors.map((e) => e.message),
      }
    }
    return { valid: true }
  },

  async execute(context: StageContext): Promise<StageResult> {
    try {
      const { topic, description } = context.input as z.infer<typeof ResearchInputSchema>

      // TODO: Integrate with actual web search API (Brave, Exa, etc.)
      // For now, use LLM to generate research based on topic
      
      const researchPrompt = `Research the following topic for a short-form video (60 seconds):

Topic: ${topic}
${description ? `Additional context: ${description}` : ""}

Provide:
1. 5-7 key facts about this topic
2. 3-4 potential video hooks/angles that would grab attention
3. The target audience for this content
4. Suggested video duration (30, 60, or 90 seconds)

Format as JSON with this structure:
{
  "facts": ["fact1", "fact2", ...],
  "hooks": ["hook1", "hook2", ...],
  "targetAudience": "description of who would watch",
  "estimatedDuration": 60
}`

      // For MVP: Return mock research data
      // In production: Call OpenAI/Anthropic API with researchPrompt
      const mockOutput: ResearchOutput = {
        topic,
        facts: [
          `${topic} is a rapidly evolving field`,
          "Key players are investing heavily in this space",
          "Recent developments have accelerated adoption",
          "Experts predict significant growth in the next 5 years",
          "Consumer interest has increased 300% year over year",
        ],
        sources: [
          {
            title: "Industry Report 2024",
            url: "https://example.com/report",
            snippet: "Comprehensive analysis of market trends...",
          },
        ],
        hooks: [
          `What if ${topic} changed everything?`,
          `The truth about ${topic} nobody talks about`,
          `Why ${topic} matters more than you think`,
        ],
        targetAudience: "Tech-savvy professionals aged 25-45 interested in emerging trends",
        estimatedDuration: 60,
      }

      return {
        success: true,
        output: mockOutput,
        metadata: {
          promptUsed: researchPrompt,
          model: "mock",
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

// Helper to call LLM API (to be implemented)
async function callLLM(prompt: string): Promise<string> {
  // TODO: Implement actual LLM call
  // Options: OpenAI, Anthropic, local model
  throw new Error("LLM integration not yet implemented")
}

// Helper to search web (to be implemented)
async function searchWeb(query: string): Promise<Source[]> {
  // TODO: Implement web search
  // Options: Brave Search API, Exa, SerpAPI
  throw new Error("Web search not yet implemented")
}
