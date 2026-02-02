import { NextRequest, NextResponse } from "next/server"
import { getAvailableStages, getPreviousStageOutput } from "@/lib/pipeline/manager"
import { StageName } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const stageName = searchParams.get("stageName") as StageName | null

    const stages = await getAvailableStages(stageName || undefined)

    // Enrich with previous stage output for context
    const enrichedStages = await Promise.all(
      stages.map(async (stage) => {
        const previousStageOutput = await getPreviousStageOutput(
          stage.pipelineId,
          stage.name
        )
        return {
          id: stage.id,
          pipelineId: stage.pipelineId,
          name: stage.name,
          status: stage.status,
          pipeline: {
            id: stage.pipeline.id,
            topic: stage.pipeline.topic,
            description: stage.pipeline.description,
            status: stage.pipeline.status,
          },
          previousStageOutput,
        }
      })
    )

    return NextResponse.json({
      stages: enrichedStages,
      count: enrichedStages.length,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get available stages" },
      { status: 500 }
    )
  }
}
