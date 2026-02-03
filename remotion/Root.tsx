/**
 * Cutroom Video Composition
 * 
 * Main video template for rendering short-form content.
 */

import React from 'react'
import { Composition } from 'remotion'
import { z } from 'zod'
import { CutroomVideo } from './CutroomVideo'
import { TemplateVideo, TemplateVideoProps } from './TemplateVideo'

// Schema for basic props validation
const cutroomVideoSchema = z.object({
  title: z.string(),
  script: z.object({
    hook: z.string(),
    sections: z.array(z.object({
      heading: z.string(),
      content: z.string(),
      duration: z.number(),
      visualUrl: z.string().optional(),
    })),
    cta: z.string(),
  }),
  voiceUrl: z.string().optional(),
  musicUrl: z.string().optional(),
  clips: z.array(z.object({
    url: z.string(),
    startTime: z.number(),
    duration: z.number(),
  })),
})

// Schema for template-based videos
const templateVideoSchema = z.object({
  title: z.string(),
  script: z.object({
    hook: z.string(),
    sections: z.array(z.object({
      heading: z.string(),
      content: z.string(),
      duration: z.number(),
      speaker: z.string().optional(),
    })),
    cta: z.string(),
  }),
  voiceUrl: z.string().optional(),
  musicUrl: z.string().optional(),
  backgroundUrl: z.string().optional(),
  clips: z.array(z.object({
    url: z.string(),
    startTime: z.number(),
    duration: z.number(),
  })).optional(),
  template: z.object({
    visualStyle: z.enum(['broll', 'gameplay', 'gradient', 'static']),
    backgroundColor: z.string().optional(),
    gradientColors: z.tuple([z.string(), z.string()]).optional(),
    backgroundOpacity: z.number().optional(),
    captionStyle: z.enum(['bold', 'subtle', 'karaoke', 'speech-bubble', 'none']),
    captionPosition: z.enum(['top', 'center', 'bottom']),
    captionFont: z.string().optional(),
    captionColor: z.string().optional(),
    captionStroke: z.string().optional(),
    captionAnimation: z.enum(['none', 'word-by-word', 'typewriter', 'fade']),
    transition: z.enum(['cut', 'crossfade', 'swipe']),
    colorGrade: z.object({
      warmth: z.number().optional(),
      saturation: z.number().optional(),
      vignette: z.number().optional(),
    }).optional(),
    watermarkUrl: z.string().optional(),
    watermarkPosition: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right']).optional(),
    showEndCard: z.boolean().optional(),
    ctaText: z.string().optional(),
    isDialog: z.boolean().optional(),
    characters: z.array(z.object({
      name: z.string(),
      spriteUrl: z.string(),
      position: z.enum(['left', 'right']),
      color: z.string(),
    })).optional(),
  }),
})

const defaultProps: z.infer<typeof cutroomVideoSchema> = {
  title: 'Sample Video',
  script: {
    hook: 'Did you know...',
    sections: [
      { heading: 'Introduction', content: 'Welcome to this video', duration: 10 },
      { heading: 'Main Point', content: 'Here is the main content', duration: 40 },
      { heading: 'Conclusion', content: 'Thanks for watching', duration: 10 },
    ],
    cta: 'Follow for more!',
  },
  voiceUrl: undefined,
  musicUrl: undefined,
  clips: [],
}

// Default template props for different styles
const redditMinecraftProps: z.infer<typeof templateVideoSchema> = {
  title: 'AITA for telling my roommate to stop...',
  script: {
    hook: 'Am I the bad guy here?',
    sections: [
      { heading: '', content: 'So my roommate has been leaving dishes in the sink for weeks...', duration: 15 },
      { heading: '', content: 'I finally confronted them about it and they called me controlling.', duration: 15 },
      { heading: '', content: 'Now the whole apartment is giving me the cold shoulder.', duration: 10 },
    ],
    cta: 'Follow for Part 2!',
  },
  template: {
    visualStyle: 'gameplay',
    captionStyle: 'bold',
    captionPosition: 'center',
    captionColor: '#ffffff',
    captionStroke: '#000000',
    captionAnimation: 'word-by-word',
    transition: 'cut',
  },
}

const bedtimeStoryProps: z.infer<typeof templateVideoSchema> = {
  title: 'The Little Star',
  script: {
    hook: 'Once upon a time...',
    sections: [
      { heading: '', content: 'There was a little star who lived in the night sky.', duration: 20 },
      { heading: '', content: 'Every night, the star would shine brightly for all the children below.', duration: 20 },
      { heading: '', content: 'And the children would make wishes upon the little star.', duration: 20 },
    ],
    cta: 'Sweet dreams...',
  },
  template: {
    visualStyle: 'gradient',
    gradientColors: ['#1a1a2e', '#16213e'],
    captionStyle: 'subtle',
    captionPosition: 'center',
    captionColor: '#f0e6d3',
    captionAnimation: 'fade',
    transition: 'crossfade',
    colorGrade: { vignette: 0.4 },
    showEndCard: false,
  },
}

const dialogExplainerProps: z.infer<typeof templateVideoSchema> = {
  title: 'Why is the sky blue?',
  script: {
    hook: 'Hey, I have a question...',
    sections: [
      { heading: '', content: 'Hey, why is the sky blue?', duration: 5, speaker: 'Character A' },
      { heading: '', content: 'Well, light from the sun scatters in the atmosphere!', duration: 8, speaker: 'Character B' },
      { heading: '', content: 'Blue light scatters more because it travels in shorter waves.', duration: 8, speaker: 'Character B' },
      { heading: '', content: 'Ohhh that makes sense!', duration: 4, speaker: 'Character A' },
    ],
    cta: 'Follow for more!',
  },
  template: {
    visualStyle: 'static',
    backgroundColor: '#87ceeb',
    captionStyle: 'speech-bubble',
    captionPosition: 'top',
    captionAnimation: 'none',
    transition: 'cut',
    isDialog: true,
    characters: [
      { name: 'Character A', spriteUrl: '/characters/curious.png', position: 'left', color: '#ffd700' },
      { name: 'Character B', spriteUrl: '/characters/smart.png', position: 'right', color: '#90ee90' },
    ],
  },
}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Basic Compositions */}
      <Composition
        id="CutroomVideo"
        component={CutroomVideo}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1920}
        schema={cutroomVideoSchema}
        defaultProps={defaultProps}
      />
      <Composition
        id="CutroomVideoHorizontal"
        component={CutroomVideo}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
        schema={cutroomVideoSchema}
        defaultProps={defaultProps}
      />

      {/* Template-Based Compositions */}
      <Composition
        id="TemplateVideo"
        component={TemplateVideo}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1920}
        schema={templateVideoSchema}
        defaultProps={redditMinecraftProps}
      />

      {/* Preset Template Compositions */}
      <Composition
        id="RedditMinecraft"
        component={TemplateVideo}
        durationInFrames={1200}
        fps={30}
        width={1080}
        height={1920}
        schema={templateVideoSchema}
        defaultProps={redditMinecraftProps}
      />

      <Composition
        id="BedtimeStory"
        component={TemplateVideo}
        durationInFrames={2700}
        fps={30}
        width={1080}
        height={1920}
        schema={templateVideoSchema}
        defaultProps={bedtimeStoryProps}
      />

      <Composition
        id="DialogExplainer"
        component={TemplateVideo}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        schema={templateVideoSchema}
        defaultProps={dialogExplainerProps}
      />
    </>
  )
}
