import 'dotenv/config'
import { clusterApiUrl, Connection, Keypair } from '@solana/web3.js'
import chalk from 'chalk'
import {
  createMint,
  createMultisig,
  getOrCreateAssociatedTokenAccount,
  mintTo
} from '@solana/spl-token'
import { loadMainKeypair } from './lib/utilts'
import fs from 'fs/promises'
import { getExplorerLink } from '@solana-developers/helpers'

const MINOR_UNITS_PER_MAJOR_UNITS = Math.pow(10, 2)

async function main() {
  const connection = new Connection(clusterApiUrl('devnet'))
  console.log(chalk.yellow('Connected to devnet'))

  const payer = loadMainKeypair()

  const multisigKeypairs = Array.from({ length: 3 }, Keypair.generate)
  multisigKeypairs.forEach((keypair, index) =>
    console.log(
      chalk.green(`Keypair ${index + 1} created.\n`),
      chalk.yellow('Public key:'),
      chalk.blue(keypair.publicKey.toBase58())
    )
  )
  await fs.writeFile(
    './multisig-keypairs.json',
    JSON.stringify(multisigKeypairs.map((keypair) => keypair.secretKey))
  )

  const multisigKey = await createMultisig(
    connection,
    payer,
    multisigKeypairs.map((keypair) => keypair.publicKey),
    2
  )
  console.log(
    chalk.green('Multisig (2/3) created.\n'),
    chalk.yellow('🔑 Multisig address:'),
    chalk.blue(multisigKey.toBase58())
  )

  const tokenMint = await createMint(
    connection,
    payer,
    multisigKey,
    multisigKey,
    2
  )
  console.log(
    chalk.green('Token mint created.\n'),
    chalk.yellow('🔑 Token mint address:'),
    chalk.blue(tokenMint.toBase58())
  )

  const associatedTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    tokenMint,
    multisigKeypairs[0].publicKey
  )
  console.log(
    chalk.green('Associated token account created.\n'),
    chalk.yellow('🔑 Associated token account address:'),
    chalk.blue(associatedTokenAccount.address)
  )

  try {
    const mintToSignature = await mintTo(
      connection,
      payer,
      tokenMint,
      associatedTokenAccount.address,
      multisigKey,
      10 * MINOR_UNITS_PER_MAJOR_UNITS,
      multisigKeypairs
    )
    const mintToLink = getExplorerLink('transaction', mintToSignature, 'devnet')
    console.log(
      chalk.green('Tokens minted.\n'),
      chalk.yellow('🔗 Transaction:'),
      chalk.blue(mintToLink)
    )
  } catch (error) {
    console.error('Error minting tokens to associated token account:', error)
  }
}

main().then().catch(console.error)
