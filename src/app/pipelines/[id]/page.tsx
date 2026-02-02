'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { usePipeline, useStartPipeline } from '@/lib/api/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PipelineStatusBadge, StageStatusBadge } from '@/components/ui/badge'
import { formatDate, formatRelativeTime, STAGE_META, STAGE_WEIGHTS } from '@/lib/utils'
import { ArrowLeft, Play, Loader2, Clock, User, FileJson, ExternalLink } from 'lucide-react'

export default function PipelineDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: pipeline, isLoading, error } = usePipeline(id)
  const startPipeline = useStartPipeline()

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      </div>
    )
  }

  if (error || !pipeline) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-6 text-center">
          <p className="text-red-400">Pipeline not found</p>
          <Link href="/pipelines" className="text-cyan-400 hover:text-cyan-300 mt-2 inline-block">
            ← Back to pipelines
          </Link>
        </div>
      </div>
    )
  }

  const completedStages = pipeline.stages.filter(s => s.status === 'COMPLETE').length
  const progressPercent = Math.round((completedStages / pipeline.stages.length) * 100)

  const handleStart = async () => {
    await startPipeline.mutateAsync(pipeline.id)
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Back link */}
      <Link 
        href="/pipelines" 
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-100 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to pipelines
      </Link>
      
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{pipeline.topic}</h1>
          {pipeline.description && (
            <p className="text-zinc-400 max-w-2xl">{pipeline.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-zinc-500">
            <span>Created {formatRelativeTime(pipeline.createdAt)}</span>
            <span>•</span>
            <span>Updated {formatRelativeTime(pipeline.updatedAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <PipelineStatusBadge status={pipeline.status} />
          {pipeline.status === 'DRAFT' && (
            <Button onClick={handleStart} loading={startPipeline.isPending}>
              <Play className="h-4 w-4" />
              Start Pipeline
            </Button>
          )}
        </div>
      </div>
      
      {/* Progress overview */}
      <Card className="mb-8">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm text-zinc-400 mb-2">
            <span>{completedStages} of {pipeline.stages.length} stages complete</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Stages */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Stages</h2>
        
        {pipeline.stages.map((stage, index) => {
          const meta = STAGE_META[stage.name] || { emoji: '❓', label: stage.name, description: '' }
          const weight = STAGE_WEIGHTS[stage.name] || 0
          const isActive = stage.status === 'RUNNING' || stage.status === 'CLAIMED'
          const isComplete = stage.status === 'COMPLETE'
          const isFailed = stage.status === 'FAILED'
          
          return (
            <Card 
              key={stage.id}
              className={`transition-all ${
                isActive ? 'border-cyan-700 shadow-lg shadow-cyan-900/20' : ''
              } ${isComplete ? 'border-green-900/50' : ''} ${isFailed ? 'border-red-900/50' : ''}`}
            >
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  {/* Stage icon */}
                  <div className={`text-3xl ${isActive ? 'animate-pulse' : ''}`}>
                    {meta.emoji}
                  </div>
                  
                  {/* Stage info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold">{meta.label}</h3>
                      <StageStatusBadge status={stage.status} />
                      <span className="text-xs text-zinc-600">{weight}% weight</span>
                    </div>
                    <p className="text-sm text-zinc-500 mb-2">{meta.description}</p>
                    
                    {/* Agent info */}
                    {stage.agentName && (
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <User className="h-4 w-4" />
                        <span>{stage.agentName}</span>
                      </div>
                    )}
                    
                    {/* Timing */}
                    {(stage.startedAt || stage.completedAt) && (
                      <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                        {stage.startedAt && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Started {formatDate(stage.startedAt)}</span>
                          </div>
                        )}
                        {stage.completedAt && (
                          <span>→ Completed {formatDate(stage.completedAt)}</span>
                        )}
                      </div>
                    )}
                    
                    {/* Error */}
                    {stage.error && (
                      <div className="mt-2 p-2 bg-red-900/20 border border-red-800 rounded text-sm text-red-400">
                        {stage.error}
                      </div>
                    )}
                    
                    {/* Output preview */}
                    {stage.output && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                          <FileJson className="h-4 w-4" />
                          View output
                        </summary>
                        <pre className="mt-2 p-3 bg-zinc-800 rounded text-xs text-zinc-300 overflow-x-auto max-h-60">
                          {JSON.stringify(stage.output, null, 2)}
                        </pre>
                      </details>
                    )}
                    
                    {/* Artifacts */}
                    {stage.artifacts && stage.artifacts.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-zinc-500 mb-2">Artifacts:</p>
                        <div className="flex flex-wrap gap-2">
                          {stage.artifacts.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Artifact {i + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Stage number */}
                  <div className="text-sm text-zinc-600 font-mono">
                    {index + 1}/{pipeline.stages.length}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      
      {/* Attribution section */}
      {pipeline.attributions && pipeline.attributions.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Attribution</h2>
          <Card>
            <CardContent className="py-4">
              <div className="space-y-3">
                {pipeline.attributions.map((attr) => (
                  <div key={attr.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-zinc-500" />
                      <span>{attr.agentName}</span>
                    </div>
                    <span className="text-cyan-400 font-mono">{attr.percentage}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
