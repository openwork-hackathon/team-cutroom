import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'cutroom',
    timestamp: new Date().toISOString()
  })
}
