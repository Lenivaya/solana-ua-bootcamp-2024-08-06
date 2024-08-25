import {
  AnchorProvider,
  BN,
  getProvider,
  Program,
  setProvider,
  web3,
  workspace
} from '@coral-xyz/anchor'
import { Favorites } from '../target/types/favorites'
import {
  airdropIfRequired,
  getCustomErrorMessage
} from '@solana-developers/helpers'
import * as console from 'node:console'
import { systemProgramErrors } from './system-programs-errors'
import * as assert from 'node:assert'
import { describe, it } from 'node:test'

describe('favorites', async () => {
  setProvider(AnchorProvider.env())

  const program = workspace.Favorites as Program<Favorites>

  const user = web3.Keypair.generate()
  console.log('User address', user.publicKey.toBase58())
  await airdropIfRequired(
    getProvider().connection,
    user.publicKey,
    0.5 * web3.LAMPORTS_PER_SOL,
    1 * web3.LAMPORTS_PER_SOL
  )

  it('should write out favorites to the blockchain', async () => {
    const favoriteNumber = new BN(10)
    const favoriteColor = 'blue'

    let tx: string | null = null
    try {
      tx = await program.methods
        .setFavorites(favoriteNumber, favoriteColor)
        .accounts({
          user: user.publicKey
        })
        .signers([user])
        .rpc()
    } catch (e) {
      const rawError = e as Error
      throw new Error(
        getCustomErrorMessage(systemProgramErrors, rawError.message) ?? ''
      )
    }

    console.log('Your transaction signature', tx)

    const [favoritePDA, _favoritesBump] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from('favorites'), user.publicKey.toBuffer()],
      program.programId
    )
    const dataFromPda = await program.account.favorites.fetch(favoritePDA)

    assert.equal(dataFromPda.color, favoriteColor)
    assert.equal(dataFromPda.number.toString(), favoriteNumber.toString())
  })
})
