import { describe, it, expect } from 'vitest'
import {
  MINT_CLUB_CONTRACTS,
  OPENWORK_TOKEN,
  CUTROOM_TOKEN,
  CUTROOM_BOND_PARAMS,
  STAGE_TOKEN_WEIGHTS,
  calculateTokenDistribution,
} from './config'

describe('Token Config', () => {
  describe('MINT_CLUB_CONTRACTS', () => {
    it('has valid Base contract addresses', () => {
      expect(MINT_CLUB_CONTRACTS.base.bond).toMatch(/^0x[a-fA-F0-9]{40}$/)
      expect(MINT_CLUB_CONTRACTS.base.token).toMatch(/^0x[a-fA-F0-9]{40}$/)
      expect(MINT_CLUB_CONTRACTS.base.zap).toMatch(/^0x[a-fA-F0-9]{40}$/)
    })
  })

  describe('OPENWORK_TOKEN', () => {
    it('has valid token configuration', () => {
      expect(OPENWORK_TOKEN.address).toMatch(/^0x[a-fA-F0-9]{40}$/)
      expect(OPENWORK_TOKEN.symbol).toBe('OPENWORK')
      expect(OPENWORK_TOKEN.decimals).toBe(18)
      expect(OPENWORK_TOKEN.chain).toBe('base')
    })
  })

  describe('CUTROOM_TOKEN', () => {
    it('has valid token configuration', () => {
      expect(CUTROOM_TOKEN.symbol).toBe('CUTROOM')
      expect(CUTROOM_TOKEN.decimals).toBe(18)
      expect(CUTROOM_TOKEN.chain).toBe('base')
      expect(CUTROOM_TOKEN.reserveToken).toBe(OPENWORK_TOKEN.address)
    })
  })

  describe('CUTROOM_BOND_PARAMS', () => {
    it('has correct name and symbol', () => {
      expect(CUTROOM_BOND_PARAMS.name).toBe('Cutroom')
      expect(CUTROOM_BOND_PARAMS.symbol).toBe('CUTROOM')
    })

    it('has valid max supply (10M tokens)', () => {
      const expectedMaxSupply = BigInt('10000000000000000000000000')
      expect(CUTROOM_BOND_PARAMS.maxSupply).toBe(expectedMaxSupply)
    })

    it('has reasonable royalties (1% each)', () => {
      expect(CUTROOM_BOND_PARAMS.mintRoyalty).toBe(100)
      expect(CUTROOM_BOND_PARAMS.burnRoyalty).toBe(100)
    })

    it('has matching step ranges and prices', () => {
      expect(CUTROOM_BOND_PARAMS.stepRanges.length).toBe(3)
      expect(CUTROOM_BOND_PARAMS.stepPrices.length).toBe(3)
    })

    it('step ranges are in ascending order', () => {
      const ranges = CUTROOM_BOND_PARAMS.stepRanges
      for (let i = 1; i < ranges.length; i++) {
        expect(ranges[i]).toBeGreaterThan(ranges[i - 1])
      }
    })

    it('step prices are in ascending order (later tokens cost more)', () => {
      const prices = CUTROOM_BOND_PARAMS.stepPrices
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThan(prices[i - 1])
      }
    })

    it('last step range equals max supply', () => {
      const lastRange = CUTROOM_BOND_PARAMS.stepRanges[CUTROOM_BOND_PARAMS.stepRanges.length - 1]
      expect(lastRange).toBe(CUTROOM_BOND_PARAMS.maxSupply)
    })
  })

  describe('STAGE_TOKEN_WEIGHTS', () => {
    it('has all pipeline stages', () => {
      const stages = ['RESEARCH', 'SCRIPT', 'VOICE', 'MUSIC', 'VISUAL', 'EDITOR', 'PUBLISH']
      stages.forEach(stage => {
        expect(STAGE_TOKEN_WEIGHTS[stage as keyof typeof STAGE_TOKEN_WEIGHTS]).toBeDefined()
      })
    })

    it('weights sum to 100', () => {
      const total = Object.values(STAGE_TOKEN_WEIGHTS).reduce((sum, w) => sum + w, 0)
      expect(total).toBe(100)
    })

    it('all weights are positive', () => {
      Object.values(STAGE_TOKEN_WEIGHTS).forEach(weight => {
        expect(weight).toBeGreaterThan(0)
      })
    })
  })

  describe('calculateTokenDistribution', () => {
    it('distributes tokens according to weights', () => {
      const totalTokens = BigInt('1000000000000000000000') // 1000 tokens
      const attributions = [
        { stageName: 'SCRIPT' as const, agentAddress: '0x1111' },
        { stageName: 'VOICE' as const, agentAddress: '0x2222' },
      ]

      const distribution = calculateTokenDistribution(totalTokens, attributions)

      // SCRIPT = 25%, VOICE = 20%
      const expectedScript = (totalTokens * BigInt(25)) / BigInt(100)
      const expectedVoice = (totalTokens * BigInt(20)) / BigInt(100)

      expect(distribution.get('0x1111')).toBe(expectedScript)
      expect(distribution.get('0x2222')).toBe(expectedVoice)
    })

    it('aggregates multiple stages for same agent', () => {
      const totalTokens = BigInt('1000000000000000000000')
      const attributions = [
        { stageName: 'RESEARCH' as const, agentAddress: '0x1111' },
        { stageName: 'SCRIPT' as const, agentAddress: '0x1111' },
      ]

      const distribution = calculateTokenDistribution(totalTokens, attributions)

      // RESEARCH = 10%, SCRIPT = 25% = 35% total
      const expected = (totalTokens * BigInt(35)) / BigInt(100)
      expect(distribution.get('0x1111')).toBe(expected)
    })

    it('handles empty attributions', () => {
      const totalTokens = BigInt('1000000000000000000000')
      const distribution = calculateTokenDistribution(totalTokens, [])

      expect(distribution.size).toBe(0)
    })

    it('handles all stages with different agents', () => {
      const totalTokens = BigInt('1000000000000000000000')
      const attributions = [
        { stageName: 'RESEARCH' as const, agentAddress: '0x1' },
        { stageName: 'SCRIPT' as const, agentAddress: '0x2' },
        { stageName: 'VOICE' as const, agentAddress: '0x3' },
        { stageName: 'MUSIC' as const, agentAddress: '0x4' },
        { stageName: 'VISUAL' as const, agentAddress: '0x5' },
        { stageName: 'EDITOR' as const, agentAddress: '0x6' },
        { stageName: 'PUBLISH' as const, agentAddress: '0x7' },
      ]

      const distribution = calculateTokenDistribution(totalTokens, attributions)

      expect(distribution.size).toBe(7)

      // Sum should equal total (with possible rounding)
      let sum = BigInt(0)
      distribution.forEach(amount => {
        sum += amount
      })
      expect(sum).toBe(totalTokens)
    })
  })
})
