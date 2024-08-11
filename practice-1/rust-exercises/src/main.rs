use anyhow::Result;
use clap::Parser;
use dotenv::dotenv;
use rust_exercises::cli::{Cli, Commands};
use rust_exercises::solana::{
    check_balance, generate_keypair, load_keypair, print_balance, SolanaCluster,
};
use solana_client::rpc_client::RpcClient;

fn main() -> Result<()> {
    dotenv().ok();

    let rpc_client = RpcClient::new(String::from(SolanaCluster::Devnet.url()));

    let cli = Cli::parse();
    match &cli.command {
        Commands::GenerateKeypair => generate_keypair()?,
        Commands::CheckBalance => check_balance(&rpc_client)?,
        Commands::LoadKeypair => {
            let keypair = load_keypair()?;
            println!("Successfully loaded keypair.");
            print_balance(&rpc_client, &keypair)?;
        }
    }

    Ok(())
}
