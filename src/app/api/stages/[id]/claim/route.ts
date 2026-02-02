import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/client"
import { claimStage } from "@/lib/pipeline/manager"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stageId } = await params
    const body = await request.json()
    const { agentId, agentName } = body

    if (!agentId || !agentName) {
      return NextResponse.json(
        { error: "agentId and agentName are required" },
        { status: 400 }
      )
    }

    // Get stage to find pipelineId and stageName
    const stage = await prisma.stage.findUnique({
      where: { id: stageId },
      include: { pipeline: true },
    })

    if (!stage) {
      return NextResponse.json(
        { error: "Stage not found" },
        { status: 404 }
      )
    }

    const claimed = await claimStage(
      stage.pipelineId,
      stage.name,
      agentId,
      agentName
    )

    return NextResponse.json({
      stage: claimed,
      message: "Stage claimed successfully",
    })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    )
  }
}
