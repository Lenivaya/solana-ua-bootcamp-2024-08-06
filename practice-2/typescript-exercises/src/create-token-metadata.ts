import {
  clusterApiUrl,
  Connection,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction
} from '@solana/web3.js'
import chalk from 'chalk'
import 'dotenv/config'
import { input } from '@inquirer/prompts'
import { getExplorerLink } from '@solana-developers/helpers'
import { loadMainKeypair } from './lib/utilts'
import { createCreateMetadataAccountV3Instruction } from '@metaplex-foundation/mpl-token-metadata'

const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
)

async function main() {
  const connection = new Connection(clusterApiUrl('devnet'))
  console.log(chalk.yellow('Connected to devnet'))

  const sender = loadMainKeypair()

  const tokenMintAddress = await input({
    message: 'Token mint address: '
  })

  const tokenMintAccount = new PublicKey(tokenMintAddress)

  const metadataData = {
    name: 'Solana UA Bootcamp 2024-08-06',
    symbol: 'SOLTEST',
    uri: 'https://arweave.net/1234',
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,
    uses: null
  }

  const [metadataPDA, _metadataBump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      tokenMintAccount.toBuffer()
    ],
    TOKEN_METADATA_PROGRAM_ID
  )

  const transaction = new Transaction()
  const createMetadataAccountInstruction =
    createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataPDA,
        mint: tokenMintAccount,
        mintAuthority: sender.publicKey,
        payer: sender.publicKey,
        updateAuthority: sender.publicKey
      },
      {
        createMetadataAccountArgsV3: {
          collectionDetails: null,
          data: metadataData,
          isMutable: true
        }
      }
    )
  transaction.add(createMetadataAccountInstruction)

  await sendAndConfirmTransaction(connection, transaction, [sender])

  const tokenMintLink = getExplorerLink(
    'address',
    tokenMintAccount.toString(),
    'devnet'
  )

  console.log(
    chalk.green('Token metadata account created.\n'),
    chalk.yellow('🔗 Token mint:'),
    chalk.blue(tokenMintLink)
  )
}

main().then().catch(console.error)
