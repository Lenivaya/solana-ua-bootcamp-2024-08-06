use anyhow::{Context, Result};
use solana_client::rpc_client::RpcClient;
use solana_sdk::commitment_config::CommitmentConfig;
use solana_sdk::native_token::{lamports_to_sol, sol_to_lamports};
use solana_sdk::signature::{Keypair, Signer};
use std::fs;

#[derive(Debug)]
pub enum SolanaCluster {
    Mainnet,
    Devnet,
    Testnet,
}

impl SolanaCluster {
    pub fn url(&self) -> &str {
        match self {
            SolanaCluster::Mainnet => "https://api.mainnet-beta.solana.com",
            SolanaCluster::Devnet => "https://api.devnet.solana.com",
            SolanaCluster::Testnet => "https://api.testnet.solana.com",
        }
    }
}

pub fn load_rpc_client(cluster: SolanaCluster) -> RpcClient {
    RpcClient::new(cluster.url().to_string())
}

pub fn generate_keypair() -> Result<()> {
    let wallet = Keypair::new();
    let public_key = wallet.pubkey();
    let secret_key = wallet.to_bytes();

    println!("Public key: {}", public_key);
    println!("Private key: {:?}", secret_key);

    let env_content = format!(
        "SECRET_KEY=\"{:?}\"\nPUBLIC_KEY=\"{}\"",
        secret_key, public_key
    );

    fs::write(".env", env_content).context("Failed to write .env file")?;

    println!(".env file has been written with the secret and public keys.");
    Ok(())
}

pub fn load_keypair() -> Result<Keypair> {
    let secret_key_str =
        std::env::var("SECRET_KEY").context("SECRET_KEY environment variable not found")?;
    let secret_key: Vec<u8> = serde_json::from_str(&secret_key_str)
        .context("Failed to parse SECRET_KEY from environment variable")?;

    let keypair =
        Keypair::from_bytes(&secret_key).context("Failed to load keypair from secret key")?;

    Ok(keypair)
}

pub fn print_balance(rpc_client: &RpcClient, wallet: &Keypair) -> Result<u64> {
    let public_key = wallet.pubkey();

    let balance = rpc_client
        .get_balance(&public_key)
        .context("Failed to get balance")?;
    let balance_in_sol = lamports_to_sol(balance);

    println!("Public key: {}", public_key);
    println!("Balance: {} lamports ({} SOL)", balance, balance_in_sol);

    Ok(balance)
}

pub fn check_balance(rpc_client: &RpcClient) -> Result<()> {
    let wallet = load_keypair()?;
    println!("Connected to {}", rpc_client.url());

    let balance = print_balance(&rpc_client, &wallet)?;
    if balance < sol_to_lamports(1.0) {
        request_airdrop(&rpc_client, &wallet)?;
    }

    Ok(())
}

pub fn request_airdrop(rpc_client: &RpcClient, wallet: &Keypair) -> Result<()> {
    let airdrop_signature = rpc_client
        .request_airdrop(&wallet.pubkey(), sol_to_lamports(1.0))
        .context("Failed to request airdrop")?;
    let recent_blockhash = rpc_client
        .get_latest_blockhash()
        .context("Failed to get recent blockhash")?;

    rpc_client
        .confirm_transaction_with_spinner(
            &airdrop_signature,
            &recent_blockhash,
            CommitmentConfig::processed(),
        )
        .context("Failed to confirm airdrop transaction")?;

    println!("✅- Airdrop completed");
    Ok(())
}
