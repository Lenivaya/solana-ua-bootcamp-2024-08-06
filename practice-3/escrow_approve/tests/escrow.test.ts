import { randomBytes } from 'node:crypto'
import {
  AnchorError,
  AnchorProvider,
  BN,
  Program,
  setProvider,
  Wallet,
  workspace
} from '@coral-xyz/anchor'
import { TOKEN_2022_PROGRAM_ID, transfer } from '@solana/spl-token'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import type { Escrow } from '../target/types/escrow'
import { before, describe, it } from 'node:test'
import {
  airdropIfRequired,
  confirmTransaction,
  createAccountsMintsAndTokenAccounts,
  makeKeypairs
} from '@solana-developers/helpers'
import * as assert from 'node:assert'
import { expect } from 'chai'

const TOKEN_PROGRAM = TOKEN_2022_PROGRAM_ID
const getRandomBigNumber = (size = 8) => new BN(randomBytes(size))

describe('Escrow Vaultless Program', () => {
  const provider = AnchorProvider.env()
  setProvider(provider)
  const connection = provider.connection
  const runnerUser = (provider.wallet as Wallet).payer
  const program = workspace.Escrow as Program<Escrow>

  const tokenAOfferedAmount = new BN(400_000)
  const tokenBWantedAmount = new BN(300_000)
  const tokenAStartingAmount = new BN(1_000_000_000)

  const accounts: Record<string, PublicKey> = {
    tokenProgram: TOKEN_PROGRAM
  }

  let [alice, bob, tokenMintA, tokenMintB] = makeKeypairs(4),
    aliceTokenAccountA: PublicKey,
    aliceTokenAccountB: PublicKey,
    bobTokenAccountA: PublicKey,
    bobTokenAccountB: PublicKey

  before(async () => {
    await airdropIfRequired(
      connection,
      runnerUser.publicKey,
      0.5 * LAMPORTS_PER_SOL
    )

    const { users, mints, tokenAccounts } =
      await createAccountsMintsAndTokenAccounts(
        [
          [tokenAStartingAmount, 0], // Alice's balances: Token A and Token B
          [0, 1_000_000_000] // Bob's balances: Token A and Token B
        ],
        LAMPORTS_PER_SOL,
        connection,
        runnerUser
      )

    ;[alice, bob] = users
    ;[tokenMintA, tokenMintB] = mints
    ;[aliceTokenAccountA, aliceTokenAccountB] = tokenAccounts[0]
    ;[bobTokenAccountA, bobTokenAccountB] = tokenAccounts[1]

    Object.assign(accounts, {
      maker: alice.publicKey,
      taker: bob.publicKey,
      tokenMintA: tokenMintA.publicKey,
      makerTokenAccountA: aliceTokenAccountA,
      takerTokenAccountA: bobTokenAccountA,
      tokenMintB: tokenMintB.publicKey,
      makerTokenAccountB: aliceTokenAccountB,
      takerTokenAccountB: bobTokenAccountB
    })
  })

  const createOffer = async (offerId: BN) => {
    const [offer] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('offer'),
        accounts.maker.toBuffer(),
        offerId.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    )
    accounts.offer = offer

    const transactionSignature = await program.methods
      .makeOffer(offerId, tokenAOfferedAmount, tokenBWantedAmount)
      .accounts(accounts)
      .signers([alice])
      .rpc()
    await confirmTransaction(connection, transactionSignature)

    return offer
  }

  const validateOfferAccount = async (offer: PublicKey) => {
    const offerAccount = await program.account.offer.fetch(offer)
    assert.deepStrictEqual(
      offerAccount.maker.toString(),
      alice.publicKey.toString()
    )
    assert.deepStrictEqual(
      offerAccount.tokenMintA.toString(),
      accounts.tokenMintA.toString()
    )
    assert.deepStrictEqual(
      offerAccount.tokenMintB.toString(),
      accounts.tokenMintB.toString()
    )
    assert.deepStrictEqual(
      offerAccount.tokenBWantedAmount.toString(),
      tokenBWantedAmount.toString()
    )
  }

  it('creates an offer and approves spending of the specified token amount', async () => {
    const offerId = getRandomBigNumber()
    const offer = await createOffer(offerId)
    await validateOfferAccount(offer)
  })

  it('executes the offer, exchanging tokens between Alice and Bob', async () => {
    await program.methods
      .takeOffer()
      .accounts(accounts)
      .signers([bob])
      .rpc()
      .then(confirmTransaction.bind(null, connection))

    const bobTokenBalance = await connection.getTokenAccountBalance(
      accounts.takerTokenAccountA
    )
    const aliceTokenBalance = await connection.getTokenAccountBalance(
      accounts.makerTokenAccountB
    )

    assert.strictEqual(
      new BN(bobTokenBalance.value.amount).toString(),
      tokenAOfferedAmount.toString()
    )
    assert.strictEqual(
      new BN(aliceTokenBalance.value.amount).toString(),
      tokenBWantedAmount.toString()
    )
  })

  it('fails when creating an offer with more tokens than available', async () => {
    const bigTokenAmount = new BN(10_000_000_000)

    const offerId = getRandomBigNumber()
    const [offer] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('offer'),
        accounts.maker.toBuffer(),
        offerId.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    )
    accounts.offer = offer

    try {
      await program.methods
        .makeOffer(offerId, bigTokenAmount, tokenBWantedAmount)
        .accounts(accounts)
        .signers([alice])
        .rpc()
      assert.fail('Expected to throw InsufficientFunds error')
    } catch (e) {
      expect(e).to.be.instanceOf(AnchorError)
      expect((e as AnchorError).error.errorCode.code).to.equal(
        'InsufficientFunds'
      )
    }
  })

  it('fails if the offer maker loses tokens after approval', async () => {
    const offerId = getRandomBigNumber()
    const [offer] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('offer'),
        accounts.maker.toBuffer(),
        offerId.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    )
    accounts.offer = offer

    const tokenAAmount = tokenAStartingAmount.sub(tokenAOfferedAmount)
    const tokenAAmountApproved = tokenAAmount

    const transactionSignature = await program.methods
      .makeOffer(offerId, tokenAAmountApproved, tokenBWantedAmount)
      .accounts({ ...accounts })
      .signers([alice])
      .rpc()
    await confirmTransaction(connection, transactionSignature)

    const transferAmount = tokenAStartingAmount.div(new BN(3))
    await transfer(
      connection,
      alice,
      accounts.makerTokenAccountA,
      accounts.takerTokenAccountA,
      alice,
      transferAmount.toNumber(),
      [],
      null,
      TOKEN_PROGRAM
    )

    try {
      await program.methods.takeOffer().accounts(accounts).signers([bob]).rpc()
      assert.fail('Expected to throw MakerTokenAccountAmountLessThanOffered')
    } catch (e) {
      expect(e).to.be.instanceOf(AnchorError)
      expect((e as AnchorError).error.errorCode.code).to.equal(
        'MakerTokenAccountAmountLessThanOffered'
      )
    }
  })
})
