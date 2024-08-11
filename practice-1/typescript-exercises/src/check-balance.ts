import { airdropIfRequired } from '@solana-developers/helpers'
import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey
} from '@solana/web3.js'
import chalk from 'chalk'
import 'dotenv/config'

const connection = new Connection(clusterApiUrl('devnet'))
console.log(chalk.yellow('Connected to devnet'))

async function main() {
  const publicKey = new PublicKey(process.env.PUBLIC_KEY!)

  console.log(chalk.yellow('Public key:'), chalk.blue(publicKey))

  const balanceInLamports = await connection.getBalance(publicKey)
  const balanceInSol = balanceInLamports / LAMPORTS_PER_SOL

  console.log(
    chalk.yellow('Balance:'),
    chalk.green(balanceInLamports),
    chalk.yellow('lamports'),
    `(${balanceInSol} SOL)`
  )

  console.log('\n\n', chalk.blue('Topping up balance...'), '\n\n')
  await airdropIfRequired(
    connection,
    publicKey,
    1 * LAMPORTS_PER_SOL,
    0.5 * LAMPORTS_PER_SOL
  )

  const newBalance = await connection.getBalance(publicKey)
  const newBalanceInSol = newBalance / LAMPORTS_PER_SOL
  console.log(
    chalk.yellow('New balance:'),
    chalk.green(newBalance),
    chalk.yellow('lamports'),
    `(${newBalanceInSol} SOL)`
  )
}

main().then().catch(console.error)
