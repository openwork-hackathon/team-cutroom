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

// Response schema from LLM
const LLMResearchResponseSchema = z.object({
  facts: z.array(z.string()).min(3).max(10),
  hooks: z.array(z.string()).min(2).max(5),
  targetAudience: z.string(),
  estimatedDuration: z.number().min(15).max(180),
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

      const researchPrompt = `Research the following topic for a short-form video (60 seconds):

Topic: ${topic}
${description ? `Additional context: ${description}` : ""}

Provide:
1. 5-7 key facts about this topic (accurate, specific, interesting)
2. 3-4 potential video hooks/angles that would grab attention on social media
3. The target audience for this content
4. Suggested video duration (30, 60, or 90 seconds)

Respond with ONLY valid JSON (no markdown, no explanation) in this exact structure:
{
  "facts": ["fact1", "fact2", ...],
  "hooks": ["hook1", "hook2", ...],
  "targetAudience": "description of who would watch",
  "estimatedDuration": 60
}`

      // Check if OpenAI API key is available
      const apiKey = process.env.OPENAI_API_KEY
      
      let researchData: z.infer<typeof LLMResearchResponseSchema>
      let modelUsed = "mock"
      
      if (apiKey && !context.dryRun) {
        // Use real OpenAI API
        try {
          const response = await callLLM(researchPrompt, apiKey)
          researchData = LLMResearchResponseSchema.parse(JSON.parse(response))
          modelUsed = "gpt-4o-mini"
        } catch (llmError) {
          console.warn("LLM call failed, falling back to mock:", (llmError as Error).message)
          researchData = getMockResearch(topic)
        }
      } else {
        // Use mock data
        researchData = getMockResearch(topic)
      }

      // Enhance with web search sources when available
      const webSources = await searchWeb(topic)
      const sources: Source[] = [
        ...webSources,
        {
          title: "AI-Generated Research",
          url: `https://cutroom.ai/research/${encodeURIComponent(topic)}`,
          snippet: `Research generated for: ${topic}`,
        },
      ]

      const output: ResearchOutput = {
        topic,
        facts: researchData.facts,
        sources,
        hooks: researchData.hooks,
        targetAudience: researchData.targetAudience,
        estimatedDuration: researchData.estimatedDuration,
      }

      return {
        success: true,
        output,
        metadata: {
          promptUsed: researchPrompt,
          model: modelUsed,
          webSearchUsed: webSources.length > 0,
          sourceCount: sources.length,
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

// Helper to call OpenAI API
async function callLLM(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a video content researcher. Always respond with valid JSON only, no markdown formatting.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

// Mock research data for development/testing
function getMockResearch(topic: string): z.infer<typeof LLMResearchResponseSchema> {
  return {
    facts: [
      `${topic} is a rapidly evolving field`,
      "Key players are investing heavily in this space",
      "Recent developments have accelerated adoption",
      "Experts predict significant growth in the next 5 years",
      "Consumer interest has increased 300% year over year",
    ],
    hooks: [
      `What if ${topic} changed everything?`,
      `The truth about ${topic} nobody talks about`,
      `Why ${topic} matters more than you think`,
    ],
    targetAudience: "Tech-savvy professionals aged 25-45 interested in emerging trends",
    estimatedDuration: 60,
  }
}

// Brave Search API integration
const BRAVE_SEARCH_API = "https://api.search.brave.com/res/v1/web/search"

async function searchWeb(query: string): Promise<Source[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY

  if (!apiKey) {
    return []
  }

  try {
    const response = await fetch(
      `${BRAVE_SEARCH_API}?q=${encodeURIComponent(query)}&count=5`,
      {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": apiKey,
        },
      }
    )

    if (!response.ok) {
      console.warn(`Brave Search API error: ${response.status}`)
      return []
    }

    const data = await response.json()
    const results = data.web?.results || []

    return results.map((result: { title: string; url: string; description: string }) => ({
      title: result.title,
      url: result.url,
      snippet: result.description,
    }))
  } catch (error) {
    console.warn("Web search failed:", (error as Error).message)
    return []
  }
}
