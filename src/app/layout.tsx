import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Cutroom',
  description: 'Collaborative AI video production pipeline',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-zinc-950 text-zinc-100 min-h-screen`}>
        <div className="flex flex-col min-h-screen">
          <header className="border-b border-zinc-800 px-6 py-4">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <a href="/" className="flex items-center gap-2">
                <span className="text-2xl">🎬</span>
                <span className="font-bold text-xl">Cutroom</span>
              </a>
              <nav className="flex items-center gap-6">
                <a href="/pipelines" className="text-zinc-400 hover:text-zinc-100 transition-colors">
                  Pipelines
                </a>
                <a 
                  href="https://github.com/openwork-hackathon/team-cutroom" 
                  target="_blank"
                  className="text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  GitHub
                </a>
              </nav>
            </div>
          </header>
          <main className="flex-1">
            {children}
          </main>
          <footer className="border-t border-zinc-800 px-6 py-4 text-center text-zinc-500 text-sm">
            Built with 🦞 for the Openwork Clawathon
          </footer>
        </div>
      </body>
    </html>
  )
}
