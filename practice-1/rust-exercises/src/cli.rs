#[derive(clap::Parser)]
#[command(name = "solana-exercises-cli")]
#[command(version = "1.0")]
#[command(about = "A simple CLI for Solana development", long_about = None)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(clap::Subcommand)]
pub enum Commands {
    /// Generate a new keypair
    GenerateKeypair,
    /// Load keypair from .env file
    LoadKeypair,
    /// Check balance and optionally airdrop funds
    CheckBalance,
}
