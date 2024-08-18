import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction
} from '@solana/web3.js'
import chalk from 'chalk'
import 'dotenv/config'
import { input } from '@inquirer/prompts'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const MEMO_PROGRAM = new PublicKey(
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
)

const args = yargs(hideBin(process.argv)).option('with_memo', {
  type: 'boolean',
  description: 'Send trx with memo',
  default: false
})

async function main() {
  const parsedArgs = await args.parse()

  const connection = new Connection(clusterApiUrl('devnet'))
  console.log(chalk.yellow('Connected to devnet'))

  const secretKey = Uint8Array.from(JSON.parse(process.env.SECRET_KEY!))
  const sender = Keypair.fromSecretKey(secretKey)

  console.log(
    chalk.green('Successfully loaded keypair from environment variables.\n'),
    chalk.yellow('🔑 Public key:'),
    chalk.blue(sender.publicKey.toBase58())
  )

  const recipient = await input({
    message: 'SOL recipient address: '
  })

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: sender.publicKey,
      toPubkey: new PublicKey(recipient),
      lamports: 0.01 * LAMPORTS_PER_SOL
    })
  )

  if (parsedArgs.with_memo) {
    const memoText = await input({
      message: 'Memo text: '
    })
    const addMemoInstruction = new TransactionInstruction({
      keys: [
        {
          pubkey: sender.publicKey,
          isSigner: true,
          isWritable: true
        }
      ],
      programId: MEMO_PROGRAM,
      data: Buffer.from(memoText, 'utf-8')
    })
    transaction.add(addMemoInstruction)
    console.log(chalk.yellow('📨 Memo added to transaction: ', memoText))
  }

  const signature = await sendAndConfirmTransaction(connection, transaction, [
    sender
  ])

  console.log(
    chalk.green('✅ Transaction confirmed'),
    chalk.yellow(`Signature: ${signature}`)
  )
}

main().then().catch(console.error)
