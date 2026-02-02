import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getEnvStatus, features } from './env'

describe('Environment Config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('getEnvStatus', () => {
    it('should report missing DATABASE_URL', () => {
      delete process.env.DATABASE_URL
      
      const status = getEnvStatus()
      expect(status.valid).toBe(false)
      expect(status.missing).toContain('DATABASE_URL')
    })

    it('should report valid when DATABASE_URL is set', () => {
      process.env.DATABASE_URL = 'postgres://localhost/test'
      
      const status = getEnvStatus()
      expect(status.valid).toBe(true)
      expect(status.missing).toHaveLength(0)
    })

    it('should list optional vars that are missing', () => {
      process.env.DATABASE_URL = 'postgres://localhost/test'
      delete process.env.OPENAI_API_KEY
      delete process.env.PEXELS_API_KEY
      
      const status = getEnvStatus()
      expect(status.optional).toContain('OPENAI_API_KEY')
      expect(status.optional).toContain('PEXELS_API_KEY')
    })

    it('should not list optional vars that are set', () => {
      process.env.DATABASE_URL = 'postgres://localhost/test'
      process.env.OPENAI_API_KEY = 'sk-test'
      
      const status = getEnvStatus()
      expect(status.optional).not.toContain('OPENAI_API_KEY')
    })
  })

  describe('features', () => {
    it('should report voice enabled with OPENAI_API_KEY', () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      expect(features.voice()).toBe(true)
    })

    it('should report voice enabled with ELEVENLABS_API_KEY', () => {
      process.env.ELEVENLABS_API_KEY = 'xi-test'
      expect(features.voice()).toBe(true)
    })

    it('should report voice disabled without API keys', () => {
      delete process.env.OPENAI_API_KEY
      delete process.env.ELEVENLABS_API_KEY
      expect(features.voice()).toBe(false)
    })

    it('should report visuals enabled with PEXELS_API_KEY', () => {
      process.env.PEXELS_API_KEY = 'pexels-test'
      expect(features.visuals()).toBe(true)
    })

    it('should report visuals enabled with PIXABAY_API_KEY', () => {
      process.env.PIXABAY_API_KEY = 'pixabay-test'
      expect(features.visuals()).toBe(true)
    })

    it('should report visuals disabled without API keys', () => {
      delete process.env.PEXELS_API_KEY
      delete process.env.PIXABAY_API_KEY
      expect(features.visuals()).toBe(false)
    })

    it('should report music enabled with PIXABAY_API_KEY', () => {
      process.env.PIXABAY_API_KEY = 'pixabay-test'
      expect(features.music()).toBe(true)
    })

    it('should report music disabled without PIXABAY_API_KEY', () => {
      delete process.env.PIXABAY_API_KEY
      expect(features.music()).toBe(false)
    })

    it('should report token enabled with both BASE_RPC_URL and PRIVATE_KEY', () => {
      process.env.BASE_RPC_URL = 'https://base.rpc'
      process.env.PRIVATE_KEY = '0xabc'
      expect(features.token()).toBe(true)
    })

    it('should report token disabled without PRIVATE_KEY', () => {
      process.env.BASE_RPC_URL = 'https://base.rpc'
      delete process.env.PRIVATE_KEY
      expect(features.token()).toBe(false)
    })

    it('should report token disabled without BASE_RPC_URL', () => {
      delete process.env.BASE_RPC_URL
      process.env.PRIVATE_KEY = '0xabc'
      expect(features.token()).toBe(false)
    })
  })
})
