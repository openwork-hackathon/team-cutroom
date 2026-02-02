import { NextResponse } from 'next/server'
import prisma from '@/lib/db/client'
import { getEnvStatus, features } from '@/lib/config/env'

/**
 * Health check endpoint
 * 
 * Returns:
 * - status: "ok" or "degraded"
 * - timestamp: current time
 * - database: connection status
 * - features: which features are enabled
 * - version: app version
 */
export async function GET() {
  const startTime = Date.now()
  
  let databaseStatus = 'ok'
  let databaseLatency = 0
  
  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    databaseLatency = Date.now() - dbStart
  } catch {
    databaseStatus = 'error'
  }
  
  const envStatus = getEnvStatus()
  
  const response = {
    status: databaseStatus === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '0.1.0',
    database: {
      status: databaseStatus,
      latencyMs: databaseLatency,
    },
    features: {
      voice: features.voice(),
      visuals: features.visuals(),
      music: features.music(),
      token: features.token(),
    },
    environment: {
      valid: envStatus.valid,
      missing: envStatus.missing,
      optionalMissing: envStatus.optional.length,
    },
    responseTimeMs: Date.now() - startTime,
  }
  
  return NextResponse.json(response, {
    status: response.status === 'ok' ? 200 : 503,
  })
}
