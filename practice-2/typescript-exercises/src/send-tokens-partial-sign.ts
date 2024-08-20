import 'dotenv/config'
import {
  clusterApiUrl,
  Connection,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction
} from '@solana/web3.js'
import chalk from 'chalk'
import { loadKeypairFromEnv, loadMainKeypair } from './lib/utilts'
import { getExplorerLink } from '@solana-developers/helpers'
import { input } from '@inquirer/prompts'
import {
  createTransferInstruction,
  getOrCreateAssociatedTokenAccount
} from '@solana/spl-token'

async function main() {
  const connection = new Connection(clusterApiUrl('devnet'))
  console.log(chalk.yellow('Connected to devnet'))

  const sender = loadMainKeypair()
  const receiver = loadKeypairFromEnv('RECEIVER_SECRET_KEY')

  const mintPublicKey = new PublicKey(
    await input({
      message: 'Mint public key: '
    })
  )

  const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    sender,
    mintPublicKey,
    sender.publicKey
  )
  const receiverTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    sender,
    mintPublicKey,
    receiver.publicKey
  )

  console.log(
    chalk.green('Token accounts created.\n'),
    chalk.yellow('Sender token account balance:'),
    chalk.blue(senderTokenAccount.amount),
    chalk.yellow('Receiver token account balance:'),
    chalk.blue(receiverTokenAccount.amount)
  )

  const amount = Number(
    await input({
      message: 'Amount to send: '
    })
  )

  const transferInstruction = createTransferInstruction(
    senderTokenAccount.address,
    receiverTokenAccount.address,
    sender.publicKey,
    amount
  )

  const transaction = new Transaction().add(transferInstruction)

  const { blockhash } = await connection.getLatestBlockhash()
  transaction.recentBlockhash = blockhash
  transaction.feePayer = receiver.publicKey

  // Sign transaction with sender's keypair
  transaction.partialSign(sender)

  // Sign transaction with receiver's keypair
  transaction.partialSign(receiver)

  const signature = await sendAndConfirmTransaction(connection, transaction, [
    sender,
    receiver
  ])
  console.log(
    chalk.green('Tokens sent.\n'),
    chalk.yellow('🔗 Transaction:'),
    chalk.blue(getExplorerLink('transaction', signature, 'devnet'))
  )
}

main().then().catch(console.error)
