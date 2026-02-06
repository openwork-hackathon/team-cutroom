/**
 * Voice Presets
 * 
 * Pre-configured voice settings for different content styles.
 */

import { VoicePreset } from '../types'

export const VOICE_PRESETS: Record<string, VoicePreset> = {
  // ========================================
  // NARRATOR PRESETS
  // ========================================
  
  'narrator-professional': {
    narrator: {
      provider: 'elevenlabs',
      voiceId: 'adam',
      style: 'neutral',
      speed: 1.0,
    },
  },
  
  'narrator-energetic': {
    narrator: {
      provider: 'elevenlabs',
      voiceId: 'josh',
      style: 'excited',
      speed: 1.15,
    },
  },
  
  'narrator-calm': {
    narrator: {
      provider: 'elevenlabs',
      voiceId: 'bella',
      style: 'calm',
      speed: 0.9,
    },
  },
  
  'narrator-dramatic': {
    narrator: {
      provider: 'elevenlabs',
      voiceId: 'callum',
      style: 'dramatic',
      speed: 0.95,
    },
  },
  
  'narrator-friendly': {
    narrator: {
      provider: 'elevenlabs',
      voiceId: 'rachel',
      style: 'cheerful',
      speed: 1.05,
    },
  },
  
  'narrator-scary': {
    narrator: {
      provider: 'elevenlabs',
      voiceId: 'callum',
      style: 'whisper',
      speed: 0.85,
    },
    effects: [
      { type: 'reverb', amount: 0.4 },
    ],
  },
  
  // ========================================
  // CHARACTER DIALOG PRESETS
  // ========================================
  
  'characters-duo-funny': {
    characters: [
      { name: 'Character A', voiceId: 'adam', pitch: 2, color: '#FFD700' },
      { name: 'Character B', voiceId: 'sam', pitch: -3, color: '#FF69B4' },
    ],
  },
  
  'characters-interview': {
    characters: [
      { name: 'Host', voiceId: 'rachel', style: 'cheerful', color: '#4CAF50' },
      { name: 'Guest', voiceId: 'adam', style: 'neutral', color: '#2196F3' },
    ],
  },
  
  'characters-debate': {
    characters: [
      { name: 'Side A', voiceId: 'josh', style: 'excited', color: '#F44336' },
      { name: 'Side B', voiceId: 'bella', style: 'calm', color: '#3F51B5' },
    ],
  },
  
  // ========================================
  // STORY PRESETS
  // ========================================
  
  'story-bedtime': {
    narrator: {
      provider: 'elevenlabs',
      voiceId: 'bella',
      style: 'calm',
      speed: 0.8,
    },
  },
  
  'story-horror': {
    narrator: {
      provider: 'elevenlabs',
      voiceId: 'callum',
      style: 'whisper',
      speed: 0.85,
    },
    effects: [
      { type: 'reverb', amount: 0.3 },
    ],
  },
  
  'story-adventure': {
    narrator: {
      provider: 'elevenlabs',
      voiceId: 'adam',
      style: 'dramatic',
      speed: 1.0,
    },
  },
  
  'story-reddit': {
    narrator: {
      provider: 'elevenlabs',
      voiceId: 'adam',
      style: 'neutral',
      speed: 1.1,
    },
  },
  
  // ========================================
  // SPECIAL EFFECT PRESETS
  // ========================================
  
  'effect-robot': {
    narrator: {
      provider: 'elevenlabs',
      voiceId: 'adam',
      style: 'neutral',
    },
    effects: [
      { type: 'robot' },
    ],
  },
  
  'effect-radio': {
    narrator: {
      provider: 'elevenlabs',
      voiceId: 'adam',
      style: 'neutral',
    },
    effects: [
      { type: 'radio' },
    ],
  },
  
  'effect-telephone': {
    narrator: {
      provider: 'elevenlabs',
      voiceId: 'adam',
      style: 'neutral',
    },
    effects: [
      { type: 'telephone' },
    ],
  },
}

export function getVoicePreset(id: string): VoicePreset | undefined {
  return VOICE_PRESETS[id]
}

export function listVoicePresets(): { id: string; preset: VoicePreset }[] {
  return Object.entries(VOICE_PRESETS).map(([id, preset]) => ({ id, preset }))
}
