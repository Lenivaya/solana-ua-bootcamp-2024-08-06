import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js'
import chalk from 'chalk'
import 'dotenv/config'
import { getOrCreateAssociatedTokenAccount } from '@solana/spl-token'
import { input } from '@inquirer/prompts'
import { getExplorerLink } from '@solana-developers/helpers'
import { loadKeypair } from './lib/utilts'

async function main() {
  const connection = new Connection(clusterApiUrl('devnet'))
  console.log(chalk.yellow('Connected to devnet'))

  const sender = loadKeypair()

  const tokenMintAddress = await input({
    message: 'Token mint address: '
  })

  const tokenMint = new PublicKey(tokenMintAddress)

  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    sender,
    tokenMint,
    sender.publicKey
  )

  const tokenAccountLink = getExplorerLink(
    'address',
    tokenAccount.address.toString(),
    'devnet'
  )

  console.log(
    chalk.green('Token account created.\n'),
    chalk.yellow('🔑 Token account address:'),
    chalk.blue(tokenAccountLink)
  )
}

main().then().catch(console.error)
