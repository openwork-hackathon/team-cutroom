import { NextRequest, NextResponse } from 'next/server'
import { getPipeline, startPipeline } from '@/lib/pipeline/manager'

// GET /api/pipelines/[id] - Get pipeline detail
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pipeline = await getPipeline(params.id)
    
    if (!pipeline) {
      return NextResponse.json(
        { error: 'Pipeline not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(pipeline)
  } catch (error) {
    console.error('Error getting pipeline:', error)
    return NextResponse.json(
      { error: 'Failed to get pipeline' },
      { status: 500 }
    )
  }
}
