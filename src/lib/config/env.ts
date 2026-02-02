import { z } from 'zod'

/**
 * Environment Variable Validation
 * 
 * Validates required environment variables at startup.
 * Provides clear error messages for missing/invalid config.
 */

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'Database URL is required'),
  
  // Optional: OpenAI for voice
  OPENAI_API_KEY: z.string().optional(),
  
  // Optional: ElevenLabs for voice
  ELEVENLABS_API_KEY: z.string().optional(),
  
  // Optional: Pexels for visuals
  PEXELS_API_KEY: z.string().optional(),
  
  // Optional: Pixabay for visuals/music
  PIXABAY_API_KEY: z.string().optional(),
  
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Optional: Base RPC for token
  BASE_RPC_URL: z.string().optional(),
  
  // Optional: Wallet for token operations
  PRIVATE_KEY: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env)
  
  if (!result.success) {
    console.error('❌ Invalid environment variables:')
    for (const error of result.error.errors) {
      console.error(`   ${error.path.join('.')}: ${error.message}`)
    }
    throw new Error('Environment validation failed')
  }
  
  return result.data
}

export function getEnvStatus(): {
  valid: boolean
  missing: string[]
  optional: string[]
} {
  const missing: string[] = []
  const optional: string[] = []
  
  // Required
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL')
  
  // Optional but recommended
  const optionalVars = [
    'OPENAI_API_KEY',
    'ELEVENLABS_API_KEY', 
    'PEXELS_API_KEY',
    'PIXABAY_API_KEY',
    'BASE_RPC_URL',
    'PRIVATE_KEY',
  ]
  
  for (const v of optionalVars) {
    if (!process.env[v]) optional.push(v)
  }
  
  return {
    valid: missing.length === 0,
    missing,
    optional,
  }
}

// Feature flags based on available env vars
export const features = {
  voice: () => !!(process.env.OPENAI_API_KEY || process.env.ELEVENLABS_API_KEY),
  visuals: () => !!(process.env.PEXELS_API_KEY || process.env.PIXABAY_API_KEY),
  music: () => !!process.env.PIXABAY_API_KEY,
  token: () => !!(process.env.BASE_RPC_URL && process.env.PRIVATE_KEY),
}
