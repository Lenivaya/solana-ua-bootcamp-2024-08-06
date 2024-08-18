import { Keypair } from '@solana/web3.js'
import chalk from 'chalk'

export const loadKeypair = () => {
  const secretKey = Uint8Array.from(JSON.parse(process.env.SECRET_KEY!))
  const keypair = Keypair.fromSecretKey(secretKey)

  console.log(
    chalk.green('Successfully loaded keypair from environment variables.\n'),
    chalk.yellow('🔑 Public key:'),
    chalk.blue(keypair.publicKey.toBase58())
  )

  return keypair
}
