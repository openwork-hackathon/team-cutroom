/**
 * Token client for interacting with CUTROOM token on Mint Club V2
 * 
 * Uses the bonding curve for buying/selling tokens
 */

import { ethers, type Signer, type ContractTransactionResponse } from 'ethers'
import { MINT_CLUB_CONTRACTS, CUTROOM_TOKEN, OPENWORK_TOKEN } from './config'

// ERC20 ABI (subset)
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
]

// Mint Club Bond ABI (subset for trading)
const BOND_ABI = [
  'function buy(address token, uint256 tokensToMint, uint256 maxReserveAmount, address recipient) returns (uint256 reserveAmount)',
  'function sell(address token, uint256 tokensToSell, uint256 minReserveAmount, address recipient) returns (uint256 reserveAmount)',
  'function getBuyPriceAfterFee(address token, uint256 tokensToMint) view returns (uint256 reserveAmount)',
  'function getSellPriceAfterFee(address token, uint256 tokensToSell) view returns (uint256 reserveAmount)',
  'function getTokenInfo(address token) view returns (tuple(address creator, string name, string symbol, uint8 decimals, uint256 totalSupply, uint256 maxSupply))',
]

export interface TokenInfo {
  creator: string
  name: string
  symbol: string
  decimals: number
  totalSupply: bigint
  maxSupply: bigint
}

export interface PriceQuote {
  amountIn: bigint
  amountOut: bigint
  pricePerToken: bigint
  slippage: number
}

export class CutroomTokenClient {
  private provider: ethers.Provider
  private bond: ethers.Contract
  private cutroom: ethers.Contract
  private openwork: ethers.Contract

  constructor(provider: ethers.Provider) {
    this.provider = provider
    this.bond = new ethers.Contract(MINT_CLUB_CONTRACTS.base.bond, BOND_ABI, provider)
    this.cutroom = new ethers.Contract(CUTROOM_TOKEN.address, ERC20_ABI, provider)
    this.openwork = new ethers.Contract(OPENWORK_TOKEN.address, ERC20_ABI, provider)
  }

  /**
   * Get token info from the bonding curve
   */
  async getTokenInfo(): Promise<TokenInfo> {
    const info = await this.bond.getTokenInfo(CUTROOM_TOKEN.address)
    return {
      creator: info[0],
      name: info[1],
      symbol: info[2],
      decimals: info[3],
      totalSupply: info[4],
      maxSupply: info[5],
    }
  }

  /**
   * Get CUTROOM balance for an address
   */
  async getCutroomBalance(address: string): Promise<bigint> {
    return this.cutroom.balanceOf(address)
  }

  /**
   * Get OPENWORK balance for an address
   */
  async getOpenworkBalance(address: string): Promise<bigint> {
    return this.openwork.balanceOf(address)
  }

  /**
   * Get quote for buying CUTROOM tokens
   * @param tokensToMint Amount of CUTROOM to buy (in wei)
   * @returns Amount of OPENWORK needed
   */
  async getBuyQuote(tokensToMint: bigint): Promise<PriceQuote> {
    const reserveAmount = await this.bond.getBuyPriceAfterFee(CUTROOM_TOKEN.address, tokensToMint)
    const pricePerToken = (reserveAmount * BigInt(1e18)) / tokensToMint

    return {
      amountIn: reserveAmount,
      amountOut: tokensToMint,
      pricePerToken,
      slippage: 0.01, // 1% default slippage
    }
  }

  /**
   * Get quote for selling CUTROOM tokens
   * @param tokensToSell Amount of CUTROOM to sell (in wei)
   * @returns Amount of OPENWORK received
   */
  async getSellQuote(tokensToSell: bigint): Promise<PriceQuote> {
    const reserveAmount = await this.bond.getSellPriceAfterFee(CUTROOM_TOKEN.address, tokensToSell)
    const pricePerToken = (reserveAmount * BigInt(1e18)) / tokensToSell

    return {
      amountIn: tokensToSell,
      amountOut: reserveAmount,
      pricePerToken,
      slippage: 0.01,
    }
  }

  /**
   * Buy CUTROOM tokens with OPENWORK
   * @param signer Wallet signer
   * @param tokensToMint Amount of CUTROOM to buy
   * @param maxSlippage Maximum slippage (default 1%)
   */
  async buy(signer: Signer, tokensToMint: bigint, maxSlippage = 0.01): Promise<ethers.ContractTransactionReceipt | null> {
    const address = await signer.getAddress()
    
    // Get quote
    const quote = await this.getBuyQuote(tokensToMint)
    const maxReserve = quote.amountIn + (quote.amountIn * BigInt(Math.floor(maxSlippage * 10000))) / BigInt(10000)

    // Check OPENWORK balance
    const balance = await this.getOpenworkBalance(address)
    if (balance < maxReserve) {
      throw new Error(`Insufficient OPENWORK balance. Need ${ethers.formatEther(maxReserve)}, have ${ethers.formatEther(balance)}`)
    }

    // Check and set allowance
    const allowance = await this.openwork.allowance(address, MINT_CLUB_CONTRACTS.base.bond) as bigint
    if (allowance < maxReserve) {
      const openworkWithSigner = this.openwork.connect(signer) as ethers.Contract
      const approveTx: ContractTransactionResponse = await openworkWithSigner.getFunction('approve')(MINT_CLUB_CONTRACTS.base.bond, maxReserve)
      await approveTx.wait()
    }

    // Execute buy
    const bondWithSigner = this.bond.connect(signer) as ethers.Contract
    const tx: ContractTransactionResponse = await bondWithSigner.getFunction('buy')(CUTROOM_TOKEN.address, tokensToMint, maxReserve, address)
    return tx.wait()
  }

  /**
   * Sell CUTROOM tokens for OPENWORK
   * @param signer Wallet signer
   * @param tokensToSell Amount of CUTROOM to sell
   * @param maxSlippage Maximum slippage (default 1%)
   */
  async sell(signer: Signer, tokensToSell: bigint, maxSlippage = 0.01): Promise<ethers.ContractTransactionReceipt | null> {
    const address = await signer.getAddress()

    // Get quote
    const quote = await this.getSellQuote(tokensToSell)
    const minReserve = quote.amountOut - (quote.amountOut * BigInt(Math.floor(maxSlippage * 10000))) / BigInt(10000)

    // Check CUTROOM balance
    const balance = await this.getCutroomBalance(address)
    if (balance < tokensToSell) {
      throw new Error(`Insufficient CUTROOM balance. Need ${ethers.formatEther(tokensToSell)}, have ${ethers.formatEther(balance)}`)
    }

    // Check and set allowance
    const allowance = await this.cutroom.allowance(address, MINT_CLUB_CONTRACTS.base.bond) as bigint
    if (allowance < tokensToSell) {
      const cutroomWithSigner = this.cutroom.connect(signer) as ethers.Contract
      const approveTx: ContractTransactionResponse = await cutroomWithSigner.getFunction('approve')(MINT_CLUB_CONTRACTS.base.bond, tokensToSell)
      await approveTx.wait()
    }

    // Execute sell
    const bondWithSigner = this.bond.connect(signer) as ethers.Contract
    const tx: ContractTransactionResponse = await bondWithSigner.getFunction('sell')(CUTROOM_TOKEN.address, tokensToSell, minReserve, address)
    return tx.wait()
  }

  /**
   * Transfer CUTROOM tokens to another address
   * @param signer Wallet signer
   * @param to Recipient address
   * @param amount Amount to transfer
   */
  async transfer(signer: Signer, to: string, amount: bigint): Promise<ethers.ContractTransactionReceipt | null> {
    const address = await signer.getAddress()

    // Check balance
    const balance = await this.getCutroomBalance(address)
    if (balance < amount) {
      throw new Error(`Insufficient CUTROOM balance. Need ${ethers.formatEther(amount)}, have ${ethers.formatEther(balance)}`)
    }

    const cutroomWithSigner = this.cutroom.connect(signer) as ethers.Contract
    const tx: ContractTransactionResponse = await cutroomWithSigner.getFunction('transfer')(to, amount)
    return tx.wait()
  }
}

/**
 * Create a token client connected to Base mainnet
 */
export function createCutroomClient(rpcUrl = 'https://mainnet.base.org'): CutroomTokenClient {
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  return new CutroomTokenClient(provider)
}
