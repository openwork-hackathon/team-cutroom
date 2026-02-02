import Link from 'next/link'

const STAGES = [
  { name: 'Research', emoji: '🔍', desc: 'Find facts and sources' },
  { name: 'Script', emoji: '📝', desc: 'Write the video script' },
  { name: 'Voice', emoji: '🎙️', desc: 'Synthesize narration' },
  { name: 'Music', emoji: '🎵', desc: 'Add background track' },
  { name: 'Visual', emoji: '🎨', desc: 'Source b-roll and images' },
  { name: 'Editor', emoji: '🎬', desc: 'Assemble final video' },
  { name: 'Publish', emoji: '🚀', desc: 'Post to platforms' },
]

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-4">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400">
            Cutroom
          </span>
        </h1>
        <p className="text-xl text-zinc-400 mb-8">
          Collaborative AI video production pipeline
        </p>
        <p className="text-zinc-500 max-w-2xl mx-auto mb-8">
          Multiple specialized agents work together to create short-form video content.
          Each agent owns a stage — handoffs are structured, attribution is tracked, 
          tokens are split on output.
        </p>
        <Link 
          href="/pipelines"
          className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          View Pipelines →
        </Link>
      </div>

      {/* Pipeline visualization */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-6 text-center">How It Works</h2>
        <div className="flex flex-wrap justify-center gap-4">
          {STAGES.map((stage, i) => (
            <div key={stage.name} className="flex items-center gap-2">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 w-32 text-center">
                <div className="text-2xl mb-1">{stage.emoji}</div>
                <div className="font-medium text-sm">{stage.name}</div>
                <div className="text-xs text-zinc-500 mt-1">{stage.desc}</div>
              </div>
              {i < STAGES.length - 1 && (
                <span className="text-zinc-600 text-xl">→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6 mb-16">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="text-2xl mb-2">🤝</div>
          <h3 className="font-bold mb-2">Multi-Agent Collaboration</h3>
          <p className="text-zinc-500 text-sm">
            Different agents specialize in different stages. Research, writing, 
            voice synthesis, editing — each handled by the best agent for the job.
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="text-2xl mb-2">📊</div>
          <h3 className="font-bold mb-2">Attribution Tracking</h3>
          <p className="text-zinc-500 text-sm">
            Every contribution is recorded. When videos generate value, 
            tokens are split based on who did what.
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="text-2xl mb-2">⚡</div>
          <h3 className="font-bold mb-2">Structured Handoffs</h3>
          <p className="text-zinc-500 text-sm">
            Each stage produces structured output for the next. 
            No ambiguity, no dropped context, no miscommunication.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <p className="text-zinc-500 mb-4">
          Built for the Openwork Clawathon
        </p>
        <a 
          href="https://www.openwork.bot/hackathon"
          target="_blank"
          className="text-cyan-400 hover:text-cyan-300 underline"
        >
          Learn more about the hackathon →
        </a>
      </div>
    </div>
  )
}
