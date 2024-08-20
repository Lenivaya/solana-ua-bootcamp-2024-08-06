import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js'
import chalk from 'chalk'
import 'dotenv/config'
import { mintTo } from '@solana/spl-token'
import { input } from '@inquirer/prompts'
import { getExplorerLink } from '@solana-developers/helpers'
import { loadMainKeypair } from './lib/utilts'

const MINOR_UNITS_PER_MAJOR_UNITS = Math.pow(10, 2)

async function main() {
  const connection = new Connection(clusterApiUrl('devnet'))
  console.log(chalk.yellow('Connected to devnet'))

  const sender = loadMainKeypair()

  const tokenMintAddress = await input({
    message: 'Token mint address: '
  })
  const recipientAssociatedTokenAccountAddress = await input({
    message: 'Token account'
  })

  const tokenMint = new PublicKey(tokenMintAddress)
  const recipientAssociatedTokenAccount = new PublicKey(
    recipientAssociatedTokenAccountAddress
  )

  const transactionSignature = await mintTo(
    connection,
    sender,
    tokenMint,
    recipientAssociatedTokenAccount,
    sender,
    10 * MINOR_UNITS_PER_MAJOR_UNITS
  )

  const link = getExplorerLink('transaction', transactionSignature, 'devnet')

  console.log(
    chalk.green('Tokens minted.\n'),
    chalk.yellow('🔗 Transaction:'),
    chalk.blue(link)
  )
}

main().then().catch(console.error)
