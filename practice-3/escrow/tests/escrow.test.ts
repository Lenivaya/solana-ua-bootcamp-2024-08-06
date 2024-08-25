import { randomBytes } from 'node:crypto'
import {
  AnchorProvider,
  BN,
  type Program,
  setProvider,
  Wallet,
  workspace
} from '@coral-xyz/anchor'
import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  type TOKEN_PROGRAM_ID
} from '@solana/spl-token'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import type { Escrow } from '../target/types/escrow'
import { before, describe, it } from 'node:test'
import {
  confirmTransaction,
  createAccountsMintsAndTokenAccounts,
  getCustomErrorMessage,
  makeKeypairs
} from '@solana-developers/helpers'
import * as assert from 'node:assert'
import { systemProgramErrors } from './system-programs-errors'

// Work on both Token Program and new Token Extensions Program
const TOKEN_PROGRAM: typeof TOKEN_2022_PROGRAM_ID | typeof TOKEN_PROGRAM_ID =
  TOKEN_2022_PROGRAM_ID

const getRandomBigNumber = (size = 8) => new BN(randomBytes(size))

describe('escrow', async () => {
  const provider = AnchorProvider.env()
  setProvider(provider)
  const connection = provider.connection

  const user = (provider.wallet as Wallet).payer
  const payer = user

  const program = workspace.Escrow as Program<Escrow>

  const accounts: Record<string, PublicKey> = {
    tokenProgram: TOKEN_PROGRAM
  }

  let [alice, bob, tokenMintA, tokenMintB] = makeKeypairs(4)

  const tokenAOfferedAmount = new BN(1_000_000)
  const tokenBWantedAmount = new BN(2_000_000)

  before(
    // 'Creates Alice and Bob accounts, 2 token mints, and associated token accounts for both tokens for both users',
    async () => {
      const usersMintsAndTokenAccounts =
        await createAccountsMintsAndTokenAccounts(
          [
            // Alice's token balances
            [
              // 1_000_000_000 of token A
              1_000_000_000,
              // 0 of token B
              0
            ],
            // Bob's token balances
            [
              // 0 of token A
              0,
              // 1_000_000_000 of token B
              1_000_000_000
            ]
          ],
          LAMPORTS_PER_SOL,
          connection,
          payer
        )

      // Alice will be the maker (creator) of the offer
      // Bob will be the taker (acceptor) of the offer
      const users = usersMintsAndTokenAccounts.users
      alice = users[0]
      bob = users[1]

      // tokenMintA represents the token Alice is offering
      // tokenMintB represents the token Alice wants in return
      const mints = usersMintsAndTokenAccounts.mints
      tokenMintA = mints[0]
      tokenMintB = mints[1]

      const tokenAccounts = usersMintsAndTokenAccounts.tokenAccounts

      // aliceTokenAccountA is Alice's account for tokenA (the token she's offering)
      // aliceTokenAccountB is Alice's account for tokenB (the token she wants)
      const aliceTokenAccountA = tokenAccounts[0][0]
      const aliceTokenAccountB = tokenAccounts[0][1]

      // bobTokenAccountA is Bob's account for tokenA (the token Alice is offering)
      // bobTokenAccountB is Bob's account for tokenB (the token Alice wants)
      const bobTokenAccountA = tokenAccounts[1][0]
      const bobTokenAccountB = tokenAccounts[1][1]

      // Save the accounts for later use
      accounts.maker = alice.publicKey
      accounts.taker = bob.publicKey
      accounts.tokenMintA = tokenMintA.publicKey
      accounts.makerTokenAccountA = aliceTokenAccountA
      accounts.takerTokenAccountA = bobTokenAccountA
      accounts.tokenMintB = tokenMintB.publicKey
      accounts.makerTokenAccountB = aliceTokenAccountB
      accounts.takerTokenAccountB = bobTokenAccountB
    }
  )

  it('Puts the tokens Alice offers into the vault when Alice makes an offer', async () => {
    const offerId = getRandomBigNumber()

    const [offer] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('offer'),
        accounts.maker.toBuffer(),
        offerId.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    )

    const vault = getAssociatedTokenAddressSync(
      accounts.tokenMintA,
      offer,
      true,
      TOKEN_PROGRAM
    )

    accounts.offer = offer
    accounts.vault = vault

    const transactionSignature = await program.methods
      .makeOffer(offerId, tokenAOfferedAmount, tokenBWantedAmount)
      .accounts({ ...accounts })
      .signers([alice])
      .rpc()

    await confirmTransaction(connection, transactionSignature)

    const vaultBalance = new BN(
      (await connection.getTokenAccountBalance(vault)).value.amount
    )
    assert.equal(vaultBalance.toString(), tokenAOfferedAmount.toString())

    const offerAccount = await program.account.offer.fetch(offer)
    assert.equal(offerAccount.maker.toString(), alice.publicKey.toString())
    assert.equal(
      offerAccount.tokenMintA.toString(),
      accounts.tokenMintA.toString()
    )
    assert.equal(
      offerAccount.tokenMintB.toString(),
      accounts.tokenMintB.toString()
    )
    assert.equal(
      offerAccount.tokenBWantedAmount.toString(),
      tokenBWantedAmount.toString()
    )
  })

  it("Puts the tokens from the vault into Bob's account, and gives Alice Bob's tokens, when Bob takes an offer", async () => {
    try {
      const transactionSignature = await program.methods
        .takeOffer()
        .accounts({ ...accounts })
        .signers([bob])
        .rpc()

      await confirmTransaction(connection, transactionSignature)

      // Check the offered tokens are now in Bob's account
      // (note: there is no before balance as Bob didn't have any offered tokens before the transaction)
      const bobTokenAccountBalanceAfterResponse =
        await connection.getTokenAccountBalance(accounts.takerTokenAccountA)
      const bobTokenAccountBalanceAfter = new BN(
        bobTokenAccountBalanceAfterResponse.value.amount
      )
      assert.equal(
        bobTokenAccountBalanceAfter.toString(),
        tokenAOfferedAmount.toString()
      )

      // Check the wanted tokens are now in Alice's account
      // (note: there is no before balance as Alice didn't have any wanted tokens before the transaction)
      const aliceTokenAccountBalanceAfterResponse =
        await connection.getTokenAccountBalance(accounts.makerTokenAccountB)
      const aliceTokenAccountBalanceAfter = new BN(
        aliceTokenAccountBalanceAfterResponse.value.amount
      )
      assert.equal(
        aliceTokenAccountBalanceAfter.toString(),
        tokenBWantedAmount.toString()
      )
    } catch (e) {
      const rawError = e as Error
      console.error(e)
      throw new Error(
        getCustomErrorMessage(systemProgramErrors, rawError.message) ?? ''
      )
    }
  })
})
