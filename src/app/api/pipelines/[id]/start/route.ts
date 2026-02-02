import { NextRequest, NextResponse } from 'next/server'
import { startPipeline, getPipeline } from '@/lib/pipeline/manager'

// POST /api/pipelines/[id]/start - Start pipeline execution
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await getPipeline(params.id)
    
    if (!existing) {
      return NextResponse.json(
        { error: 'Pipeline not found' },
        { status: 404 }
      )
    }
    
    if (existing.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Pipeline already started' },
        { status: 400 }
      )
    }
    
    const pipeline = await startPipeline(params.id)
    
    return NextResponse.json({
      message: 'Pipeline started',
      pipeline
    })
  } catch (error) {
    console.error('Error starting pipeline:', error)
    return NextResponse.json(
      { error: 'Failed to start pipeline' },
      { status: 500 }
    )
  }
}
