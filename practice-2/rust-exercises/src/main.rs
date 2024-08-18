use crate::cli::{Cli, Commands};
use crate::commands::{
    create_token_account, create_token_metadata, create_token_mint, mint_tokens, send_sol,
};
use anyhow::Result;
use clap::Parser;

mod cli;
mod commands;

fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::SendSol(args) => send_sol::execute(args)?,
        Commands::CreateTokenMint(args) => create_token_mint::execute(args)?,
        Commands::CreateTokenAccount(args) => create_token_account::execute(args)?,
        Commands::MintTokens(args) => mint_tokens::execute(args)?,
        Commands::CreateTokenMetadata(args) => create_token_metadata::execute(args)?,
    }

    Ok(())
}
