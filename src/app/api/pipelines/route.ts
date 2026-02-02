import { NextRequest, NextResponse } from 'next/server'
import { createPipeline, listPipelines } from '@/lib/pipeline/manager'

// GET /api/pipelines - List all pipelines
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as any
    const limit = parseInt(searchParams.get('limit') || '20')
    
    const pipelines = await listPipelines(limit, status || undefined)
    
    return NextResponse.json({ 
      pipelines,
      count: pipelines.length 
    })
  } catch (error) {
    console.error('Error listing pipelines:', error)
    return NextResponse.json(
      { error: 'Failed to list pipelines' },
      { status: 500 }
    )
  }
}

// POST /api/pipelines - Create new pipeline
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { topic, description } = body
    
    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      )
    }
    
    const pipeline = await createPipeline(topic, description)
    
    return NextResponse.json(pipeline, { status: 201 })
  } catch (error) {
    console.error('Error creating pipeline:', error)
    return NextResponse.json(
      { error: 'Failed to create pipeline' },
      { status: 500 }
    )
  }
}
