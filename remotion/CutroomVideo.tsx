/**
 * Main Cutroom Video Component
 * 
 * Renders a short-form video with:
 * - Title card intro
 * - Sections with captions
 * - B-roll visuals
 * - Voice + music audio tracks
 * - CTA outro
 */

import React from 'react'
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion'

export interface ScriptSection {
  heading: string
  content: string
  duration: number // in seconds
  visualUrl?: string
}

export interface CutroomVideoProps {
  title: string
  script: {
    hook: string
    sections: ScriptSection[]
    cta: string
  }
  voiceUrl?: string
  musicUrl?: string
  clips: Array<{
    url: string
    startTime: number
    duration: number
  }>
}

export const CutroomVideo: React.FC<CutroomVideoProps> = ({
  title,
  script,
  voiceUrl,
  musicUrl,
  clips,
}) => {
  const { fps, width, height, durationInFrames } = useVideoConfig()
  const frame = useCurrentFrame()

  // Calculate section timings
  const introDuration = 3 * fps // 3 seconds for intro
  const outroDuration = 3 * fps // 3 seconds for outro
  
  const sectionFrames = script.sections.map(s => s.duration * fps)
  const totalSectionFrames = sectionFrames.reduce((a, b) => a + b, 0)

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      {/* Background gradient */}
      <AbsoluteFill
        style={{
          background: 'linear-gradient(180deg, #1a1a2e 0%, #0a0a0a 100%)',
        }}
      />

      {/* B-roll clips */}
      {clips.map((clip, i) => (
        <Sequence
          key={i}
          from={Math.floor(clip.startTime * fps)}
          durationInFrames={Math.floor(clip.duration * fps)}
        >
          <AbsoluteFill style={{ opacity: 0.4 }}>
            <Img
              src={clip.url}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </AbsoluteFill>
        </Sequence>
      ))}

      {/* Intro Sequence */}
      <Sequence durationInFrames={introDuration}>
        <TitleCard title={title} hook={script.hook} />
      </Sequence>

      {/* Content Sections */}
      {(() => {
        let currentFrame = introDuration
        return script.sections.map((section, i) => {
          const from = currentFrame
          const duration = sectionFrames[i]
          currentFrame += duration
          
          return (
            <Sequence key={i} from={from} durationInFrames={duration}>
              <ContentSection section={section} />
            </Sequence>
          )
        })
      })()}

      {/* Outro Sequence */}
      <Sequence from={durationInFrames - outroDuration}>
        <OutroCard cta={script.cta} />
      </Sequence>

      {/* Voiceover Audio */}
      {voiceUrl && (
        <Audio src={voiceUrl} volume={1} />
      )}

      {/* Background Music */}
      {musicUrl && (
        <Audio src={musicUrl} volume={0.2} />
      )}
    </AbsoluteFill>
  )
}

// Title Card Component
const TitleCard: React.FC<{ title: string; hook: string }> = ({ title, hook }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const titleOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' })
  const titleY = interpolate(frame, [0, 15], [50, 0], { extrapolateRight: 'clamp' })
  
  const hookOpacity = interpolate(frame, [20, 35], [0, 1], { extrapolateRight: 'clamp' })
  const hookScale = spring({ frame: frame - 20, fps, config: { damping: 12 } })

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
      }}
    >
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            color: '#fff',
            fontSize: 64,
            fontWeight: 'bold',
            fontFamily: 'Inter, system-ui, sans-serif',
            margin: 0,
            textShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          {title}
        </h1>
      </div>

      <div
        style={{
          opacity: hookOpacity,
          transform: `scale(${hookScale})`,
          marginTop: 40,
          textAlign: 'center',
        }}
      >
        <p
          style={{
            color: '#a0a0ff',
            fontSize: 36,
            fontFamily: 'Inter, system-ui, sans-serif',
            margin: 0,
          }}
        >
          {hook}
        </p>
      </div>
    </AbsoluteFill>
  )
}

// Content Section Component
const ContentSection: React.FC<{ section: ScriptSection }> = ({ section }) => {
  const frame = useCurrentFrame()
  const { fps, height } = useVideoConfig()

  const headingOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' })
  const contentOpacity = interpolate(frame, [10, 25], [0, 1], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        padding: 40,
        paddingBottom: 120,
      }}
    >
      {/* Section heading */}
      <div
        style={{
          opacity: headingOpacity,
          marginBottom: 20,
        }}
      >
        <span
          style={{
            color: '#7b7bff',
            fontSize: 28,
            fontWeight: 600,
            fontFamily: 'Inter, system-ui, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: 2,
          }}
        >
          {section.heading}
        </span>
      </div>

      {/* Caption text */}
      <div
        style={{
          opacity: contentOpacity,
          background: 'rgba(0,0,0,0.7)',
          padding: '20px 30px',
          borderRadius: 12,
          backdropFilter: 'blur(10px)',
        }}
      >
        <p
          style={{
            color: '#fff',
            fontSize: 42,
            fontWeight: 500,
            fontFamily: 'Inter, system-ui, sans-serif',
            margin: 0,
            lineHeight: 1.4,
            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
          }}
        >
          {section.content}
        </p>
      </div>
    </AbsoluteFill>
  )
}

// Outro Card Component
const OutroCard: React.FC<{ cta: string }> = ({ cta }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' })
  const scale = spring({ frame, fps, config: { damping: 10 } })

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
      }}
    >
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          textAlign: 'center',
        }}
      >
        {/* CTA */}
        <p
          style={{
            color: '#fff',
            fontSize: 48,
            fontWeight: 'bold',
            fontFamily: 'Inter, system-ui, sans-serif',
            margin: 0,
          }}
        >
          {cta}
        </p>

        {/* Follow button */}
        <div
          style={{
            marginTop: 40,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px 60px',
            borderRadius: 50,
            display: 'inline-block',
          }}
        >
          <span
            style={{
              color: '#fff',
              fontSize: 32,
              fontWeight: 600,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            Follow @cutroom
          </span>
        </div>

        {/* Cutroom branding */}
        <p
          style={{
            color: '#666',
            fontSize: 24,
            fontFamily: 'Inter, system-ui, sans-serif',
            marginTop: 60,
          }}
        >
          Made with Cutroom 🎬
        </p>
      </div>
    </AbsoluteFill>
  )
}
