use anyhow::Result;
use clap::Args;
use solana_client::rpc_client::RpcClient;
use solana_sdk::signer::Signer;

#[derive(Args)]
pub struct MintTokensArgs {
    #[clap(long, default_value = "https://api.devnet.solana.com")]
    pub cluster: String,
    #[clap(long)]
    pub token_mint: String,
    #[clap(long)]
    pub recipient: String,
    #[clap(long)]
    pub amount: u64,
    #[clap(long, default_value = "2")]
    pub decimals: u8,
}

pub fn execute(args: MintTokensArgs) -> Result<()> {
    let client = RpcClient::new(args.cluster.clone());
    println!("Connected to {}", args.cluster);

    let sender = crate::commands::load_keypair()?;
    let mint_authority = &sender;

    let sender_pubkey = sender.pubkey();
    let mint_authority_pubkey = &sender_pubkey;
    let mint = args.token_mint.parse()?;
    let recipient = args.recipient.parse()?;

    let mint_to_instruction = spl_token::instruction::mint_to(
        &spl_token::ID,
        &mint,
        &recipient,
        &mint_authority_pubkey,
        &[&mint_authority_pubkey],
        args.amount * 10_u64.pow(args.decimals as u32),
    )?;

    let recent_blockhash = client.get_latest_blockhash()?;
    let trx = solana_sdk::transaction::Transaction::new_signed_with_payer(
        &[mint_to_instruction],
        Some(&sender_pubkey),
        &[&sender, &mint_authority],
        recent_blockhash,
    );

    let signature = client.send_and_confirm_transaction_with_spinner(&trx)?;
    println!("✅ - Tokens minted, transaction signature: {}", signature);
    println!("🔑 - Recipient: {}", args.recipient);

    Ok(())
}
