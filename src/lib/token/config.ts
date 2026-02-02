/**
 * Token configuration for Cutroom
 * 
 * $CUTROOM is a bonding curve token on Mint Club V2 (Base)
 * Reserve token is $OPENWORK
 */

export const MINT_CLUB_CONTRACTS = {
  base: {
    bond: '0xc5a076cad94176c2996B32d8466Be1cE757FAa27',
    token: '0xAa70bC79fD1cB4a6FBA717018351F0C3c64B79Df',
    zap: '0x1Bf3183acc57571BecAea0E238d6C3A4d00633da',
  },
} as const

export const OPENWORK_TOKEN = {
  address: '0x299c30DD5974BF4D5bFE42C340CA40462816AB07',
  symbol: 'OPENWORK',
  decimals: 18,
  chain: 'base',
} as const

// CUTROOM token address will be set after deployment
// Run: npm run deploy:token
export const CUTROOM_TOKEN = {
  // TODO: Set after deployment
  address: process.env.NEXT_PUBLIC_CUTROOM_TOKEN_ADDRESS || '',
  symbol: 'CUTROOM',
  decimals: 18,
  chain: 'base',
  reserveToken: OPENWORK_TOKEN.address,
} as const

/**
 * Bonding curve parameters for CUTROOM token
 * 
 * Step-based pricing:
 * - First 1M tokens: 0.001 OPENWORK each
 * - Next 4M tokens: 0.005 OPENWORK each
 * - Final 5M tokens: 0.01 OPENWORK each
 * 
 * Max supply: 10 million CUTROOM
 * Royalties: 1% mint, 1% burn → treasury
 */
export const CUTROOM_BOND_PARAMS = {
  name: 'Cutroom',
  symbol: 'CUTROOM',
  maxSupply: BigInt('10000000000000000000000000'), // 10M tokens
  mintRoyalty: 100, // 1% (basis points)
  burnRoyalty: 100, // 1%
  stepRanges: [
    BigInt('1000000000000000000000000'),  // 1M tokens
    BigInt('5000000000000000000000000'),  // 5M tokens
    BigInt('10000000000000000000000000'), // 10M tokens
  ],
  stepPrices: [
    BigInt('1000000000000000'),     // 0.001 OPENWORK
    BigInt('5000000000000000'),     // 0.005 OPENWORK
    BigInt('10000000000000000'),    // 0.01 OPENWORK
  ],
} as const

/**
 * Stage attribution weights for token distribution
 * Total: 100%
 */
export const STAGE_TOKEN_WEIGHTS = {
  RESEARCH: 10,
  SCRIPT: 25,
  VOICE: 20,
  MUSIC: 10,
  VISUAL: 15,
  EDITOR: 15,
  PUBLISH: 5,
} as const

/**
 * Calculate token distribution for a completed pipeline
 * @param totalTokens Total tokens to distribute
 * @param attributions Array of { stageName, agentAddress } 
 */
export function calculateTokenDistribution(
  totalTokens: bigint,
  attributions: { stageName: keyof typeof STAGE_TOKEN_WEIGHTS; agentAddress: string }[]
): Map<string, bigint> {
  const distribution = new Map<string, bigint>()
  
  for (const { stageName, agentAddress } of attributions) {
    const weight = STAGE_TOKEN_WEIGHTS[stageName]
    const amount = (totalTokens * BigInt(weight)) / BigInt(100)
    
    const existing = distribution.get(agentAddress) ?? BigInt(0)
    distribution.set(agentAddress, existing + amount)
  }
  
  return distribution
}
