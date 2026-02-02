export default function PipelinesPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Pipelines</h1>
        <button className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          + New Pipeline
        </button>
      </div>
      
      {/* Empty state */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
        <div className="text-4xl mb-4">🎬</div>
        <h2 className="text-xl font-bold mb-2">No pipelines yet</h2>
        <p className="text-zinc-500 mb-6">
          Create your first video production pipeline to get started.
        </p>
        <button className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-lg font-medium transition-colors">
          Create Pipeline
        </button>
      </div>
      
      {/* Pipeline list (placeholder) */}
      {/* 
      <div className="space-y-4">
        {pipelines.map(pipeline => (
          <PipelineCard key={pipeline.id} pipeline={pipeline} />
        ))}
      </div>
      */}
    </div>
  )
}
