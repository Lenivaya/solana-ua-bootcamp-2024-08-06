pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("7dL76EVtNbko1FzuSsfSMjZhPHZ88nQBspYouCAkUwsA");

#[program]
pub mod escrow {
    use super::*;

    pub fn make_offer(
        context: Context<MakeOffer>,
        id: u64,
        token_a_offered_amount: u64,
        token_b_wanted_amount: u64,
    ) -> Result<()> {
        require!(
            context.accounts.maker_token_account_a.amount >= token_a_offered_amount,
            error::ErrorCode::InsufficientFunds
        );

        approve_offer(&context, token_a_offered_amount)?;
        save_offer(context, id, token_a_offered_amount, token_b_wanted_amount)
    }

    pub fn take_offer(context: Context<TakeOffer>) -> Result<()> {
        require!(
            context.accounts.maker_token_account_a.amount
                >= context.accounts.offer.token_a_offered_amount,
            error::ErrorCode::MakerTokenAccountAmountLessThanOffered
        );

        instructions::send_wanted_tokens_to_maker(&context)?;
        instructions::withdraw(context)
    }
}
