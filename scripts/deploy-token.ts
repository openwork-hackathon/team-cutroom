#!/usr/bin/env npx tsx

/**
 * Deploy $CUTROOM token on Mint Club V2 (Base)
 * 
 * Prerequisites:
 * - BASE_RPC_URL (or uses public endpoint)
 * - DEPLOYER_PRIVATE_KEY (wallet with ETH for gas)
 * 
 * Usage:
 *   BASE_RPC_URL=... DEPLOYER_PRIVATE_KEY=0x... npx tsx scripts/deploy-token.ts
 */

import { ethers } from 'ethers'
import { MINT_CLUB_CONTRACTS, CUTROOM_BOND_PARAMS, OPENWORK_TOKEN } from '../src/lib/token/config'

// Mint Club Bond ABI (subset needed for createToken)
const BOND_ABI = [
  `function createToken(
    (string name, string symbol) tokenParams,
    (
      address reserveToken,
      uint16 reserveRatio,
      uint256 maxSupply,
      uint256 initialSupply,
      uint40 mintRoyalty,
      uint40 burnRoyalty,
      address royaltyAddress,
      uint256[] stepRanges,
      uint256[] stepPrices
    ) bondParams
  ) external returns (address token)`,
  'event TokenCreated(address indexed token, string name, string symbol, address indexed creator)',
]

async function main() {
  // Config
  const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org'
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY
  
  if (!privateKey) {
    console.error('❌ DEPLOYER_PRIVATE_KEY is required')
    console.error('   Set it as an environment variable')
    process.exit(1)
  }

  console.log('🚀 Deploying $CUTROOM token on Base...\n')

  // Connect
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const wallet = new ethers.Wallet(privateKey, provider)
  
  console.log(`📍 Deployer: ${wallet.address}`)
  
  // Check balance
  const balance = await provider.getBalance(wallet.address)
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`)
  
  if (balance === BigInt(0)) {
    console.error('❌ Wallet has no ETH for gas')
    process.exit(1)
  }

  // Connect to Bond contract
  const bond = new ethers.Contract(
    MINT_CLUB_CONTRACTS.base.bond,
    BOND_ABI,
    wallet
  )

  // Prepare params
  const tokenParams = {
    name: CUTROOM_BOND_PARAMS.name,
    symbol: CUTROOM_BOND_PARAMS.symbol,
  }

  const bondParams = {
    reserveToken: OPENWORK_TOKEN.address,
    reserveRatio: 0, // Using step prices
    maxSupply: CUTROOM_BOND_PARAMS.maxSupply,
    initialSupply: BigInt(0),
    mintRoyalty: CUTROOM_BOND_PARAMS.mintRoyalty,
    burnRoyalty: CUTROOM_BOND_PARAMS.burnRoyalty,
    royaltyAddress: wallet.address, // Treasury = deployer
    stepRanges: CUTROOM_BOND_PARAMS.stepRanges,
    stepPrices: CUTROOM_BOND_PARAMS.stepPrices,
  }

  console.log('\n📋 Token Parameters:')
  console.log(`   Name: ${tokenParams.name}`)
  console.log(`   Symbol: ${tokenParams.symbol}`)
  console.log(`   Max Supply: ${ethers.formatEther(bondParams.maxSupply)} CUTROOM`)
  console.log(`   Reserve Token: ${bondParams.reserveToken} (OPENWORK)`)
  console.log(`   Royalties: ${bondParams.mintRoyalty / 100}% mint, ${bondParams.burnRoyalty / 100}% burn`)
  console.log(`   Treasury: ${bondParams.royaltyAddress}`)
  
  console.log('\n📈 Bonding Curve:')
  for (let i = 0; i < bondParams.stepRanges.length; i++) {
    const range = ethers.formatEther(bondParams.stepRanges[i])
    const price = ethers.formatEther(bondParams.stepPrices[i])
    console.log(`   Up to ${range} CUTROOM: ${price} OPENWORK each`)
  }

  // Deploy
  console.log('\n⏳ Sending transaction...')
  
  try {
    const tx = await bond.createToken(tokenParams, bondParams)
    console.log(`   TX Hash: ${tx.hash}`)
    
    console.log('\n⏳ Waiting for confirmation...')
    const receipt = await tx.wait()
    
    // Find TokenCreated event
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = bond.interface.parseLog(log)
        return parsed?.name === 'TokenCreated'
      } catch {
        return false
      }
    })

    let tokenAddress: string
    if (event) {
      const parsed = bond.interface.parseLog(event)
      tokenAddress = parsed?.args[0]
    } else {
      // Fallback: get from first log
      tokenAddress = receipt.logs[0]?.address || 'UNKNOWN'
    }

    console.log('\n✅ Token deployed successfully!')
    console.log(`   Token Address: ${tokenAddress}`)
    console.log(`   Mint Club URL: https://mint.club/token/base/${tokenAddress}`)
    
    console.log('\n📝 Next steps:')
    console.log(`   1. Add to .env: NEXT_PUBLIC_CUTROOM_TOKEN_ADDRESS=${tokenAddress}`)
    console.log(`   2. Update src/lib/token/config.ts with the address`)
    console.log(`   3. Verify on Mint Club dashboard`)
    
  } catch (error: any) {
    console.error('\n❌ Deployment failed:')
    console.error(error.message || error)
    process.exit(1)
  }
}

main()
