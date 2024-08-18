use anyhow::Result;
use clap::Args;
use mpl_token_metadata::accounts::Metadata;
use mpl_token_metadata::instructions::CreateV1Builder;
use mpl_token_metadata::types::TokenStandard;
use solana_client::rpc_client::RpcClient;
use solana_sdk::signer::Signer;

#[derive(Args)]
pub struct CreateTokenMetadataArgs {
    #[clap(long, default_value = "https://api.devnet.solana.com")]
    pub cluster: String,
    #[clap(long)]
    pub token_mint: String,
    #[clap(long, default_value = "Solana UA Bootcamp 2024-08-06 RUST")]
    pub name: String,
    #[clap(long, default_value = "SOLTEST")]
    pub symbol: String,
    #[clap(long, default_value = "https://arweave.net/1234")]
    pub uri: String,
}

pub fn execute(args: CreateTokenMetadataArgs) -> Result<()> {
    let client = RpcClient::new(args.cluster.clone());
    println!("Connected to {}", args.cluster);

    let sender = crate::commands::load_keypair()?;
    let token_mint = args.token_mint.parse()?;

    let sender_pubkey = sender.pubkey();
    let (metadata_pda, _) = Metadata::find_pda(&token_mint);

    let create_ix = CreateV1Builder::new()
        .metadata(metadata_pda)
        .mint(token_mint, false)
        .authority(sender_pubkey)
        .payer(sender_pubkey)
        .update_authority(sender_pubkey, false)
        .is_mutable(true)
        .name(args.name)
        .symbol(args.symbol)
        .uri(args.uri)
        .token_standard(TokenStandard::Fungible)
        .seller_fee_basis_points(0)
        .instruction();

    let recent_blockhash = client.get_latest_blockhash()?;
    let trx = solana_sdk::transaction::Transaction::new_signed_with_payer(
        &[create_ix],
        Some(&sender_pubkey),
        &[&sender],
        recent_blockhash,
    );

    let signature = client.send_and_confirm_transaction_with_spinner(&trx)?;
    println!(
        "✅ - Token metadata created, transaction signature: {}",
        signature
    );
    println!("🔑 - Token mint address: {}", token_mint);

    Ok(())
}
