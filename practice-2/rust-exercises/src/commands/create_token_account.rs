use anyhow::Result;
use clap::Args;
use solana_client::rpc_client::RpcClient;
use solana_sdk::signature::Signer;
use spl_associated_token_account::instruction::create_associated_token_account;

#[derive(Args)]
pub struct CreateTokenAccountArgs {
    #[clap(long, default_value = "https://api.devnet.solana.com")]
    pub cluster: String,
    #[clap(long)]
    pub token_mint: String,
}

pub fn execute(args: CreateTokenAccountArgs) -> Result<()> {
    let client = RpcClient::new(args.cluster.clone());
    println!("Connected to {}", args.cluster);

    let sender = crate::commands::load_keypair()?;
    let token_mint = args.token_mint.parse()?;

    let sender_pubkey = sender.pubkey();

    let associated_token =
        spl_associated_token_account::get_associated_token_address(&sender_pubkey, &token_mint);

    match client.get_account(&associated_token) {
        Ok(_account) => {
            println!("❌ - Token account already exists");
            println!("🔑 - Token account address: {}", associated_token);
        }
        Err(_) => {
            println!("🚀 - Creating token account");
            let create_token_account_instruction = create_associated_token_account(
                &sender_pubkey,
                &sender_pubkey,
                &token_mint,
                &spl_token::ID,
            );

            let recent_blockhash = client.get_latest_blockhash()?;

            let trx = solana_sdk::transaction::Transaction::new_signed_with_payer(
                &[create_token_account_instruction],
                Some(&sender_pubkey),
                &[&sender],
                recent_blockhash,
            );

            let signature = client.send_and_confirm_transaction_with_spinner(&trx)?;

            println!(
                "✅ - Token account created, transaction signature: {}",
                signature
            );
            println!("🔑 - Token account address: {}", associated_token);
        }
    }

    Ok(())
}
