/**
 * Deploy $CUTROOM token on Mint Club V2 (Base)
 * 
 * Usage: 
 *   PRIVATE_KEY=0x... node scripts/deploy-token.mjs
 * 
 * Requires ETH on Base for gas (~$0.01)
 * Requires OPENWORK token approval for reserve
 */

import { ethers } from "ethers"

// Base mainnet
const RPC = "https://mainnet.base.org"
const CHAIN_ID = 8453

// Mint Club V2 contracts on Base
const MCV2_BOND = "0xc5a076cad94176c2996B32d8466Be1cE757FAa27"
const OPENWORK_TOKEN = "0x299c30DD5974BF4D5bFE42C340CA40462816AB07"

// Bond contract ABI (minimal - just what we need)
const BOND_ABI = [
  "function createToken((string name, string symbol) tokenParams, (uint16 mintRoyalty, uint16 burnRoyalty, address reserveToken, uint128 maxSupply, uint128[] stepRanges, uint128[] stepPrices) bondParams) external payable returns (address)",
  "function creationFee() external view returns (uint256)",
  "function tokenBond(address token) external view returns (uint16 mintRoyalty, uint16 burnRoyalty, address creator, uint40 createdAt, address reserveToken, uint128 reserveBalance, uint128 currentSupply, uint128 maxSupply)"
]

async function main() {
  const privateKey = process.env.PRIVATE_KEY
  if (!privateKey) {
    console.error("❌ Set PRIVATE_KEY environment variable")
    console.error("   PRIVATE_KEY=0x... node scripts/deploy-token.mjs")
    process.exit(1)
  }

  const provider = new ethers.JsonRpcProvider(RPC)
  const wallet = new ethers.Wallet(privateKey, provider)
  
  console.log(`\n🎬 Deploying $CUTROOM Token on Base`)
  console.log(`   Deployer: ${wallet.address}`)
  
  // Check ETH balance
  const balance = await provider.getBalance(wallet.address)
  console.log(`   ETH Balance: ${ethers.formatEther(balance)} ETH`)
  
  if (balance < ethers.parseEther("0.0005")) {
    console.error("❌ Need at least 0.0005 ETH for gas")
    process.exit(1)
  }

  const bond = new ethers.Contract(MCV2_BOND, BOND_ABI, wallet)

  // Check creation fee
  const creationFee = await bond.creationFee()
  console.log(`   Creation Fee: ${ethers.formatEther(creationFee)} ETH`)

  // Token params
  const tokenParams = {
    name: "Cutroom",
    symbol: "CUTROOM"
  }

  // Bonding curve: 3-step curve backed by $OPENWORK
  // Max supply: 10M tokens
  // Prices increase as supply grows
  const bondParams = {
    mintRoyalty: 100,      // 1% mint fee
    burnRoyalty: 100,      // 1% burn fee  
    reserveToken: OPENWORK_TOKEN,
    maxSupply: ethers.parseEther("10000000"),  // 10M
    stepRanges: [
      ethers.parseEther("1000000"),   // 0-1M tokens
      ethers.parseEther("5000000"),   // 1M-5M tokens
      ethers.parseEther("10000000"),  // 5M-10M tokens
    ],
    stepPrices: [
      ethers.parseEther("0.001"),     // 0.001 OPENWORK per token
      ethers.parseEther("0.005"),     // 0.005 OPENWORK per token  
      ethers.parseEther("0.01"),      // 0.01 OPENWORK per token
    ]
  }

  console.log(`\n   Token: ${tokenParams.name} ($${tokenParams.symbol})`)
  console.log(`   Max Supply: 10,000,000`)
  console.log(`   Reserve: $OPENWORK`)
  console.log(`   Curve: 0.001 → 0.005 → 0.01 OPENWORK/token`)
  console.log(`   Royalties: 1% mint / 1% burn`)

  console.log(`\n⏳ Sending createToken transaction...`)
  
  try {
    const tx = await bond.createToken(
      [tokenParams.name, tokenParams.symbol],
      [
        bondParams.mintRoyalty,
        bondParams.burnRoyalty,
        bondParams.reserveToken,
        bondParams.maxSupply,
        bondParams.stepRanges,
        bondParams.stepPrices,
      ],
      { value: creationFee }
    )

    console.log(`   TX Hash: ${tx.hash}`)
    console.log(`   Waiting for confirmation...`)

    const receipt = await tx.wait()
    console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`)
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`)

    // Try to find the token address from logs
    // The Transfer event from address(0) indicates the new token
    for (const log of receipt.logs) {
      if (log.topics[0] === ethers.id("Transfer(address,address,uint256)")) {
        if (log.topics[1] === ethers.zeroPadValue("0x00", 32)) {
          console.log(`\n🎬 $CUTROOM Token Address: ${log.address}`)
          console.log(`   Mint Club: https://mint.club/token/base/CUTROOM`)
          console.log(`   BaseScan: https://basescan.org/token/${log.address}`)
          break
        }
      }
    }

    console.log(`\n📋 Next steps:`)
    console.log(`   1. Register token URL on Openwork:`)
    console.log(`      curl -X PATCH https://www.openwork.bot/api/hackathon/e35dec01-34f1-42a1-803f-16eb742a4e5c \\`)
    console.log(`        -H "Authorization: Bearer YOUR_API_KEY" \\`)
    console.log(`        -H "Content-Type: application/json" \\`)
    console.log(`        -d '{"token_url": "https://mint.club/token/base/CUTROOM"}'`)

  } catch (error) {
    console.error(`\n❌ Transaction failed:`, error.message)
    if (error.data) console.error(`   Data:`, error.data)
    process.exit(1)
  }
}

main().catch(console.error)
