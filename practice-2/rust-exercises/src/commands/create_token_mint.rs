use anyhow::Result;
use clap::Args;
use solana_client::rpc_client::RpcClient;
use solana_sdk::signature::{Keypair, Signer};
use solana_sdk::transaction::Transaction;
use spl_token::solana_program::program_pack::Pack;
use spl_token::state::Mint;

#[derive(Args)]
pub struct CreateTokenMintArgs {
    #[clap(long, default_value = "https://api.devnet.solana.com")]
    pub cluster: String,
    #[clap(long, default_value = "2")]
    pub decimals: u8,
}

pub fn execute(args: CreateTokenMintArgs) -> Result<()> {
    let client = RpcClient::new(args.cluster.clone());
    println!("Connected to {}", args.cluster);

    let sender = crate::commands::load_keypair()?;
    let mint_account = Keypair::new();

    let sender_pubkey = sender.pubkey();
    let mint_account_pubkey = mint_account.pubkey();

    let minimum_balance_for_rent_exemption =
        client.get_minimum_balance_for_rent_exemption(Mint::LEN)?;

    let create_account_instruction = solana_sdk::system_instruction::create_account(
        &sender_pubkey,
        &mint_account_pubkey,
        minimum_balance_for_rent_exemption,
        Mint::LEN as u64,
        &spl_token::ID,
    );

    let initialize_mint_instruction = spl_token::instruction::initialize_mint(
        &spl_token::ID,
        &mint_account_pubkey,
        &sender_pubkey,
        None,
        args.decimals,
    )?;

    let recent_blockhash = client.get_latest_blockhash()?;

    let trx = Transaction::new_signed_with_payer(
        &[create_account_instruction, initialize_mint_instruction],
        Some(&sender_pubkey),
        &[&mint_account, &sender],
        recent_blockhash,
    );

    let signature = client.send_and_confirm_transaction_with_spinner(&trx)?;

    println!(
        "✅ - Token mint created, transaction signature: {}",
        signature
    );
    println!("🔑 - Token mint account: {}", mint_account_pubkey);

    Ok(())
}
