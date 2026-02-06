/**
 * Template to Remotion Props Converter
 * 
 * Converts Cutroom template configuration to Remotion TemplateVideo props.
 */

import { VideoTemplate } from './types'

export interface RemotionTemplateProps {
  visualStyle: 'broll' | 'gameplay' | 'gradient' | 'static'
  backgroundColor?: string
  gradientColors?: [string, string]
  backgroundOpacity?: number
  captionStyle: 'bold' | 'subtle' | 'karaoke' | 'speech-bubble' | 'none'
  captionPosition: 'top' | 'center' | 'bottom'
  captionFont?: string
  captionColor?: string
  captionStroke?: string
  captionAnimation: 'none' | 'word-by-word' | 'typewriter' | 'fade'
  transition: 'cut' | 'crossfade' | 'swipe'
  colorGrade?: {
    warmth?: number
    saturation?: number
    vignette?: number
  }
  watermarkUrl?: string
  watermarkPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  showEndCard?: boolean
  ctaText?: string
  isDialog?: boolean
  characters?: Array<{
    name: string
    spriteUrl: string
    position: 'left' | 'right'
    color: string
  }>
}

/**
 * Convert a VideoTemplate to Remotion-compatible props
 */
export function templateToRemotionProps(template: VideoTemplate): RemotionTemplateProps {
  const { voice, visuals, audio, layout, structure } = template

  // Determine visual style
  let visualStyle: RemotionTemplateProps['visualStyle'] = 'static'
  let backgroundColor: string | undefined
  let gradientColors: [string, string] | undefined
  const backgroundOpacity: number | undefined = visuals.background.opacity

  if (visuals.background.type === 'gameplay') {
    visualStyle = 'gameplay'
  } else if (visuals.background.type === 'video' || visuals.background.type === 'broll') {
    visualStyle = 'broll'
  } else if (visuals.background.type === 'static') {
    visualStyle = 'static'
    backgroundColor = visuals.background.color
  } else if (visuals.background.type === 'gradient') {
    visualStyle = 'gradient'
    gradientColors = visuals.background.gradient as [string, string]
  } else if (visuals.background.type === 'particles') {
    visualStyle = 'static' // fallback for particles
  }

  // Determine caption style
  let captionStyle: RemotionTemplateProps['captionStyle'] = 'bold'
  let captionPosition: RemotionTemplateProps['captionPosition'] = 'bottom'
  let captionAnimation: RemotionTemplateProps['captionAnimation'] = 'fade'
  let captionColor: string | undefined
  let captionStroke: string | undefined
  let captionFont: string | undefined

  if (layout.captions) {
    // Style is now an object with font, fontSize, color, etc.
    captionStyle = 'bold' // Default style
    // Map position to valid Remotion values
    const pos = layout.captions.position
    captionPosition = pos === 'top' || pos === 'top-left' || pos === 'top-right' ? 'top' :
                      pos === 'center' || pos === 'center-left' || pos === 'center-right' ? 'center' : 'bottom'
    captionColor = layout.captions.style?.color
    captionStroke = layout.captions.style?.stroke?.color
    captionFont = layout.captions.style?.font
    captionAnimation = layout.captions.animation === 'word-by-word' ? 'word-by-word' :
                       layout.captions.animation === 'typewriter' ? 'typewriter' : 'fade'
  }

  // Check if dialog mode
  const isDialog = structure.format === 'dialog' && voice.characters && voice.characters.length > 1
  let characters: RemotionTemplateProps['characters'] | undefined

  if (isDialog && voice.characters) {
    characters = voice.characters.map((char, i) => ({
      name: char.name,
      spriteUrl: char.icon || `/characters/default-${i + 1}.png`,
      position: (i % 2 === 0 ? 'left' : 'right') as 'left' | 'right',
      color: char.color || (i % 2 === 0 ? '#ffd700' : '#90ee90'),
    }))
    captionStyle = 'speech-bubble'
  }

  // Branding
  let watermarkUrl: string | undefined
  let watermarkPosition: RemotionTemplateProps['watermarkPosition'] | undefined
  let showEndCard: boolean | undefined
  let ctaText: string | undefined

  if (layout.branding) {
    watermarkUrl = layout.branding.watermarkUrl
    watermarkPosition = layout.branding.watermarkPosition
    showEndCard = layout.branding.showEndCard
    ctaText = layout.branding.ctaStyle === 'text' && structure.cta?.text 
      ? structure.cta.text 
      : undefined
  }

  // Color grading
  let colorGrade: RemotionTemplateProps['colorGrade'] | undefined
  if (visuals.colorGrading) {
    colorGrade = {
      warmth: visuals.colorGrading.warmth,
      saturation: visuals.colorGrading.saturation,
      vignette: visuals.colorGrading.vignette,
    }
  }

  // Transition
  const transition: RemotionTemplateProps['transition'] = 
    visuals.transitions?.type === 'crossfade' ? 'crossfade' :
    visuals.transitions?.type === 'swipe' ? 'swipe' : 'cut'

  return {
    visualStyle,
    backgroundColor,
    gradientColors,
    backgroundOpacity,
    captionStyle,
    captionPosition,
    captionFont,
    captionColor,
    captionStroke,
    captionAnimation,
    transition,
    colorGrade,
    watermarkUrl,
    watermarkPosition,
    showEndCard,
    ctaText,
    isDialog,
    characters,
  }
}

/**
 * Get the background URL from visuals config
 */
export function getBackgroundUrl(visuals: VideoTemplate['visuals']): string | undefined {
  if (visuals.background.type === 'gameplay') {
    // Return a placeholder - actual URL would be fetched from library
    return `/gameplay/${visuals.background.game}.mp4`
  }
  if (visuals.background.type === 'video' && visuals.background.url) {
    return visuals.background.url
  }
  if (visuals.background.type === 'image' && visuals.background.url) {
    return visuals.background.url
  }
  return undefined
}

/**
 * Calculate video duration in frames based on script and template
 */
export function calculateDurationInFrames(
  script: { sections: Array<{ duration: number }> },
  template: VideoTemplate,
  fps: number = 30
): number {
  const sectionDuration = script.sections.reduce((sum, s) => sum + s.duration, 0)
  const introDuration = template.structure.pacing?.introDuration || 3
  const outroDuration = template.structure.pacing?.outroDuration || 3
  
  return Math.ceil((sectionDuration + introDuration + outroDuration) * fps)
}
