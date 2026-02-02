import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/client"
import { completeStage } from "@/lib/pipeline/manager"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stageId } = await params
    const body = await request.json()
    const { output, artifacts = [] } = body

    if (!output) {
      return NextResponse.json(
        { error: "output is required" },
        { status: 400 }
      )
    }

    // Get stage info before completing
    const stageInfo = await prisma.stage.findUnique({
      where: { id: stageId },
    })

    if (!stageInfo) {
      return NextResponse.json(
        { error: "Stage not found" },
        { status: 404 }
      )
    }

    if (!["CLAIMED", "RUNNING"].includes(stageInfo.status)) {
      return NextResponse.json(
        { error: "Stage cannot be completed", currentStatus: stageInfo.status },
        { status: 400 }
      )
    }

    // Complete the stage (attribution is recorded automatically)
    const { stage, pipeline } = await completeStage(
      stageId,
      output,
      artifacts
    )

    const isComplete = pipeline.status === "COMPLETE"

    return NextResponse.json({
      stage,
      pipeline,
      isComplete,
      message: isComplete
        ? "Pipeline completed! 🎉"
        : "Stage completed successfully",
    })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    )
  }
}
