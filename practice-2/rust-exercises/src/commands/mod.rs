use anyhow::Context;
use anyhow::Result;
use dotenvy_macro::dotenv;
use solana_sdk::signature::Keypair;
use solana_sdk::signer::Signer;

pub mod create_token_account;
pub mod create_token_metadata;
pub mod create_token_mint;
pub mod mint_tokens;
pub mod send_sol;

fn load_keypair() -> Result<Keypair> {
    let secret_key_str = dotenv!("SECRET_KEY");
    let secret_key: Vec<u8> = serde_json::from_str(&secret_key_str)
        .context("Failed to parse SECRET_KEY from environment variable")?;

    let keypair =
        Keypair::from_bytes(&secret_key).context("Failed to load keypair from secret key")?;

    println!("Successfully loaded keypair.");
    println!("Public key: {}", keypair.pubkey());

    Ok(keypair)
}
