use anchor_lang::prelude::*;

declare_id!("3r8Gwzy7K1RgJv8LgoyWhvU79tw4FvoEqp8urmLwhLD4");

pub const ANCHOR_DISCRIMINATOR_SIZE: usize = 8;

#[account]
#[derive(InitSpace)]
pub struct Favorites {
    pub number: u64,

    #[max_len(50)]
    pub color: String,
}

#[derive(Accounts)]
pub struct SetFavorites<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        space = ANCHOR_DISCRIMINATOR_SIZE + Favorites::INIT_SPACE,
        seeds = [b"favorites", user.key().as_ref()],
        bump
    )]
    pub favorites: Account<'info, Favorites>,

    pub system_program: Program<'info, System>,
}

#[program]
pub mod favorites {
    use super::*;

    pub fn set_favorites(context: Context<SetFavorites>, number: u64, color: String) -> Result<()> {
        let user_public_key = context.accounts.user.key();

        msg!("Setting favorites for user: {:?}", user_public_key);
        msg!("User's number: {:?}, color: {:?}", number, color);

        context
            .accounts
            .favorites
            .set_inner(Favorites { number, color });

        Ok(())
    }
}
