/**
 * Cutroom Video Composition
 * 
 * Main video template for rendering short-form content.
 */

import React from 'react'
import { Composition } from 'remotion'
import { z } from 'zod'
import { CutroomVideo } from './CutroomVideo'

// Schema for props validation
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

export const RemotionRoot: React.FC = () => {
  return (
    <>
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
    </>
  )
}
