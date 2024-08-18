import { clusterApiUrl, Connection } from '@solana/web3.js'
import chalk from 'chalk'
import 'dotenv/config'
import { createMint } from '@solana/spl-token'
import { getExplorerLink } from '@solana-developers/helpers'
import { loadKeypair } from './lib/utilts'

async function main() {
  const connection = new Connection(clusterApiUrl('devnet'))
  console.log(chalk.yellow('Connected to devnet'))

  const sender = loadKeypair()

  const tokenMint = await createMint(
    connection,
    sender,
    sender.publicKey,
    null,
    2
  )

  const tokenMintLink = getExplorerLink(
    'address',
    tokenMint.toString(),
    'devnet'
  )

  console.log(
    chalk.green('Token mint created.\n'),
    chalk.yellow('🔑 Token mint link:'),
    chalk.blue(tokenMintLink)
  )
}

main().then().catch(console.error)
