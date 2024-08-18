use crate::commands::{
    create_token_account, create_token_metadata, create_token_mint, mint_tokens, send_sol,
};
use clap::{Parser, Subcommand};

#[derive(Parser)]
#[clap(author, version, about)]
pub struct Cli {
    #[clap(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand)]
pub enum Commands {
    SendSol(send_sol::SendSolArgs),
    CreateTokenMint(create_token_mint::CreateTokenMintArgs),
    CreateTokenAccount(create_token_account::CreateTokenAccountArgs),
    MintTokens(mint_tokens::MintTokensArgs),
    CreateTokenMetadata(create_token_metadata::CreateTokenMetadataArgs),
}
