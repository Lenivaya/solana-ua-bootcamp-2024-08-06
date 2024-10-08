use crate::{Offer, ANCHOR_DISCRIMINATOR};
use anchor_lang::prelude::*;
use anchor_spl::token_2022::{approve, Approve};
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct MakeOffer<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,

    #[account(mint::token_program = token_program)]
    pub token_mint_a: InterfaceAccount<'info, Mint>,
    #[account(mint::token_program = token_program)]
    pub token_mint_b: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = token_mint_a,
        associated_token::authority = maker,
        associated_token::token_program = token_program
    )]
    pub maker_token_account_a: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = maker,
        space = ANCHOR_DISCRIMINATOR + Offer::INIT_SPACE,
        seeds = [b"offer", maker.key().as_ref(), id.to_le_bytes().as_ref()],
        bump
    )]
    pub offer: Account<'info, Offer>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn save_offer(
    context: Context<MakeOffer>,
    id: u64,
    token_a_offered_amount: u64,
    token_b_wanted_amount: u64,
) -> Result<()> {
    context.accounts.offer.set_inner(Offer {
        id,
        maker: context.accounts.maker.key(),
        token_mint_a: context.accounts.token_mint_a.key(),
        token_mint_b: context.accounts.token_mint_b.key(),
        token_a_offered_amount,
        token_b_wanted_amount,
        bump: context.bumps.offer,
    });
    Ok(())
}

pub fn approve_offer(context: &Context<MakeOffer>, token_a_offered_amount: u64) -> Result<()> {
    let cpi_accounts = Approve {
        to: context.accounts.maker_token_account_a.to_account_info(),
        delegate: context.accounts.offer.to_account_info(),
        authority: context.accounts.maker.to_account_info(),
    };
    let cpi_context = CpiContext::new(
        context.accounts.token_program.to_account_info(),
        cpi_accounts,
    );
    approve(cpi_context, token_a_offered_amount)
}
