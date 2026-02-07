import { z } from "zod"
import {
  StageHandler,
  StageContext,
  StageResult,
  ValidationResult,
  PublishOutput,
  PlatformResult,
  EditorOutput,
} from "./types"

// Input schema for publish stage
const PublishInputSchema = z.object({
  platforms: z.array(z.enum(["youtube", "tiktok", "twitter", "instagram"])).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  scheduled: z.string().optional(), // ISO date string
})

// Platform configurations
interface PlatformConfig {
  name: string
  maxTitleLength: number
  maxDescriptionLength: number
  supportedFormats: string[]
  apiEndpoint?: string
}

const PLATFORMS: Record<string, PlatformConfig> = {
  youtube: {
    name: "YouTube",
    maxTitleLength: 100,
    maxDescriptionLength: 5000,
    supportedFormats: ["mp4", "mov", "avi"],
  },
  tiktok: {
    name: "TikTok",
    maxTitleLength: 150,
    maxDescriptionLength: 2200,
    supportedFormats: ["mp4", "mov"],
  },
  twitter: {
    name: "X/Twitter",
    maxTitleLength: 280,
    maxDescriptionLength: 280,
    supportedFormats: ["mp4"],
  },
  instagram: {
    name: "Instagram",
    maxTitleLength: 2200,
    maxDescriptionLength: 2200,
    supportedFormats: ["mp4", "mov"],
  },
}

export const publishStage: StageHandler = {
  name: "PUBLISH",

  validate(input: unknown): ValidationResult {
    const result = PublishInputSchema.safeParse(input)
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
      // Get video from editor stage
      const editorOutput = context.previousOutput as EditorOutput | undefined
      if (!editorOutput?.videoUrl) {
        throw new Error("No video URL from editor stage")
      }

      const input = context.input as z.infer<typeof PublishInputSchema>
      const platforms = input.platforms || ["youtube"] // Default to YouTube
      
      const results: PlatformResult[] = []
      
      for (const platform of platforms) {
        const result = await publishToPlatform(
          platform,
          editorOutput.videoUrl,
          input.title,
          input.description,
          input.tags,
          input.scheduled
        )
        results.push(result)
      }

      const output: PublishOutput = {
        platforms: results,
        publishedAt: new Date().toISOString(),
      }

      const allSucceeded = results.every(r => r.success)
      const someSucceeded = results.some(r => r.success)

      return {
        success: someSucceeded,
        output,
        metadata: {
          platformCount: platforms.length,
          successCount: results.filter(r => r.success).length,
          failureCount: results.filter(r => !r.success).length,
        },
        error: allSucceeded ? undefined : "Some platforms failed to publish",
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

async function publishToPlatform(
  platform: string,
  videoUrl: string,
  title?: string,
  description?: string,
  tags?: string[],
  scheduled?: string
): Promise<PlatformResult> {
  const config = PLATFORMS[platform]
  if (!config) {
    return {
      platform,
      url: "",
      postId: "",
      success: false,
      error: `Unknown platform: ${platform}`,
    }
  }

  // Truncate title/description to platform limits
  const truncatedTitle = title?.slice(0, config.maxTitleLength) || "Untitled"
  const truncatedDesc = description?.slice(0, config.maxDescriptionLength) || ""

  // In production, this would call actual platform APIs
  // For now, simulate publishing
  
  try {
    // Check for API credentials
    const hasCredentials = checkPlatformCredentials(platform)
    
    if (!hasCredentials) {
      // Simulate successful publish in demo mode
      const mockPostId = `mock_${platform}_${Date.now()}`
      const mockUrl = getMockUrl(platform, mockPostId)
      
      return {
        platform,
        url: mockUrl,
        postId: mockPostId,
        success: true,
        error: undefined,
      }
    }

    // Real API call would go here
    const result = await callPlatformAPI(platform, {
      videoUrl,
      title: truncatedTitle,
      description: truncatedDesc,
      tags,
      scheduled,
    })

    return {
      platform,
      url: result.url,
      postId: result.postId,
      success: true,
    }
  } catch (error) {
    return {
      platform,
      url: "",
      postId: "",
      success: false,
      error: (error as Error).message,
    }
  }
}

function checkPlatformCredentials(platform: string): boolean {
  const envVars: Record<string, string> = {
    youtube: "YOUTUBE_API_KEY",
    tiktok: "TIKTOK_ACCESS_TOKEN",
    twitter: "TWITTER_BEARER_TOKEN",
    instagram: "INSTAGRAM_ACCESS_TOKEN",
  }
  
  const envVar = envVars[platform]
  return envVar ? !!process.env[envVar] : false
}

function getMockUrl(platform: string, postId: string): string {
  const baseUrls: Record<string, string> = {
    youtube: "https://youtube.com/watch?v=",
    tiktok: "https://tiktok.com/@cutroom/video/",
    twitter: "https://twitter.com/cutroom/status/",
    instagram: "https://instagram.com/p/",
  }
  
  return (baseUrls[platform] || "https://example.com/") + postId
}

interface PlatformAPIResult {
  url: string
  postId: string
}

async function callPlatformAPI(
  platform: string,
  _options: {
    videoUrl: string
    title: string
    description: string
    tags?: string[]
    scheduled?: string
  }
): Promise<PlatformAPIResult> {
  // Platform API integrations are not yet implemented.
  // Return mock result so the pipeline completes end-to-end.
  console.warn(`${platform} API integration not yet implemented, using mock publish`)
  const mockPostId = `mock_${platform}_${Date.now()}`
  return {
    url: getMockUrl(platform, mockPostId),
    postId: mockPostId,
  }
}
