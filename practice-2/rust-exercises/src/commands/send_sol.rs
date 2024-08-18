use anyhow::Result;
use clap::Args;
use solana_client::rpc_client::RpcClient;
use solana_program::instruction::Instruction;
use solana_program::native_token::sol_to_lamports;
use solana_sdk::pubkey::Pubkey;
use solana_sdk::signature::Signer;
use solana_sdk::transaction::Transaction;
use std::str::FromStr;

const MEMO_PROGRAM: &str = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

#[derive(Args)]
pub struct SendSolArgs {
    #[clap(long, default_value = "https://api.devnet.solana.com")]
    pub cluster: String,
    #[clap(long)]
    pub recipient: String,
    #[clap(long)]
    pub sols: f64,
    #[clap(long)]
    pub memo: Option<String>,
}

pub fn execute(args: SendSolArgs) -> Result<()> {
    let client = RpcClient::new(args.cluster.clone());
    println!("Connected to {}", args.cluster);

    let sender = crate::commands::load_keypair()?;

    let sender_pubkey = sender.pubkey();
    let recipient = args.recipient.parse()?;
    let lamports = sol_to_lamports(args.sols);

    let mut instructions = vec![solana_sdk::system_instruction::transfer(
        &sender_pubkey,
        &recipient,
        lamports,
    )];

    if let Some(memo) = args.memo {
        println!("📝 - Adding memo to transaction: {}", memo);
        instructions.push(Instruction::new_with_bytes(
            Pubkey::from_str(MEMO_PROGRAM)?,
            memo.as_bytes(),
            vec![],
        ));
    }

    let recent_blockhash = client.get_latest_blockhash()?;
    let trx = Transaction::new_signed_with_payer(
        &instructions,
        Some(&sender_pubkey),
        &[&sender],
        recent_blockhash,
    );

    let signature = client.send_and_confirm_transaction_with_spinner(&trx)?;

    println!("✅ - SOL sent, transaction signature: {}", signature);
    println!("🔑 - Recipient: {}", args.recipient);

    Ok(())
}
